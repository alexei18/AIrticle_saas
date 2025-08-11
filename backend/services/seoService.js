const { Website, Keyword, Backlink, ContentGap, GoogleAnalyticsConnection } = require('../models');
const SerpApiService = require('./serpApiService');
const GoogleAnalyticsService = require('./googleAnalyticsService');

class SEOService {
  constructor() {
    this.serpApi = new SerpApiService();
  }

  async runDeepAnalysis(website) {
    console.log(`[SEOService] 🚀 Pornire analiză SEO profundă pentru: ${website.domain}`);
    try {
      await this.syncGoogleAnalyticsData(website.id);
      await this.analyzeBacklinks(website);
      await this.analyzeContentGaps(website);
      console.log(`[SEOService] ✅ Analiza SEO profundă finalizată pentru: ${website.domain}`);
      return { success: true, message: 'Deep analysis completed.' };
    } catch (error) {
      console.error(`[SEOService] ❌ Eroare în timpul analizei profunde pentru ${website.domain}:`, error.message);
      return { success: false, message: error.message };
    }
  }

  async syncGoogleAnalyticsData(websiteId) {
    try {
      const connection = await GoogleAnalyticsConnection.findOne({ where: { websiteId, isActive: true } });
      if (!connection) {
        console.warn(`[SEOService] ⚠️ Nu există o conexiune Google Analytics activă pentru website ID: ${websiteId}. Se sare peste sincronizare.`);
        return;
      }

      console.log(`[SEOService] 📊 Sincronizare date Google Analytics pentru website ID: ${websiteId}...`);
      await GoogleAnalyticsService.fetchAnalyticsData(websiteId);
      console.log(`[SEOService] ✅ Sincronizare Google Analytics finalizată.`);
    } catch (error) {
      console.warn(`[SEOService] ⚠️ Avertisment: Sincronizarea Google Analytics a eșuat. ${error.message}`);
    }
  }

  async analyzeBacklinks(website) {
    try {
      console.log(`[SEOService] 🔗 Căutare backlinks pentru: ${website.domain}...`);
      const backlinksFound = await this.serpApi.findBacklinks(website.domain);
      
      if (backlinksFound && backlinksFound.length > 0) {
        await Backlink.destroy({ where: { websiteId: website.id } });
        const backlinkRecords = backlinksFound.map(b => ({ ...b, websiteId: website.id }));
        await Backlink.bulkCreate(backlinkRecords, { ignoreDuplicates: true });
        console.log(`[SEOService] ✅ S-au salvat ${backlinksFound.length} backlinks.`);
      } else {
        console.log(`[SEOService] ℹ️ Nu s-au găsit backlinks noi.`);
      }
    } catch (error) {
      console.error(`[SEOService] ❌ Eroare la analiza de backlinks:`, error.message);
    }
  }

  async analyzeContentGaps(website) {
    try {
      console.log(`[SEOService] 🔎 Analiză Content Gap pentru: ${website.domain}...`);
      
      const keywords = await Keyword.findAll({ 
        where: { websiteId: website.id }, 
        limit: 10, 
        order: [['searchVolume', 'DESC']] 
      });

      if (keywords.length < 3) {
        console.log(`[SEOService] ℹ️ Insuficiente keywords pentru o analiză de content gap relevantă.`);
        return;
      }
      
      const keywordStrings = keywords.map(k => k.keyword);
      const competitorDomains = ['emag.ro', 'altex.ro', 'compari.ro'];

      const gapsFound = await this.serpApi.contentGapAnalysis(website.domain, competitorDomains, keywordStrings);
      
      if (gapsFound && gapsFound.length > 0) {
        await ContentGap.destroy({ where: { websiteId: website.id } });
        const gapRecords = gapsFound.map(g => ({ ...g, websiteId: website.id }));
        await ContentGap.bulkCreate(gapRecords, { ignoreDuplicates: true });
        console.log(`[SEOService] ✅ S-au găsit și salvat ${gapsFound.length} oportunități de content gap.`);
      } else {
        console.log(`[SEOService] ℹ️ Nu s-au găsit noi oportunități de content gap.`);
      }
    } catch (error) {
      console.error(`[SEOService] ❌ Eroare la analiza de content gap:`, error.message);
    }
  }
} // MODIFICAT: Aici lipsea acolada de închidere

module.exports = new SEOService();