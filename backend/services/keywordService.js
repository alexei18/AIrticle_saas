const { Keyword, KeywordTrend } = require('../models');
const SerpApiService = require('./serpApiService');
const AIProviderManager = require('./aiProviders');

class KeywordService {
  constructor() {
    this.serpApi = new SerpApiService();
    this.aiProvider = new AIProviderManager();
  }

  async calculateAiTrendScore(keywordInstance) {
    if (!keywordInstance) throw new Error('Keyword instance is required.');

    console.log(`[KeywordService] 🧠 Starting AI Trend Score calculation for "${keywordInstance.keyword}"...`);

    const trends = await KeywordTrend.findAll({
      where: { keywordId: keywordInstance.id },
      order: [['date', 'DESC']],
      limit: 90
    });

    if (trends.length < 14) {
      console.warn(`[KeywordService] ⚠️ Insufficient trend data for "${keywordInstance.keyword}". Found only ${trends.length} data points.`);
      await keywordInstance.update({ aiTrendScore: null });
      return null;
    }

    const trendDataString = trends.map(t => `${t.date}: ${t.interestScore}`).join('; ');

    const prompt = `
      Analizează următoarele date SEO pentru cuvântul cheie "${keywordInstance.keyword}" și generează un scor compozit de la 1 la 100, numit "AI Trend Score".

      Date de intrare:
      1.  **Scor Dificultate SERP:** ${keywordInstance.difficultyScore}/100 (cât de greu este să te clasezi)
      2.  **Volum Căutare Lunar Estimat:** ${keywordInstance.searchVolume}
      3.  **Date Google Trends (ultimele 90 de zile, scor 0-100):** ${trendDataString}

      Criterii de analiză pentru scorul final:
      - **Potențial vs. Dificultate:** Un volum mare și o dificultate mică este ideal.
      - **Momentum recent:** Compară interesul din ultima săptămână cu cel de acum 30 de zile. Un trend ascendent recent este un semnal foarte pozitiv.
      - **Stabilitate și Sezonalitate:** Evaluează dacă interesul este constant sau foarte volatil. Un interes stabil sau predictibil sezonier este mai valoros.
      - **Interes general:** Un scor de interes mediu peste 50 în Google Trends indică o relevanță solidă.

      Pe baza acestor criterii, oferă un singur număr întreg între 1 și 100.
      Răspunde doar cu un obiect JSON de forma: { "aiTrendScore": <score> }
    `;

    try {
      const response = await this.aiProvider.makeAIRequest(prompt, { isJson: true });
      const score = response.aiTrendScore;

      if (typeof score === 'number' && score >= 1 && score <= 100) {
        await keywordInstance.update({ aiTrendScore: score });
        console.log(`[KeywordService] ✅ AI Trend Score for "${keywordInstance.keyword}" is ${score}.`);
        return score;
      } else {
        throw new Error('AI returned an invalid score format.');
      }
    } catch (error) {
      console.error(`[KeywordService] ❌ AI Trend Score calculation failed for "${keywordInstance.keyword}":`, error.message);
      return null;
    }
  }

  async enrichKeyword(keywordInstance) {
    if (!keywordInstance || !keywordInstance.keyword) return;
    const keyword = keywordInstance.keyword;

    try {
      console.log(`[KeywordService] 🔍 Îmbogățire pentru: "${keyword}"`);
      
      const updateData = { enrichmentStatus: 'failed' };

      // --- PASUL 1: Folosim SerpApi pentru a obține date ---
      const serpInfo = await this.serpApi.analyzeSerp(keyword);
      
      if (serpInfo) {
        // Folosim funcțiile de estimare
        updateData.searchVolume = this.estimateVolumeFromSerp(serpInfo);
        updateData.difficultyScore = this.estimateDifficultyFromSerp(serpInfo);
        console.log(`[KeywordService] 💡 Date estimate de la SerpApi pentru "${keyword}":`, {vol: updateData.searchVolume, diff: updateData.difficultyScore});
      }

      // --- PASUL 2: Actualizăm statusul pe baza datelor obținute ---
      if (updateData.searchVolume !== undefined && updateData.difficultyScore !== undefined) {
          updateData.enrichmentStatus = 'completed';
          console.log(`[KeywordService] ✅ Date finalizate pentru "${keyword}".`);
      } else {
          console.log(`[KeywordService] ❌ Sursa de date a eșuat pentru "${keyword}".`);
      }
      
      await keywordInstance.update(updateData);

    } catch (error) {
      console.error(`[KeywordService] ❌ Eroare critică la îmbogățirea "${keyword}":`, error.message);
      await keywordInstance.update({ enrichmentStatus: 'failed' });
    }
  }

  async runEnrichmentJob() {
    console.log('[KeywordService] Cron Job: Se caută keywords pentru îmbogățire...');
    try {
      const pendingKeywords = await Keyword.findAll({
        where: {
          enrichmentStatus: 'pending'
        },
        limit: 20 // Limităm la 20 pentru a nu epuiza cota SerpApi prea repede
      });

      if (pendingKeywords.length > 0) {
        console.log(`[KeywordService] Cron Job: S-au găsit ${pendingKeywords.length} keywords pending. Se începe procesarea...`);
        await Promise.all(pendingKeywords.map(kw => this.enrichKeyword(kw)));
        console.log('[KeywordService] Cron Job: Procesarea lotului a fost finalizată.');
      } else {
        console.log('[KeywordService] Cron Job: Niciun keyword pending găsit.');
      }
    } catch (error) {
      console.error('[KeywordService] Cron Job: A eșuat cu eroarea:', error.message);
    }
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

module.exports = new KeywordService();
