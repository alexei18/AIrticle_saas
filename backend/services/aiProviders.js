const axios = require('axios');

class AIProviderManager {
  constructor() {
    this.providers = [
      { id: 'gemini', fn: this.requestGemini.bind(this), key: process.env.GEMINI_API_KEY },
      { id: 'openai', fn: this.requestOpenAI.bind(this), key: process.env.OPENAI_API_KEY },
    ].filter(p => p.key);
  }

  /**
   * Încearcă să repare un string JSON care a fost tăiat prematur.
   * @param {string} jsonString - String-ul JSON potențial invalid.
   * @returns {string | null} - String-ul JSON reparat sau null dacă nu poate fi reparat.
   */
  tryToFixJson(jsonString) {
    let openBraces = (jsonString.match(/{/g) || []).length;
    let closeBraces = (jsonString.match(/}/g) || []).length;
    let openBrackets = (jsonString.match(/\[/g) || []).length;
    let closeBrackets = (jsonString.match(/]/g) || []).length;

    // Caută ultimul caracter valid de închidere pentru a tăia orice text corupt de la final
    const lastValidCharIndex = Math.max(jsonString.lastIndexOf('}'), jsonString.lastIndexOf(']'), jsonString.lastIndexOf('"'));
    if (lastValidCharIndex > -1) {
        jsonString = jsonString.substring(0, lastValidCharIndex + 1);
    }
    
    while(openBrackets > closeBrackets) {
        jsonString += ']';
        closeBrackets++;
    }
    while(openBraces > closeBraces) {
        jsonString += '}';
        closeBraces++;
    }
    
    try {
        JSON.parse(jsonString);
        return jsonString; // JSON-ul este acum valid
    } catch (e) {
        return null; // Nu s-a putut repara
    }
  }

  async makeAIRequest(prompt, options = {}) {
    const { isJson = false, maxTokens = 2048, temperature = 0.7 } = options;

    if (this.providers.length === 0) {
      console.error("[AIProviderManager] No AI providers configured. Please set API keys in .env file.");
      throw new Error("No AI providers configured.");
    }

    for (const provider of this.providers) {
      try {
        console.log(`[AIProviderManager] Attempting AI request with ${provider.id}...`);
        let content = await provider.fn(prompt, { isJson, maxTokens, temperature });
        
        if (isJson) {
          try {
            return JSON.parse(content);
          } catch (jsonError) {
            console.warn(`[AIProviderManager] ${provider.id} returned invalid JSON. Attempting to fix...`);
            const fixedJson = this.tryToFixJson(content);
            if (fixedJson) {
              console.log(`[AIProviderManager] ✅ Successfully fixed JSON from ${provider.id}.`);
              return JSON.parse(fixedJson);
            }
            console.error(`[AIProviderManager] Could not fix JSON from ${provider.id}:`, content);
            throw new Error(`Invalid JSON response from ${provider.id}`);
          }
        }
        return content;

      } catch (error) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error(`[AIProviderManager] ${provider.id} failed:`, errorMessage);
        
        if (this.providers.indexOf(provider) < this.providers.length - 1) {
          console.log(`[AIProviderManager] Trying next available provider...`);
        }
      }
    }
    throw new Error("All configured AI providers failed to fulfill the request.");
  }

  async requestOpenAI(prompt, { isJson, maxTokens, temperature }) {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature, 
        max_tokens: maxTokens,
        ...(isJson && { response_format: { type: "json_object" } })
    }, { 
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }, 
        timeout: 90000 
    });
    return response.data.choices[0].message.content;
  }

  async requestGemini(prompt, { isJson, maxTokens, temperature }) {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
            temperature, 
            maxOutputTokens: maxTokens, 
            ...(isJson && { response_mime_type: "application/json" }) 
        },
      }, { 
          headers: { 'Content-Type': 'application/json' }, 
          timeout: 90000 
        }
    );
    return response.data.candidates[0].content.parts[0].text;
  }
}

module.exports = AIProviderManager;