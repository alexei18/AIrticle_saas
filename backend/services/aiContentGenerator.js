const { CrawledPage } = require('../models');
// const WebsiteAnalyzer = require('./websiteAnalyzer'); // Dependința este complet eliminată
const SerpApiService = require('./serpApiService');
const AIProviderManager = require('./aiProviders');

class AIContentGenerator {
  constructor() {
    this.aiProvider = new AIProviderManager();
    this.serpApi = new SerpApiService();
  }

  async makeAIRequest(prompt, options = {}) {
    return this.aiProvider.makeAIRequest(prompt, options);
  }

  /**
   * NOU: Această metodă a fost mutată aici din WebsiteAnalyzer
   * Trimite datele la AI pentru o analiză calitativă de expert SEO.
   */
  async analyzePageQuality(pageData) {
    if (!pageData.title && !pageData.contentSample) {
        return { score: 50, recommendations: ["AI Analysis: Nu s-a putut analiza calitatea din lipsă de conținut."] };
    }
    
    const prompt = `
      Acționează ca un expert SEO de talie mondială. Analizează următoarele date extrase de pe o pagină web.
      Oferă un scor de calitate de la 0 la 100 și 2-3 recomandări strategice scurte pentru a îmbunătăți calitatea conținutului și relevanța SEO.
      Fii concis, direct și acționabil.

      Date de analizat:
      - Titlu Pagina: "${pageData.title}"
      - Meta Descriere: "${pageData.metaDescription}"
      - H1: "${pageData.h1}"
      - Mostră de Conținut: "${pageData.contentSample}"

      Criterii de analiză:
      1.  **Claritate și Relevanță:** Sunt titlul, H1 și descrierea aliniate cu conținutul?
      2.  **Intenția Utilizatorului:** Răspunde pagina la o nevoie clară a utilizatorului (informațională, comercială)?
      3.  **Calitatea Scrierii:** Este textul atractiv, persuasiv și ușor de citit?
      4.  **Apel la Acțiune (Call-to-Action):** Există îndemnuri clare pentru utilizator?

      Returnează DOAR un obiect JSON cu structura:
      {
        "score": <un număr de la 0 la 100>,
        "recommendations": [
          "AI: Recomandarea 1...",
          "AI: Recomandarea 2..."
        ]
      }
    `;

    try {
        const result = await this.makeAIRequest(prompt, { isJson: true });
        if (typeof result.score === 'number' && Array.isArray(result.recommendations)) {
            return {
                score: Math.max(0, Math.min(100, result.score)),
                recommendations: result.recommendations
            };
        }
        throw new Error("Răspunsul AI are un format invalid.");
    } catch (error) {
        console.error("[AIContentGenerator] AI qualitative analysis failed:", error.message);
        return { score: 50, recommendations: [`AI Analysis Failed: ${error.message}`] };
    }
  }

  async generatePageRecommendations(pageData, language = 'ro') {
    // NOU: Verificare pentru a nu face apeluri inutile
    if (!pageData || !pageData.url || !pageData.title) {
        console.warn('[AI Recommender] Skipping page recommendations due to insufficient data.');
        return ["Insufficient data to generate recommendations."];
    }
      
    const prompt = `
      Act as an expert SEO consultant. Analyze the following data from a single webpage:
      URL: ${pageData.url}
      Title: "${pageData.title}"
      SEO Score: ${pageData.seoScore}/100
      Identified Issues: ${pageData.issues.join(', ')}

      Based ONLY on this data, provide 2-3 specific, actionable, and concise recommendations to improve this page's SEO.
      The language for the recommendations must be ${language}.

      Return ONLY a JSON object with a "recommendations" key containing an array of strings.
      Example:
      {
        "recommendations": [
          "Rewrite the title to be under 60 characters and include the primary keyword.",
          "Add a compelling meta description of about 150 characters that encourages clicks.",
          "Increase the word count by adding a new section that answers a common user question."
        ]
      }
    `;
    try {
      const result = await this.makeAIRequest(prompt, { isJson: true });
      return result.recommendations || ["Could not generate AI recommendations."];
    } catch (error) {
      console.error(`[AI Recommender] Failed to generate recommendations for ${pageData.url}:`, error.message);
      return ["Could not generate AI recommendations due to an API error."];
    }
  }

  async generateArticle(options) {
    const prompt = this.buildPrompt(options);
    const content = await this.makeAIRequest(prompt, { maxTokens: Math.floor((options.wordCount || 2000) * 1.6) });
    return this.processGeneratedContent(content, options);
  }


  async generateDomainRecommendations(analysisData, language = 'ro') {
    // NOU: Verificare robustă a datelor de intrare
    if (!analysisData || analysisData.technicalIssues.length === 0 && analysisData.contentIssues.length === 0) {
        console.warn('[AI Recommender] Skipping domain recommendations due to no significant issues found.');
        return [{ title: "No Major Issues", description: "The automated analysis did not find significant aggregated issues to generate strategic recommendations." }];
    }

    const prompt = `
      You are a senior SEO strategist. Analyze the following aggregated summary of issues found across an entire website.
      - Total Pages Analyzed: ${analysisData.totalPages}
      - Average On-Page SEO Score: ${analysisData.avgOnPageScore}/100
      - SEMrush Authority Score: ${analysisData.semrushScore || 'N/A'}/100
      - Aggregated Technical Issues: ${analysisData.technicalIssues.join(', ')}
      - Aggregated Content Issues: ${analysisData.contentIssues.join(', ')}

      Based on this summary, provide the top 3-4 most impactful strategic recommendations for the website owner.
      Focus on high-level strategy, not per-page fixes.
      The language for the recommendations must be ${language}.

      Return ONLY a JSON object with a "recommendations" key containing an array of objects, each with a "title" and a "description".
      Example:
      {
        "recommendations": [
          { "title": "Prioritize H1 Tags", "description": "A significant number of pages are missing an H1 tag. Ensure every important page has a unique and descriptive H1." },
          { "title": "Address Thin Content", "description": "Multiple pages have a low word count. Expand these pages with more valuable information to improve their ranking potential." }
        ]
      }
    `;
    try {
      const result = await this.makeAIRequest(prompt, { isJson: true });
      return result.recommendations || [];
    } catch (error) {
      console.error(`[AI Recommender] Failed to generate domain recommendations:`, error.message);
      return [{ title: "AI Error", description: "Could not generate AI recommendations due to an API error. Please check your AI provider keys and plan." }];
    }
  }

  async generateBulkArticles(options) {
    const { websiteId, websiteDomain, numberOfArticles = 5, siteAnalysis: existingSiteAnalysis } = options;

    let siteAnalysis = existingSiteAnalysis;
    if (!siteAnalysis) {
      const analyzer = new WebsiteAnalyzer();
      siteAnalysis = await analyzer.analyzeWebsite(websiteDomain, { language: options.language || 'ro' });
    }

    const pages = await CrawledPage.findAll({ where: { websiteId }, attributes: ['title', 'headings'], limit: 300 });
    if (pages.length === 0) throw new Error("No crawled page data found.");
    
    const pageContext = pages.map(p => ({ title: p.title, headings: p.headings })).filter(p => p.title);

    const topicsResult = await this.generateTopicIdeas(pageContext, numberOfArticles, options.language, siteAnalysis, websiteDomain);
    
    const topics = topicsResult.topics || [];
    if (topics.length === 0) throw new Error('AI failed to generate article topics.');

    console.log(`[AI Bulk Gen] Generated ${topics.length} ideas. Now generating full articles...`);

    const articlePromises = topics.map(topic => this.generateArticle({ ...options, title: topic.title, targetKeywords: topic.keywords, siteAnalysis }));
    const settledArticles = await Promise.allSettled(articlePromises);
    
    const generatedArticles = [];
    settledArticles.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        generatedArticles.push({
          ...result.value,
          title: topics[index].title,
          slug: topics[index].title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          targetKeywords: topics[index].keywords,
        });
      } else {
        console.error(`[AI Bulk Gen] Failed to generate content for topic: "${topics[index].title}"`, result.reason);
      }
    });
    return generatedArticles;
  }

  async generateTopicIdeas(pageContext, numberOfArticles, language, siteAnalysis, websiteDomain) {
    const serpEnhancedTopics = await this.generateEnhancedTopicIdeas(pageContext, numberOfArticles, language, siteAnalysis, websiteDomain);
    if (serpEnhancedTopics && serpEnhancedTopics.topics) {
      return serpEnhancedTopics;
    }

    const prompt = `
        You are an SEO Content Strategist for "${websiteDomain}".
        Based on crawled data, generate ${numberOfArticles} compelling article topics.
        **Crawled Data:** ${JSON.stringify(pageContext.slice(0, 15), null, 2)}
        **Instructions:**
        1. Generate ${numberOfArticles} unique, relevant article ideas.
        2. Focus on commercial and informational intent.
        3. For each, provide a catchy, SEO-optimized title and 3-5 keywords.
        4. Language must be ${language}.
        **Output Format:**
        Return ONLY a JSON object: { "topics": [{ "title": "...", "keywords": ["...", "..."] }] }
    `;
    return await this.makeAIRequest(prompt, { isJson: true, maxTokens: 2048, temperature: 0.8 });
  }

  async generateEnhancedTopicIdeas(pageContext, numberOfArticles, language, siteAnalysis, websiteDomain) {
    try {
      const mainTopics = this.extractMainTopicsFromPages(pageContext);
      if (mainTopics.length === 0) return null;

      console.log(`[AI Enhanced Topics] Getting SERP data for topics: ${mainTopics.slice(0, 3).join(', ')}`);
      const serpData = await Promise.all(
        mainTopics.slice(0, 3).map(topic => this.serpApi.getKeywordData(topic, { language, country: 'ro' }))
      );

      const validSerpData = serpData.filter(Boolean);
      if (validSerpData.length === 0) return null;

      const competitorInsights = this.extractCompetitorInsights(validSerpData);
      const relatedKeywords = this.extractRelatedKeywords(validSerpData);

      const prompt = `
        You are an advanced SEO Content Strategist for "${websiteDomain}".
        Use the following data to generate ${numberOfArticles} high-value article topics:

        **Website Context:** ${JSON.stringify(pageContext.slice(0, 10), null, 2)}
        
        **SERP Research Insights:**
        - Main Topics Analyzed: ${mainTopics.slice(0, 3).join(', ')}
        - Related Keywords from SERP: ${relatedKeywords.slice(0, 15).join(', ')}
        - Competitor Content Gaps: ${competitorInsights.contentGaps.join(', ')}
        - People Also Ask: ${competitorInsights.peopleAlsoAsk.slice(0, 5).join('; ')}

        **Instructions:**
        1. Generate ${numberOfArticles} unique article topics that target keyword gaps and user intent
        2. Focus on topics where competitors are weak or missing content
        3. Include both informational and commercial intent keywords
        4. Each topic should target 1 primary + 3-5 secondary keywords from SERP data
        5. Language must be ${language}
        6. Prioritize topics with good search volume but manageable competition

        **Output Format:**
        Return ONLY a JSON object:
        {
          "topics": [
            {
              "title": "SEO-optimized article title",
              "keywords": ["primary keyword", "secondary1", "secondary2", "secondary3"],
              "intent": "informational/commercial",
              "difficulty": "easy/medium/hard",
              "searchVolume": "estimated volume"
            }
          ]
        }
      `;

      return await this.makeAIRequest(prompt, { isJson: true, maxTokens: 3000, temperature: 0.7 });
    } catch (error) {
      console.error('[AI Enhanced Topics] Failed to generate enhanced topics:', error.message);
      return null;
    }
  }

  extractMainTopicsFromPages(pageContext) {
    const topics = new Set();
    
    pageContext.forEach(page => {
      if (page.title) {
        const titleWords = page.title.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 3);
        
        titleWords.forEach(word => topics.add(word));
      }

      if (page.headings && Array.isArray(page.headings)) {
        page.headings.forEach(heading => {
          if (heading.text && heading.level <= 2) {
            const headingWords = heading.text.toLowerCase()
              .replace(/[^\w\s]/g, ' ')
              .split(/\s+/)
              .filter(word => word.length > 3);
            
            headingWords.forEach(word => topics.add(word));
          }
        });
      }
    });

    return Array.from(topics).slice(0, 5);
  }

  extractCompetitorInsights(serpData) {
    const insights = {
      contentGaps: new Set(),
      peopleAlsoAsk: [],
      commonTitles: new Set()
    };

    serpData.forEach(data => {
      if (data.relatedSearches) {
        data.relatedSearches.forEach(search => insights.contentGaps.add(search));
      }

      if (data.peopleAlsoAsk) {
        insights.peopleAlsoAsk.push(...data.peopleAlsoAsk);
      }

      if (data.organicResults) {
        data.organicResults.slice(0, 5).forEach(result => {
          insights.commonTitles.add(result.title);
        });
      }
    });

    return {
      contentGaps: Array.from(insights.contentGaps).slice(0, 10),
      peopleAlsoAsk: insights.peopleAlsoAsk.slice(0, 8),
      commonTitles: Array.from(insights.commonTitles).slice(0, 5)
    };
  }

  extractRelatedKeywords(serpData) {
    const keywords = new Set();
    
    serpData.forEach(data => {
      if (data.relatedSearches) {
        data.relatedSearches.forEach(search => keywords.add(search));
      }

      if (data.peopleAlsoAsk) {
        data.peopleAlsoAsk.forEach(question => {
          const questionKeywords = this.serpApi.extractKeywordsFromText(question);
          questionKeywords.slice(0, 2).forEach(kw => keywords.add(kw));
        });
      }
    });

    return Array.from(keywords).slice(0, 20);
  }

  async generateKeywordResearchReport(websiteDomain, pageContext, options = {}) {
    try {
      const language = options.language || 'ro';
      const mainTopics = this.extractMainTopicsFromPages(pageContext);
      
      if (mainTopics.length === 0) {
        return { error: 'No topics extracted from website content' };
      }

      console.log(`[Keyword Research] Analyzing ${mainTopics.length} main topics for ${websiteDomain}`);

      const serpData = await this.serpApi.getBulkKeywordData(mainTopics.slice(0, 5), { 
        language, 
        country: 'ro' 
      });

      if (serpData.length === 0) {
        return { error: 'No SERP data available' };
      }

      const competitorAnalysis = await Promise.all(
        serpData.slice(0, 3).map(data => 
          this.serpApi.getCompetitorAnalysis(websiteDomain, data.keyword, { language, country: 'ro' })
        )
      );

      const validCompetitorData = competitorAnalysis.filter(Boolean);

      const relatedKeywords = await Promise.all(
        mainTopics.slice(0, 3).map(topic => 
          this.serpApi.getRelatedKeywords(topic, { language, country: 'ro' })
        )
      );

      const allRelatedKeywords = relatedKeywords.flat();

      const keywordStrategy = await this.generateKeywordStrategy(
        websiteDomain,
        serpData,
        validCompetitorData,
        allRelatedKeywords,
        pageContext,
        language
      );

      return {
        websiteDomain,
        timestamp: new Date().toISOString(),
        mainTopics,
        serpAnalysis: serpData,
        competitorAnalysis: validCompetitorData,
        relatedKeywords: allRelatedKeywords,
        keywordStrategy,
        summary: {
          totalKeywordsAnalyzed: serpData.length,
          competitorsAnalyzed: validCompetitorData.length,
          relatedKeywordsFound: allRelatedKeywords.length,
          topOpportunities: keywordStrategy?.opportunities?.slice(0, 5) || []
        }
      };
    } catch (error) {
      console.error('[Keyword Research] Failed to generate report:', error.message);
      return { error: error.message };
    }
  }

  async generateKeywordStrategy(domain, serpData, competitorData, relatedKeywords, pageContext, language) {
    const prompt = `
      You are a senior SEO strategist. Analyze the following keyword research data for "${domain}" and create a comprehensive keyword strategy:

      **SERP Analysis:**
      ${JSON.stringify(serpData.map(d => ({
        keyword: d.keyword,
        totalResults: d.totalResults,
        topCompetitors: d.organicResults?.slice(0, 3).map(r => r.displayedLink) || []
      })), null, 2)}

      **Competitor Analysis:**
      ${JSON.stringify(competitorData.map(d => ({
        keyword: d.keyword,
        difficulty: d.difficulty,
        topCompetitors: d.competitors.slice(0, 3).map(c => c.domain),
        targetPosition: d.targetPosition
      })), null, 2)}

      **Related Keywords:** ${relatedKeywords.slice(0, 20).join(', ')}

      **Current Website Pages:** ${JSON.stringify(pageContext.slice(0, 5).map(p => p.title), null, 2)}

      Based on this data, create a strategic keyword plan. Language: ${language}

      **Output Format:**
      Return ONLY a JSON object:
      {
        "primaryKeywords": [
          {
            "keyword": "main target keyword",
            "priority": "high/medium/low",
            "difficulty": "easy/medium/hard",
            "opportunity": "reason why this is a good target",
            "currentRanking": "position or 'not ranking'"
          }
        ],
        "secondaryKeywords": ["keyword1", "keyword2", "..."],
        "longTailKeywords": ["specific long tail phrase1", "..."],
        "contentGaps": [
          {
            "gap": "missing content area",
            "keywords": ["related keywords"],
            "priority": "high/medium/low"
          }
        ],
        "opportunities": [
          {
            "type": "quick win/long term/content gap",
            "description": "specific opportunity description",
            "keywords": ["target keywords"],
            "estimatedImpact": "high/medium/low"
          }
        ],
        "competitorWeaknesses": ["area where competitors are weak"],
        "recommendations": ["actionable recommendation 1", "..."]
      }
    `;

    try {
      const result = await this.makeAIRequest(prompt, { isJson: true, maxTokens: 4000, temperature: 0.6 });
      return result;
    } catch (error) {
      console.error('[Keyword Strategy] Failed to generate strategy:', error.message);
      return {
        primaryKeywords: [],
        opportunities: [],
        recommendations: ['Failed to generate keyword strategy due to API error']
      };
    }
  }

  buildPrompt(options) {
    const { targetKeywords, title, wordCount, tone, language, websiteDomain, siteAnalysis } = options;
    const analysisContext = siteAnalysis ? `WEBSITE CONTEXT: For ${websiteDomain}. Analysis: SEO Score: ${siteAnalysis.overallScore}/100. Issues: ${siteAnalysis.recommendations?.map(r => r.issue).join('; ') || 'N/A'}.` : `WEBSITE CONTEXT: For ${websiteDomain}.`;

    return `
      Write a comprehensive, high-quality ${language} article:
      TITLE: ${title}
      KEYWORDS: ${targetKeywords.join(', ')}
      ${analysisContext}
      REQUIREMENTS:
      - Word count: ~${wordCount} words
      - Tone: ${tone}
      - Use HTML: H1 for title, H2s/H3s.
      - Include an intro and conclusion.
      - Add a meta description at the end, prefixed with "META DESCRIPTION:".
      Generate now:
    `;
  }

  processGeneratedContent(content, options) {
    const metaDescMatch = content.match(/META DESCRIPTION:\s*(.+?)(?:\n|$)/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : this.generateMetaDescription(content, options.targetKeywords);
    let cleanedContent = content.replace(/META DESCRIPTION:\s*.+?(?:\n|$)/i, '').trim();

    const metaTitle = options.title.length > 60 ? options.title.substring(0, 57) + '...' : options.title;
    const wordCount = cleanedContent.split(/\s+/).filter(Boolean).length;
    const headings = this.extractHeadings(cleanedContent);
    const seoScore = this.calculateSEOScore(cleanedContent, options.targetKeywords, headings);

    return { content: cleanedContent, metaTitle, metaDescription, wordCount, seoScore, headings };
  }

  extractHeadings(content) {
    const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
    const headings = [];
    let match;
    while ((match = headingRegex.exec(content)) !== null) {
      headings.push({
        level: parseInt(match[1], 10),
        text: match[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      });
    }
    return headings;
  }

  calculateSEOScore(content, targetKeywords, headings) {
    let score = 50;
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 1500) score += 15; else if (wordCount >= 1000) score += 10;
    if (headings.length >= 5) score += 10;
    if (headings.some(h => h.level === 2)) score += 5;
    targetKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        score = Math.min(100, score + 5);
      }
    });
    return Math.min(100, Math.max(0, score));
  }

  generateMetaDescription(content, targetKeywords) {
    const firstParagraphMatch = content.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (firstParagraphMatch) {
      let description = firstParagraphMatch[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return description.length > 160 ? description.substring(0, 157) + '...' : description;
    }
    return `Descoperă tot ce trebuie să știi despre ${targetKeywords[0]}. Ghid complet și actualizat.`;
  }
}

module.exports = AIContentGenerator;