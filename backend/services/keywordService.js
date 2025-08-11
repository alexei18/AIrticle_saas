const { Keyword } = require('../models');
const SEMrushService = require('./semrushService');
const SerpApiService = require('./serpApiService'); // NOU: Avem nevoie și de SerpApi

class KeywordService {
  constructor() {
    this.semrushService = new SEMrushService();
    this.serpApi = new SerpApiService(); // NOU: Instanțiem SerpApi
  }

  async enrichKeyword(keywordInstance) {
    if (!keywordInstance || !keywordInstance.keyword) return;
    const keyword = keywordInstance.keyword;

    try {
      console.log(`[KeywordService] 🔍 Îmbogățire pentru: "${keyword}"`);
      
      const updateData = { enrichmentStatus: 'failed' };
      let semrushSuccess = false;

      // --- PASUL 1: Încercăm SEMrush (sursa preferată) ---
      const [keywordData, difficultyData] = await Promise.all([
        this.semrushService.getKeywordOverview([keyword]),
        this.semrushService.getKeywordDifficulty([keyword])
      ]);
      
      const semrushInfo = keywordData?.[0];
      const difficultyInfo = difficultyData?.[0];

      if (semrushInfo && semrushInfo.searchVolume > 0) {
        updateData.searchVolume = parseInt(semrushInfo.searchVolume, 10);
        semrushSuccess = true;
      }
      if (difficultyInfo) {
        const difficulty = parseFloat(difficultyInfo.difficulty);
        if (!isNaN(difficulty)) {
          updateData.difficultyScore = difficulty;
          semrushSuccess = true;
        }
      }
      
      // --- PASUL 2: Dacă SEMrush a eșuat, încercăm Fallback la SerpApi ---
      if (!semrushSuccess) {
        console.log(`[KeywordService] ⚠️ SEMrush a eșuat pentru "${keyword}". Se încearcă fallback la SerpApi...`);
        const serpInfo = await this.serpApi.analyzeSerp(keyword);
        
        if (serpInfo) {
          // Folosim funcțiile de estimare
          updateData.searchVolume = this.estimateVolumeFromSerp(serpInfo);
          updateData.difficultyScore = this.estimateDifficultyFromSerp(serpInfo);
          console.log(`[KeywordService] 💡 Date estimate de la SerpApi pentru "${keyword}":`, {vol: updateData.searchVolume, diff: updateData.difficultyScore});
        }
      }

      // --- PASUL 3: Actualizăm statusul pe baza datelor obținute ---
      if (updateData.searchVolume !== undefined && updateData.difficultyScore !== undefined) {
          updateData.enrichmentStatus = 'completed';
          console.log(`[KeywordService] ✅ Date finalizate pentru "${keyword}".`);
      } else {
          console.log(`[KeywordService] ❌ Toate sursele au eșuat pentru "${keyword}".`);
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

  // NOU: Am adus funcțiile de estimare aici pentru a le putea folosi
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