const googleTrends = require('google-trends-api');
const { Keyword, KeywordTrend } = require('../models');
const { Op } = require('sequelize');

// Funcție de delay pentru a evita rate limiting-ul
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class GoogleTrendsService {
  /**
   * Fetches the daily interest for a keyword over the last 90 days.
   * Google Trends returns weekly data for longer periods, so 90 days is a good balance for daily granularity.
   * @param {string} keyword - The keyword to search for.
   * @param {string} [geo='RO'] - The geographic region (default is Romania).
   * @returns {Promise<Array<{date: Date, value: number}>>} - An array of objects with date and interest value.
   */
  async getInterestOverTime(keyword, geo = 'RO') {
    try {
      const startTime = new Date();
      startTime.setMonth(startTime.getMonth() - 3); // Fetch data for the last 3 months for daily trends

      const rawData = await googleTrends.interestOverTime({
        keyword,
        startTime,
        geo,
      });

      const results = JSON.parse(rawData);
      if (!results.default.timelineData) return [];
      
      return results.default.timelineData.map(item => ({
        date: new Date(item.time * 1000),
        value: item.value[0] || 0,
      }));
    } catch (error) {
      // Google Trends API poate da erori 429 (Too Many Requests)
      if (error.message.includes('429')) {
        console.warn(`[GoogleTrendsService] Rate limit atins pentru "${keyword}". Se reîncearcă după 60 de secunde.`);
        await delay(60000); // Așteaptă 1 minut
        return this.getInterestOverTime(keyword, geo); // Reîncearcă
      }
      console.error(`[GoogleTrendsService] Failed to fetch trends for "${keyword}":`, error.message);
      return [];
    }
  }

  /**
   * Rulează job-ul zilnic pentru a actualiza datele de trend pentru toate cuvintele cheie.
   */
  async runDailyTrendUpdate() {
    console.log('[GoogleTrendsService] 📈 Starting daily trend update job...');
    const keywords = await Keyword.findAll({ where: { isTracking: true } });
    
    console.log(`[GoogleTrendsService] Found ${keywords.length} keywords to update.`);

    for (const keyword of keywords) {
      try {
        const trends = await this.getInterestOverTime(keyword.keyword);
        if (trends.length > 0) {
          const trendRecords = trends.map(trend => ({
            keywordId: keyword.id,
            date: trend.date.toISOString().split('T')[0], // Asigurăm formatul YYYY-MM-DD
            interestScore: trend.value,
          }));

          // Folosim bulkCreate cu ignoreDuplicates pentru a evita erorile de constrângere unică
          await KeywordTrend.bulkCreate(trendRecords, {
            ignoreDuplicates: true,
          });
          
          console.log(`[GoogleTrendsService] ✅ Updated trends for "${keyword.keyword}". Found ${trendRecords.length} new data points.`);
        } else {
          console.log(`[GoogleTrendsService] ℹ️ No new trend data found for "${keyword.keyword}".`);
        }
      } catch (error) {
        console.error(`[GoogleTrendsService] ❌ Failed to process trends for "${keyword.keyword}":`, error.message);
      }
      
      // Adăugăm un delay între request-uri pentru a nu suprasolicita API-ul
      await delay(5000); // Așteaptă 5 secunde
    }
    console.log('[GoogleTrendsService] 🏁 Finished daily trend update job.');
  }
}

module.exports = new GoogleTrendsService();
