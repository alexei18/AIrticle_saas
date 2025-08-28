const axios = require('axios');
const SerpApiService = require('./serpApiService'); // Importăm serviciul de căutare

class AIProviderManager {
  constructor() {
    this.providers = [
      { id: 'gemini', fn: this.requestGemini.bind(this), key: process.env.GEMINI_API_KEY },
      { id: 'openai', fn: this.requestOpenAI.bind(this), key: process.env.OPENAI_API_KEY },
    ].filter(p => p.key);
    
    this.serpApi = new SerpApiService(); // Instanțiem serviciul de căutare
  }

  /**
   * Încearcă să repare un string JSON care a fost tăiat prematur.
   * @param {string} jsonString - String-ul JSON potențial invalid.
   * @returns {string | null} - String-ul JSON reparat sau null dacă nu poate fi reparat.
   */
  tryToFixJson(jsonString) {
    // ... implementarea existentă rămâne neschimbată ...
    let openBraces = (jsonString.match(/{/g) || []).length;
    let closeBraces = (jsonString.match(/}/g) || []).length;
    let openBrackets = (jsonString.match(/\[/g) || []).length;
    let closeBrackets = (jsonString.match(/]/g) || []).length;

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
        return jsonString;
    } catch (e) {
        return null;
    }
  }

  async makeAIRequest(prompt, options = {}) {
    // Adăugăm 'tools' la opțiuni
    const { isJson = false, maxTokens = 4096, temperature = 0.8, tools = null } = options;

    if (this.providers.length === 0) {
      console.error("[AIProviderManager] No AI providers configured. Please set API keys in .env file.");
      throw new Error("No AI providers configured.");
    }

    for (const provider of this.providers) {
      try {
        console.log(`[AIProviderManager] Attempting AI request with ${provider.id}...`);
        // Pasăm 'tools' către funcția provider-ului
        let content = await provider.fn(prompt, { isJson, maxTokens, temperature, tools });
        
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
    // ... implementarea existentă rămâne neschimbată ...
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

  async requestGemini(prompt, { isJson, maxTokens, temperature, tools }) {
    const model = 'gemini-1.5-pro-latest';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const originalContents = [{ role: 'user', parts: [{ text: prompt }] }];

    let requestBody = {
      contents: originalContents,
      generationConfig: { 
        temperature, 
        maxOutputTokens: maxTokens, 
        ...(isJson && { response_mime_type: "application/json" }) 
      },
      ...(tools && { tools: tools })
    };

    // Facem primul request
    const response = await axios.post(url, requestBody, { 
      headers: { 'Content-Type': 'application/json' }, 
      timeout: 120000 
    });

    const candidate = response.data.candidates[0];
    const part = candidate.content.parts[0];

    // Verificăm dacă AI-ul a cerut să folosească o unealtă
    if (part.functionCall) {
      const functionCall = part.functionCall;
      const functionName = functionCall.name;
      const args = functionCall.args;

      console.log(`[AIProviderManager] Gemini requested function call: ${functionName} with args:`, args);

      let functionResponseContent;
      if (functionName === 'search_web') {
        const searchResult = await this.serpApi.searchWeb(args.query);
        functionResponseContent = searchResult;
      } else {
        throw new Error(`Unknown function call requested by Gemini: ${functionName}`);
      }

      // Construim un nou request care conține și rezultatul funcției
      const newContents = [
        ...originalContents,
        { role: 'model', parts: [part] },
        {
          role: 'function',
          parts: [{
            functionResponse: {
              name: functionName,
              response: {
                content: functionResponseContent,
              }
            }
          }]
        }
      ];
      
      requestBody.contents = newContents;

      // Facem al doilea request pentru a obține răspunsul final
      const finalResponse = await axios.post(url, requestBody, { 
        headers: { 'Content-Type': 'application/json' }, 
        timeout: 120000 
      });
      
      return finalResponse.data.candidates[0].content.parts[0].text;
    }

    // Dacă nu a fost un functionCall, returnăm textul direct
    return part.text;
  }
}

module.exports = AIProviderManager;
