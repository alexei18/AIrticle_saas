const SerpApiService = require('./serpApiService');
const AIProviderManager = require('./aiProviders');

class KeywordResearcher {
  constructor() {
    this.serpApiService = new SerpApiService();
    this.aiProvider = new AIProviderManager();
  }

  async researchKeywords(seedText, options = {}) {
    const { language = 'ro', maxSuggestions = 10, domain = null } = options;
    
    const ideasToGenerate = maxSuggestions * 2;

    try {
      console.log(`[KeywordResearcher] Etapa 1: AI va genera ~${ideasToGenerate} idei de keywords pentru a selecta ${maxSuggestions}...`);
      let initialKeywords = await this.generateInitialIdeas(seedText, ideasToGenerate, language);
      
      if (!initialKeywords || initialKeywords.length === 0) {
        throw new Error("AI-ul nu a putut genera idei de keywords.");
      }

      initialKeywords = initialKeywords.slice(0, ideasToGenerate);
      console.log(`[KeywordResearcher] ✅ AI a generat și am selectat ${initialKeywords.length} idei pentru analiză.`);

      console.log("[KeywordResearcher] Mod de operare: Flux Standard (fără SEMrush).");
      return this.runFallbackFlow(initialKeywords, maxSuggestions, language, domain, options.originalSeed);

    } catch (error) {
      console.error('[KeywordResearcher] Fluxul de cercetare a eșuat:', error.message);
      throw error;
    }
  }
  
  async runFallbackFlow(initialKeywords, maxSuggestions, language, domain, originalSeed) {
      console.log("[KeywordResearcher] Etapa 2 (Standard): Se colectează date de la SerpAPI...");
      const serpData = await this.serpApiService.getBulkKeywordData(initialKeywords.slice(0, 50), { language, country: language });
      if (serpData.length === 0) {
        console.warn("[KeywordResearcher] Nu s-au putut obține date de la SerpAPI. Se va continua doar cu AI.");
      }
      
      console.log(`[KeywordResearcher] Etapa 3 (Standard): AI estimează și selectează top ${maxSuggestions} oportunități...`);
      const finalSelection = await this.getAIFallbackSelection(initialKeywords, serpData, maxSuggestions, language, domain);

      return {
        originalSeed: originalSeed,
        totalFound: initialKeywords.length,
        keywords: finalSelection.opportunities,
        aiSummary: `(Mod Standard) ${finalSelection.summary}`,
      };
  }

  async generateInitialIdeas(text, count, language) {
    const prompt = `
      Acționează ca un expert SEO. Analizează următorul text extras de pe un website.
      Generează o listă de ${count} idei de keywords relevante (produse, servicii, întrebări, comparații, probleme).
      Include atât cuvinte cheie long-tail, cât și short-tail.
      Returnează DOAR un obiect JSON cu cheia "keywords", care este un array de string-uri în limba ${language}.

      Text de analizat:
      ---
      ${text.substring(0, 8000)}
      ---
    `;
    return (await this.aiProvider.makeAIRequest(prompt, { isJson: true, maxTokens: 4000 })).keywords || [];
  }

  async getAIFallbackSelection(keywords, serpData, count, language, domain) {
      const serpContext = serpData.map(s => ({
          keyword: s.keyword,
          topResults: s.organicResults.slice(0, 3).map(r => r.title),
          isDomainRanking: domain && s.organicResults.some(r => r.link.includes(domain))
      }));

      const prompt = `
        Acționează ca un strateg SEO. NU ai date despre volumul de căutare sau dificultate. Trebuie să te bazezi pe intuiția ta și pe datele SERP.
        Ai la dispoziție o listă de ${keywords.length} idei de keywords și date despre primele 3 rezultate din Google pentru unele dintre ele.
        Sarcina ta este să selectezi cele mai promițătoare ${count} keywords pentru website-ul ${domain || 'necunoscut'}.
        Idei de keywords: ${JSON.stringify(keywords)}
        Date SERP (dacă există): ${JSON.stringify(serpContext, null, 2)}
        Criterii de selecție:
        1.  **Intenție Comercială:** Caută keywords care sugerează o intenție de cumpărare.
        2.  **Specificitate (Long-Tail):** Keywords-urile mai lungi sunt adesea mai ușor de clasat.
        3.  **Competiție Aparent Slabă:** Dacă titlurile din 'topResults' par slabe, este o oportunitate bună.
        Formatul de răspuns:
        Returnează DOAR un obiect JSON în limba ${language} cu structura:
        { "summary": "O analiză scurtă...", "opportunities": [{ "keyword": "...", "searchVolume": null, "difficulty": null, "score": 80, "justification": "Motivul pentru care crezi că acest keyword este bun..." }] }
        Setează 'searchVolume' și 'difficulty' la null. 'score' este bazat pe încrederea ta. Array-ul trebuie să conțină ${count} elemente.
      `;
      return this.aiProvider.makeAIRequest(prompt, { isJson: true, maxTokens: 4096 });
  }

  estimateDifficultyFromSerp(serpInfo) {
      if (!serpInfo || !serpInfo.organicResults) return 50;
      const topResults = serpInfo.organicResults.slice(0, 5);
      if (topResults.length === 0) return 30;
      let authorityScore = 0;
      topResults.forEach(result => {
          if (result.link.includes('wikipedia.org') || result.link.includes('.gov')) authorityScore += 20;
          else if (result.link.includes('youtube.com')) authorityScore += 5;
          else authorityScore += 10;
      });
      return Math.min(100, Math.round(authorityScore / topResults.length * 5));
  }

  estimateVolumeFromSerp(serpInfo) {
      if (!serpInfo || !serpInfo.totalResults) return 100;
      const results = serpInfo.totalResults;
      if (results > 50000000) return Math.floor(Math.random() * 5000) + 1000;
      if (results > 10000000) return Math.floor(Math.random() * 1000) + 500;
      if (results > 1000000) return Math.floor(Math.random() * 500) + 100;
      return Math.floor(Math.random() * 100) + 10;
  }
}

module.exports = KeywordResearcher;