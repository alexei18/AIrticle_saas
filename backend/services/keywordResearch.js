const SEMrushService = require('./semrushService');
const SerpApiService = require('./serpApiService');
const AIProviderManager = require('./aiProviders');

class KeywordResearcher {
  constructor() {
    this.semrushService = new SEMrushService();
    this.serpApiService = new SerpApiService();
    this.aiProvider = new AIProviderManager();
    this.isSemrushAvailable = !!process.env.SEMRUSH_API_KEY;
  }

  async researchKeywords(seedText, options = {}) {
    const { language = 'ro', maxSuggestions = 10, domain = null } = options;
    
    // MODIFICAT: Eliminăm valoarea minimă. Va fi strict dublul solicitării.
    const ideasToGenerate = maxSuggestions * 2;

    try {
      console.log(`[KeywordResearcher] Etapa 1: AI va genera ~${ideasToGenerate} idei de keywords pentru a selecta ${maxSuggestions}...`);
      let initialKeywords = await this.generateInitialIdeas(seedText, ideasToGenerate, language);
      
      if (!initialKeywords || initialKeywords.length === 0) {
        throw new Error("AI-ul nu a putut genera idei de keywords.");
      }

      initialKeywords = initialKeywords.slice(0, ideasToGenerate);
      console.log(`[KeywordResearcher] ✅ AI a generat și am selectat ${initialKeywords.length} idei pentru analiză.`);

      if (this.isSemrushAvailable) {
        console.log("[KeywordResearcher] Mod de operare: Flux Avansat (cu SEMrush).");
        return this.runAdvancedFlow(initialKeywords, maxSuggestions, language, domain, options.originalSeed);
      } else {
        console.log("[KeywordResearcher] Mod de operare: Flux Fallback (fără SEMrush).");
        return this.runFallbackFlow(initialKeywords, maxSuggestions, language, domain, options.originalSeed);
      }

    } catch (error) {
      console.error('[KeywordResearcher] Fluxul de cercetare a eșuat:', error.message);
      throw error;
    }
  }

  async runAdvancedFlow(initialKeywords, maxSuggestions, language, domain, originalSeed) {
      console.log("[KeywordResearcher] Etapa 2 (Avansat): Se colectează date de la SEMrush și SerpAPI...");
      const enrichedData = await this.enrichKeywordData(initialKeywords, language, domain);
      
      if (enrichedData.length === 0) {
          throw new Error("Nu s-au putut colecta date suficiente de la API-urile externe (SEMrush/SerpAPI). Verificați cheile API și creditele.");
      }
      console.log(`[KeywordResearcher] ✅ S-au colectat date pentru ${enrichedData.length} keywords.`);

      console.log(`[KeywordResearcher] Etapa 3 (Avansat): AI analizează datele pentru a selecta top ${maxSuggestions} oportunități...`);
      const finalSelection = await this.getAIFinalSelection(enrichedData, maxSuggestions, language, domain);
      console.log(`[KeywordResearcher] ✅ AI a finalizat analiza și selecția.`);

      return {
        originalSeed: originalSeed,
        totalFound: enrichedData.length,
        keywords: finalSelection.opportunities,
        aiSummary: finalSelection.summary,
      };
  }
  
  async runFallbackFlow(initialKeywords, maxSuggestions, language, domain, originalSeed) {
      console.log("[KeywordResearcher] Etapa 2 (Fallback): Se colectează date doar de la SerpAPI...");
      const serpData = await this.serpApiService.getBulkKeywordData(initialKeywords.slice(0, 50), { language, country: language });
      if (serpData.length === 0) {
        console.warn("[KeywordResearcher] Nu s-au putut obține date nici de la SerpAPI. Se va continua doar cu AI.");
      }
      
      console.log(`[KeywordResearcher] Etapa 3 (Fallback): AI estimează și selectează top ${maxSuggestions} oportunități...`);
      const finalSelection = await this.getAIFallbackSelection(initialKeywords, serpData, maxSuggestions, language, domain);

      return {
        originalSeed: originalSeed,
        totalFound: initialKeywords.length,
        keywords: finalSelection.opportunities,
        aiSummary: `(Mod Fallback) ${finalSelection.summary}`,
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

  async enrichKeywordData(keywords, language, domain) {
    const keywordsForSerp = keywords.slice(0, 40);

    const [semrushData, serpData] = await Promise.all([
      this.semrushService.getKeywordOverview(keywords, this.mapLanguageToSemrushDB(language)),
      this.serpApiService.getBulkKeywordData(keywordsForSerp, { language, country: language })
    ]);
    
    if (semrushData.length === 0) {
        console.warn("[KeywordResearcher] Avertisment: SEMrush nu a returnat niciun rezultat. Se va încerca continuarea cu datele de la SerpAPI, dacă există.");
    }

    const combinedData = keywords.map(kw => {
        const semrushInfo = semrushData.find(s => s.keyword.toLowerCase() === kw.toLowerCase());
        const serpInfo = serpData.find(s => s.keyword.toLowerCase() === kw.toLowerCase());
        
        if (semrushInfo && semrushInfo.searchVolume > 0) {
            return {
                keyword: kw,
                searchVolume: parseInt(semrushInfo.searchVolume, 10),
                difficulty: semrushInfo.difficulty ? parseFloat(semrushInfo.difficulty) : this.estimateDifficultyFromSerp(serpInfo),
                cpc: semrushInfo.cpc ? parseFloat(semrushInfo.cpc) : null,
                competition: semrushInfo.competition ? parseFloat(semrushInfo.competition) : null,
                topResults: serpInfo ? serpInfo.organicResults.slice(0, 3).map(r => r.title) : [],
                isDomainRanking: domain && serpInfo ? serpInfo.organicResults.some(r => r.link.includes(domain)) : false,
            };
        }
        
        if (serpInfo) {
            return {
                keyword: kw,
                searchVolume: this.estimateVolumeFromSerp(serpInfo),
                difficulty: this.estimateDifficultyFromSerp(serpInfo),
                cpc: null,
                competition: null,
                topResults: serpInfo.organicResults.slice(0, 3).map(r => r.title),
                isDomainRanking: domain && serpInfo ? serpInfo.organicResults.some(r => r.link.includes(domain)) : false,
            };
        }
        return null;
    }).filter(Boolean);

    return combinedData;
  }

  async getAIFinalSelection(enrichedData, count, language, domain) {
    const prompt = `
      Acționează ca un strateg SEO senior. Ai la dispoziție următoarea listă de keywords și datele de performanță asociate pentru un website (${domain || 'necunoscut'}).
      Sarcina ta este să analizezi aceste date și să selectezi cele mai bune ${count} oportunități de keywords.
      Date de analizat: ${JSON.stringify(enrichedData, null, 2)}
      Criterii de selecție:
      1.  **Potențial Ridicat:** Caută keywords cu un volum de căutare (searchVolume) rezonabil și o dificultate (difficulty) cât mai mică.
      2.  **Relevanță și Intenție:** Prioritizează keywords care par să aibă o intenție comercială.
      3.  **Oportunități de Ranking:** Dacă website-ul clientului (isDomainRanking: false) NU este deja pe prima pagină, este un bonus.
      Formatul de răspuns: Returnează DOAR un obiect JSON în limba ${language} cu următoarea structură:
      { "summary": "O analiză strategică scurtă...", "opportunities": [{ "keyword": "...", "searchVolume": 1500, "difficulty": 25, "score": 95, "justification": "Motivul clar..." }] }
      Array-ul 'opportunities' trebuie să conțină exact ${count} elemente, sortate. 'score' este un număr de la 0 la 100 pe care îl acorzi tu.
    `;
    return this.aiProvider.makeAIRequest(prompt, { isJson: true, maxTokens: 4096 });
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

  mapLanguageToSemrushDB(lang) {
    return ({ 'ro': 'ro', 'en': 'us' })[lang] || 'us';
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