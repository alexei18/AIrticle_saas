const { Keyword, KeywordPosition, Website } = require('../models');
const SerpApiService = require('./serpApiService');
const { Op } = require('sequelize');

class RankTrackingService {
  constructor() {
    this.serpApi = new SerpApiService();
  }

  /**
   * Verifică poziția unui singur keyword și salvează istoricul.
   * @param {object} keywordInstance - O instanță Sequelize a modelului Keyword.
   */
  async trackKeywordPosition(keywordInstance) {
    if (!keywordInstance || !keywordInstance.keyword) return;

    try {
      // Avem nevoie de domeniu, deci includem Website-ul
      const keywordWithWebsite = await Keyword.findByPk(keywordInstance.id, {
        include: [{ model: Website, as: 'website', attributes: ['domain'] }]
      });

      if (!keywordWithWebsite || !keywordWithWebsite.website) {
        console.warn(`[RankTracking] Nu s-a găsit website-ul pentru keyword-ul ID: ${keywordInstance.id}`);
        return;
      }
      
      const { keyword, website } = keywordWithWebsite;
      console.log(`[RankTracking] 🔍 Se verifică poziția pentru "${keyword}" pe domeniul "${website.domain}"...`);

      const position = await this.serpApi.trackRanking(keyword, website.domain);

      // Actualizăm poziția curentă direct pe modelul Keyword
      await keywordInstance.update({ currentPosition: position });

      // Salvăm un record nou în istoric (KeywordPosition)
      await KeywordPosition.create({
        keywordId: keywordInstance.id,
        position: position,
        // searchVolume va fi populat de celălalt cron job
      });

      if (position) {
        console.log(`[RankTracking] ✅ Poziția găsită pentru "${keyword}": #${position}`);
      } else {
        console.log(`[RankTracking] ℹ️ Keyword-ul "${keyword}" nu a fost găsit în top 100.`);
      }
      
      // Adăugăm o pauză pentru a nu suprasolicita API-ul
      await new Promise(resolve => setTimeout(resolve, 1500)); 

    } catch (error) {
      console.error(`[RankTracking] ❌ Eroare la verificarea poziției pentru "${keywordInstance.keyword}":`, error.message);
    }
  }

  /**
   * Rulează un job care verifică toate keyword-urile active.
   */
  async runTrackingJob() {
    console.log('[RankTracking] Cron Job: Se caută keywords pentru tracking...');
    try {
      const keywordsToTrack = await Keyword.findAll({
        where: {
          isTracking: true
        }
      });

      if (keywordsToTrack.length > 0) {
        console.log(`[RankTracking] Cron Job: S-au găsit ${keywordsToTrack.length} keywords de urmărit. Se începe procesarea...`);
        // Procesăm secvențial pentru a respecta limitele API-urilor
        for (const kw of keywordsToTrack) {
          await this.trackKeywordPosition(kw);
        }
        console.log('[RankTracking] Cron Job: Procesarea a fost finalizată.');
      } else {
        console.log('[RankTracking] Cron Job: Niciun keyword activ pentru tracking găsit.');
      }
    } catch (error) {
      console.error('[RankTracking] Cron Job: A eșuat cu eroarea:', error.message);
    }
  }
}

module.exports = new RankTrackingService();