const axios = require('axios');
const { parse } = require('csv-parse/sync');

class SEMrushService {
  constructor() {
    this.apiKey = process.env.SEMRUSH_API_KEY;
    this.baseURL = 'https://api.semrush.com/';
    this.timeout = 30000;
    
    if (!this.apiKey) {
      console.warn('[SEMrushService] WARNING: SEMRUSH_API_KEY is not set. Service will run in fallback mode (no data will be returned).');
    }
  }

  // Am eliminat logica duplicată din 'makeRequest' și am centralizat-o aici
  async getKeywordOverview(keywords, database = 'us') {
    if (!this.apiKey) return []; // Fallback
    const keywordList = Array.isArray(keywords) ? keywords.join('\n') : keywords;
    const params = { type: 'phrase_this', phrase: keywordList, database, export_columns: 'Ph,Nq,Cp,Co,Nr,Td' };
    const results = await this.makeRequest(params);
    return results.map(row => ({
      keyword: row.Ph || '', searchVolume: parseInt(row.Nq) || 0, cpc: parseFloat(row.Cp) || 0,
      competition: parseFloat(row.Co) || 0, results: parseInt(row.Nr) || 0, trend: row.Td || ''
    }));
  }

  async getKeywordDifficulty(keywords, database = 'us') {
    if (!this.apiKey) return []; // Fallback
    const keywordList = Array.isArray(keywords) ? keywords.join('\n') : keywords;
    const params = { type: 'phrase_kdi', phrase: keywordList, database, export_columns: 'Ph,Kd' };
    const results = await this.makeRequest(params);
    return results.map(row => ({ keyword: row.Ph || '', difficulty: parseFloat(row.Kd) || 0 }));
  }

  async getDomainAnalysis(domain, database = 'us') {
      if (!this.apiKey) return null; // Fallback
      const params = { type: 'domain_overview', domain, database, export_columns: 'Dn,Rk,Or,Ot,Oc,Ad,At,Ac' };
      const results = await this.makeRequest(params);
      if (results.length > 0) {
          const row = results[0];
          return {
              domain: row.Dn || domain, rank: parseInt(row.Rk) || 0,
              organicKeywords: parseInt(row.Or) || 0, organicTraffic: parseFloat(row.Ot) || 0,
              organicCost: parseFloat(row.Oc) || 0, adKeywords: parseInt(row.Ad) || 0,
              adTraffic: parseFloat(row.At) || 0, adCost: parseFloat(row.Ac) || 0
          };
      }
      return null;
  }
  
  // Metoda internă 'makeRequest' rămâne aceeași, dar acum este apelată doar dacă există cheia.
  async makeRequest(params = {}) {
    const requestParams = { key: this.apiKey, ...params };
    try {
      const response = await axios.get(this.baseURL, { params: requestParams, timeout: this.timeout });
      if (response.data.includes('ERROR')) {
        console.warn(`[SEMrushService] API Warning: ${response.data}`);
        return [];
      }
      return this.parseCSVResponse(response.data);
    } catch (error) {
      console.warn(`[SEMrushService] API request failed: ${error.message}`);
      return [];
    }
  }

  parseCSVResponse(csvData) {
    try {
      return parse(csvData, { columns: true, skip_empty_lines: true, delimiter: ';' });
    } catch (error) {
      console.error('[SEMrushService] CSV parsing failed:', error.message);
      return [];
    }
  }

  calculateSEOScore(data) {
    if (!data) return 0;
    let score = 0;
    let maxScore = 0;
    if (data.organicKeywords) { maxScore += 30; if (data.organicKeywords > 1000) score += 30; else score += 15; }
    if (data.organicTraffic) { maxScore += 25; if (data.organicTraffic > 10000) score += 25; else score += 12; }
    if (data.rank) { maxScore += 20; if (data.rank <= 500000) score += 20; else score += 10; }
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  generateRecommendations(domainData, keywords = []) {
    if (!domainData) return [];
    const recommendations = [];
    if (domainData.organicKeywords < 100) { recommendations.push({ type: 'content', priority: 'high', title: 'Crește numărul de keywords organice', description: 'Domeniul are puține keywords organice. Creează mai mult conținut optimizat SEO.' }); }
    if (domainData.organicTraffic < 1000) { recommendations.push({ type: 'traffic', priority: 'high', title: 'Optimizează pentru trafic organic', description: 'Traficul organic este scăzut. Îmbunătățește pozițiile pentru keywords-urile existente.' }); }
    return recommendations;
  }
}

module.exports = SEMrushService;