const axios = require('axios');
const { URL } = require('url');

class SerpApiService {
  constructor() {
    this.apiKey = process.env.SERP_API_KEY;
    this.baseUrl = 'https://serpapi.com/search';
  }

  // Metodă internă pentru a face cereri, cu gestionare erori
  async makeRequest(params) {
    if (!this.apiKey) {
      console.warn('[SERP API] No API key configured. Skipping request.');
      return null;
    }
    try {
      const fullParams = {
        api_key: this.apiKey,
        location: 'Romania',
        hl: 'ro',
        gl: 'ro',
        ...params
      };
      const response = await axios.get(this.baseUrl, { params: fullParams, timeout: 30000 });
      return response.data;
    } catch (error) {
      console.error(`[SERP API] Request failed for query "${params.q}":`, error.message);
      return null;
    }
  }

  // --- Funcționalități Noi ---

  /**
   * 1. Keyword Research - Găsește sugestii autocomplete.
   */
  async getAutocompleteSuggestions(keyword) {
    const data = await this.makeRequest({
      engine: 'google_autocomplete',
      q: keyword,
    });
    return data?.suggestions?.map(s => s.value) || [];
  }

  /**
   * 2. Rank Tracking - Găsește poziția unui domeniu pentru un keyword.
   */
  async trackRanking(keyword, domain) {
    const data = await this.makeRequest({
      engine: 'google',
      q: keyword,
      num: 100 // Căutăm în primele 100 de rezultate
    });

    if (!data || !data.organic_results) return null;

    const position = data.organic_results.findIndex(result => 
      result.link && result.link.includes(domain.replace(/^www\./, ''))
    );
    
    return position !== -1 ? position + 1 : null;
  }

  /**
   * 3. SERP Analysis - Analizează complet prima pagină de rezultate.
   */
  async analyzeSerp(keyword) {
    const data = await this.makeRequest({
      engine: 'google',
      q: keyword,
      num: 20 // Analizăm primele 20 de rezultate
    });

    if (!data) return null;

    return {
      keyword: keyword,
      totalResults: data.search_information?.total_results || 0,
      featuredSnippet: data.answer_box || data.featured_snippet || null,
      knowledgeGraph: data.knowledge_graph || null,
      peopleAlsoAsk: data.related_questions?.map(q => q.question) || [],
      topDomains: (data.organic_results || []).slice(0, 10).map(r => r.displayed_link),
      organicResults: (data.organic_results || []),
    };
  }

  /**
   * 4. Competitor Tracking - Monitorizează pozițiile competitorilor.
   */
  async trackCompetitors(keywords, competitorDomains) {
      const competitorData = {}; // { "competitor.com": [{ keyword, position, ... }] }
      for (const domain of competitorDomains) {
          competitorData[domain] = [];
      }

      for (const keyword of keywords) {
          const data = await this.makeRequest({ engine: 'google', q: keyword, num: 50 });
          if (!data || !data.organic_results) continue;

          for (const domain of competitorDomains) {
              const position = data.organic_results.findIndex(r => r.link && r.link.includes(domain));
              if (position !== -1) {
                  const result = data.organic_results[position];
                  competitorData[domain].push({
                      keyword,
                      position: position + 1,
                      title: result.title,
                      url: result.link,
                  });
              }
          }
      }
      return competitorData;
  }

  /**
   * 5. Backlink Discovery - Descoperă backlink-uri folosind operatori de căutare.
   */
  async findBacklinks(domain) {
      const query = `"${domain}" -site:${domain}`; // Caută mențiuni ale domeniului, excluzând propriul site
      const data = await this.makeRequest({ engine: 'google', q: query, num: 100 });
      if (!data || !data.organic_results) return [];

      return data.organic_results.map(result => ({
          sourceUrl: result.link,
          sourceDomain: result.displayed_link,
          title: result.title,
          snippet: result.snippet,
      }));
  }

  /**
   * 6. Content Gap Analysis - Identifică keywords pentru care competitorii rankează, dar tu nu.
   */
  async contentGapAnalysis(yourDomain, competitorDomains, keywords) {
      const gaps = [];
      for (const keyword of keywords) {
          const data = await this.makeRequest({ engine: 'google', q: keyword, num: 50 });
          if (!data || !data.organic_results) continue;

          const yourPosition = data.organic_results.findIndex(r => r.link && r.link.includes(yourDomain));
          const competitorPositions = {};

          competitorDomains.forEach(compDomain => {
              const compPosition = data.organic_results.findIndex(r => r.link && r.link.includes(compDomain));
              if (compPosition !== -1) {
                  competitorPositions[compDomain] = compPosition + 1;
              }
          });

          if (yourPosition === -1 && Object.keys(competitorPositions).length > 0) {
              gaps.push({
                  keyword: keyword,
                  competitorsRanking: competitorPositions,
                  opportunityScore: Object.keys(competitorPositions).length
              });
          }
      }
      return gaps;
  }


  // --- Funcționalități Vechi, Păstrate și Adaptate ---
  
  async getKeywordData(keyword, options = {}) {
    const data = await this.makeRequest({ engine: 'google', q: keyword, ...options });
    if (!data) return null;
    return this.processSearchResults(data, keyword);
  }

  async getBulkKeywordData(keywords, options = {}) {
    const results = [];
    const batchSize = 5;
    for (let i = 0; i < keywords.length; i += batchSize) {
      const batch = keywords.slice(i, i + batchSize);
      const batchPromises = batch.map(keyword => this.getKeywordData(keyword, options));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean));
      if (i + batchSize < keywords.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return results;
  }
  
  processSearchResults(data, keyword) {
    return {
      keyword,
      timestamp: new Date().toISOString(),
      totalResults: data.search_information?.total_results || 0,
      organicResults: (data.organic_results || []).map((result, index) => ({
        position: index + 1,
        title: result.title,
        link: result.link,
        displayedLink: result.displayed_link,
        snippet: result.snippet,
      })),
      relatedSearches: (data.related_searches || []).map(item => item.query),
      peopleAlsoAsk: (data.related_questions || []).map(item => item.question),
    };
  }

  /**
   * NOU: Căutare web simplificată pentru AI.
   * Returnează o listă curată de rezultate relevante.
   */
  async searchWeb(query) {
    const data = await this.makeRequest({
      engine: 'google',
      q: query,
      num: 10 // Ne concentrăm pe primele 10 rezultate
    });

    if (!data) return [];

    const organicResults = (data.organic_results || []).map(r => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet
    }));

    const relatedQuestions = (data.related_questions || []).map(q => q.question);

    return {
      organicResults,
      relatedQuestions
    };
  }
}

module.exports = SerpApiService;