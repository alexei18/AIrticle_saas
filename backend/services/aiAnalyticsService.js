const { GoogleAnalyticsData, CrawledPage, Keyword } = require('../models');
const AIContentGenerator = require('./aiContentGenerator');
const { Op } = require('sequelize');

class AIAnalyticsService {
  constructor() {
    this.aiContentGenerator = new AIContentGenerator();
  }

  async generateContentRecommendationsFromAnalytics(websiteId, options = {}) {
    try {
      const { days = 30, language = 'ro' } = options;
      
      // Fetch recent analytics data
      const analyticsData = await this.getRecentAnalyticsData(websiteId, days);
      
      if (!analyticsData || analyticsData.length === 0) {
        throw new Error('No Google Analytics data available for this website');
      }

      // Extract insights from analytics
      const insights = await this.extractAnalyticsInsights(analyticsData);
      
      // Get current page performance
      const pagePerformance = await this.getPagePerformanceData(websiteId, analyticsData);
      
      // Generate AI recommendations
      const recommendations = await this.generateAnalyticsBasedRecommendations(
        insights, 
        pagePerformance, 
        language
      );

      return {
        websiteId,
        period: `${days} days`,
        analyticsInsights: insights,
        pagePerformance,
        recommendations,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[AI Analytics] Error generating content recommendations:', error);
      throw new Error(`Failed to generate analytics-based recommendations: ${error.message}`);
    }
  }

  async getRecentAnalyticsData(websiteId, days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await GoogleAnalyticsData.findAll({
      where: {
        websiteId,
        date: {
          [Op.gte]: startDate
        }
      },
      order: [['date', 'DESC']]
    });
  }

  async extractAnalyticsInsights(analyticsData) {
    const totalSessions = analyticsData.reduce((sum, day) => sum + day.sessions, 0);
    const totalUsers = analyticsData.reduce((sum, day) => sum + day.users, 0);
    const totalPageViews = analyticsData.reduce((sum, day) => sum + day.pageViews, 0);
    const avgBounceRate = analyticsData.reduce((sum, day) => sum + (day.bounceRate || 0), 0) / analyticsData.length;
    const avgSessionDuration = analyticsData.reduce((sum, day) => sum + (day.avgSessionDuration || 0), 0) / analyticsData.length;

    // Extract top performing pages
    const topPages = new Map();
    analyticsData.forEach(day => {
      if (day.topPages) {
        day.topPages.forEach(page => {
          const existing = topPages.get(page.path) || { path: page.path, title: page.title, totalPageViews: 0, totalSessions: 0 };
          existing.totalPageViews += page.pageViews;
          existing.totalSessions += page.sessions;
          topPages.set(page.path, existing);
        });
      }
    });

    // Extract traffic sources insights
    const trafficSources = new Map();
    analyticsData.forEach(day => {
      if (day.trafficSources) {
        day.trafficSources.forEach(source => {
          const existing = trafficSources.get(source.source) || { source: source.source, totalSessions: 0, totalUsers: 0 };
          existing.totalSessions += source.sessions;
          existing.totalUsers += source.users;
          trafficSources.set(source.source, existing);
        });
      }
    });

    // Extract device breakdown
    const deviceBreakdown = new Map();
    analyticsData.forEach(day => {
      if (day.deviceBreakdown) {
        day.deviceBreakdown.forEach(device => {
          const existing = deviceBreakdown.get(device.device) || { device: device.device, totalSessions: 0, totalUsers: 0 };
          existing.totalSessions += device.sessions;
          existing.totalUsers += device.users;
          deviceBreakdown.set(device.device, existing);
        });
      }
    });

    return {
      overview: {
        totalSessions,
        totalUsers,
        totalPageViews,
        avgBounceRate: Math.round(avgBounceRate * 100) / 100,
        avgSessionDuration: Math.round(avgSessionDuration),
        period: analyticsData.length
      },
      topPages: Array.from(topPages.values()).sort((a, b) => b.totalPageViews - a.totalPageViews).slice(0, 10),
      trafficSources: Array.from(trafficSources.values()).sort((a, b) => b.totalSessions - a.totalSessions),
      deviceBreakdown: Array.from(deviceBreakdown.values()).sort((a, b) => b.totalSessions - a.totalSessions),
      trends: this.calculateTrends(analyticsData)
    };
  }

  calculateTrends(analyticsData) {
    if (analyticsData.length < 7) return null;

    const recentWeek = analyticsData.slice(0, 7);
    const previousWeek = analyticsData.slice(7, 14);

    if (previousWeek.length === 0) return null;

    const recentSessions = recentWeek.reduce((sum, day) => sum + day.sessions, 0);
    const previousSessions = previousWeek.reduce((sum, day) => sum + day.sessions, 0);
    const recentPageViews = recentWeek.reduce((sum, day) => sum + day.pageViews, 0);
    const previousPageViews = previousWeek.reduce((sum, day) => sum + day.pageViews, 0);

    return {
      sessionsChange: previousSessions > 0 ? ((recentSessions - previousSessions) / previousSessions * 100).toFixed(2) : 0,
      pageViewsChange: previousPageViews > 0 ? ((recentPageViews - previousPageViews) / previousPageViews * 100).toFixed(2) : 0,
      direction: recentSessions > previousSessions ? 'up' : 'down'
    };
  }

  async getPagePerformanceData(websiteId, analyticsData) {
    // Get crawled pages data
    const crawledPages = await CrawledPage.findAll({
      where: { websiteId },
      attributes: ['url', 'title', 'seoScore', 'issues', 'content']
    });

    // Match analytics data with crawled pages
    const pagePerformance = [];
    
    if (analyticsData.length > 0 && analyticsData[0].topPages) {
      analyticsData[0].topPages.forEach(analyticsPage => {
        const matchedPage = crawledPages.find(page => page.url.includes(analyticsPage.path));
        
        if (matchedPage) {
          pagePerformance.push({
            path: analyticsPage.path,
            title: analyticsPage.title || matchedPage.title,
            pageViews: analyticsPage.pageViews,
            sessions: analyticsPage.sessions,
            seoScore: matchedPage.seoScore,
            issues: matchedPage.issues,
            contentLength: matchedPage.content ? matchedPage.content.length : 0,
            performance: this.calculatePagePerformanceScore(analyticsPage, matchedPage)
          });
        }
      });
    }

    return pagePerformance.sort((a, b) => b.performance.score - a.performance.score);
  }

  calculatePagePerformanceScore(analyticsPage, crawledPage) {
    let score = 0;
    let factors = [];

    // Analytics performance factors
    if (analyticsPage.pageViews > 100) {
      score += 25;
      factors.push('High page views');
    } else if (analyticsPage.pageViews > 50) {
      score += 15;
      factors.push('Moderate page views');
    }

    if (analyticsPage.sessions > 50) {
      score += 20;
      factors.push('Good session count');
    }

    // SEO performance factors
    if (crawledPage.seoScore > 80) {
      score += 25;
      factors.push('High SEO score');
    } else if (crawledPage.seoScore > 60) {
      score += 15;
      factors.push('Moderate SEO score');
    }

    // Content quality factors
    if (crawledPage.content && crawledPage.content.length > 2000) {
      score += 20;
      factors.push('Comprehensive content');
    } else if (crawledPage.content && crawledPage.content.length > 1000) {
      score += 10;
      factors.push('Good content length');
    }

    // Issues penalty
    if (crawledPage.issues && crawledPage.issues.length > 0) {
      score -= crawledPage.issues.length * 5;
      factors.push(`${crawledPage.issues.length} SEO issues`);
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      factors
    };
  }

  async generateAnalyticsBasedRecommendations(insights, pagePerformance, language = 'ro') {
    const prompt = `
      You are a senior SEO and content strategist analyzing Google Analytics data for a website. 
      Generate specific, actionable content and SEO recommendations based on the following analytics insights:

      **Analytics Overview (Last ${insights.overview.period} days):**
      - Total Sessions: ${insights.overview.totalSessions}
      - Total Users: ${insights.overview.totalUsers}  
      - Total Page Views: ${insights.overview.totalPageViews}
      - Average Bounce Rate: ${insights.overview.avgBounceRate}%
      - Average Session Duration: ${insights.overview.avgSessionDuration} seconds
      ${insights.trends ? `- Recent Trend: ${insights.trends.direction} ${insights.trends.sessionsChange}% in sessions` : ''}

      **Top Performing Pages:**
      ${insights.topPages.slice(0, 5).map(page => `- ${page.title} (${page.path}): ${page.totalPageViews} page views, ${page.totalSessions} sessions`).join('\n')}

      **Traffic Sources:**
      ${insights.trafficSources.map(source => `- ${source.source}: ${source.totalSessions} sessions (${((source.totalSessions / insights.overview.totalSessions) * 100).toFixed(1)}%)`).join('\n')}

      **Device Breakdown:**
      ${insights.deviceBreakdown.map(device => `- ${device.device}: ${device.totalSessions} sessions (${((device.totalSessions / insights.overview.totalSessions) * 100).toFixed(1)}%)`).join('\n')}

      **Page Performance Analysis:**
      ${pagePerformance.slice(0, 5).map(page => `- ${page.title}: Performance Score ${page.performance.score}/100, SEO Score ${page.seoScore}/100, ${page.pageViews} page views`).join('\n')}

      Based on this data analysis, provide comprehensive recommendations in ${language}. Focus on:
      1. Content optimization opportunities based on top performing content
      2. New content ideas targeting successful traffic patterns
      3. Technical improvements based on user behavior
      4. SEO opportunities from underperforming but high-potential pages
      5. Conversion optimization based on device and traffic source data

      Return ONLY a JSON object:
      {
        "contentRecommendations": [
          {
            "type": "content-optimization/new-content/content-expansion",
            "title": "Recommendation title",
            "description": "Detailed description of what to do and why",
            "targetPages": ["page paths if applicable"],
            "expectedImpact": "high/medium/low",
            "effort": "high/medium/low",
            "keywords": ["suggested keywords to target"],
            "priority": 1-10
          }
        ],
        "technicalRecommendations": [
          {
            "type": "performance/mobile/ux",
            "title": "Technical recommendation",
            "description": "What needs to be improved",
            "impact": "high/medium/low",
            "priority": 1-10
          }
        ],
        "keywordOpportunities": [
          {
            "keyword": "suggested keyword",
            "reason": "why this keyword is suggested based on analytics",
            "contentType": "blog-post/landing-page/guide",
            "priority": "high/medium/low"
          }
        ],
        "summary": {
          "mainInsights": ["key insight 1", "key insight 2", "key insight 3"],
          "quickWins": ["quick action 1", "quick action 2"],
          "longTermStrategy": "overall strategic direction based on data"
        }
      }
    `;

    try {
      const result = await this.aiContentGenerator.makeAIRequest(prompt, { 
        isJson: true, 
        maxTokens: 4000, 
        temperature: 0.6 
      });
      
      return result;
    } catch (error) {
      console.error('[AI Analytics] Failed to generate recommendations:', error);
      return {
        contentRecommendations: [],
        technicalRecommendations: [],
        keywordOpportunities: [],
        summary: {
          mainInsights: ['Failed to generate AI-powered insights due to API error'],
          quickWins: [],
          longTermStrategy: 'Manual analysis required due to AI service unavailability'
        }
      };
    }
  }

  async generateTopicIdeasFromAnalytics(websiteId, options = {}) {
    try {
      const { days = 30, numberOfTopics = 5, language = 'ro' } = options;
      
      const insights = await this.extractAnalyticsInsights(
        await this.getRecentAnalyticsData(websiteId, days)
      );

      // Get current keywords
      const existingKeywords = await Keyword.findAll({
        where: { websiteId },
        attributes: ['keyword', 'searchVolume', 'currentPosition']
      });

      const prompt = `
        You are a content strategist analyzing Google Analytics data to generate new article topics.
        
        **Analytics Data:**
        - Top Performing Pages: ${insights.topPages.slice(0, 5).map(p => p.title).join(', ')}
        - Main Traffic Sources: ${insights.trafficSources.map(s => s.source).join(', ')}
        - Device Usage: ${insights.deviceBreakdown.map(d => `${d.device} (${((d.totalSessions / insights.overview.totalSessions) * 100).toFixed(1)}%)`).join(', ')}
        
        **Current Keywords:**
        ${existingKeywords.slice(0, 10).map(k => `- ${k.keyword} (Volume: ${k.searchVolume}, Position: ${k.currentPosition || 'Not ranking'})`).join('\n')}
        
        Based on successful content patterns and user behavior, generate ${numberOfTopics} new article topics that would likely perform well.
        Language: ${language}
        
        Focus on:
        1. Topics similar to already successful pages
        2. Content that matches successful traffic sources
        3. Device-optimized content ideas
        4. Keywords with potential based on current rankings
        
        Return ONLY a JSON object:
        {
          "topics": [
            {
              "title": "SEO-optimized article title",
              "keywords": ["primary keyword", "secondary1", "secondary2"],
              "reason": "Why this topic should perform well based on analytics",
              "contentType": "how-to/guide/comparison/list",
              "targetAudience": "audience based on analytics data",
              "estimatedTrafficPotential": "high/medium/low"
            }
          ]
        }
      `;

      const result = await this.aiContentGenerator.makeAIRequest(prompt, { 
        isJson: true, 
        maxTokens: 3000, 
        temperature: 0.7 
      });

      return result;
    } catch (error) {
      console.error('[AI Analytics] Failed to generate topics from analytics:', error);
      throw new Error(`Failed to generate analytics-based topics: ${error.message}`);
    }
  }

  async generateKeywordStrategyFromAnalytics(websiteId, options = {}) {
    try {
      const { days = 30, language = 'ro' } = options;
      
      const insights = await this.extractAnalyticsInsights(
        await this.getRecentAnalyticsData(websiteId, days)
      );

      const pagePerformance = await this.getPagePerformanceData(websiteId, 
        await this.getRecentAnalyticsData(websiteId, days)
      );

      const prompt = `
        You are a keyword strategist analyzing Google Analytics performance data to optimize keyword strategy.
        
        **Performance Data:**
        - Best Performing Pages: ${pagePerformance.slice(0, 5).map(p => `${p.title} (Score: ${p.performance.score}, SEO: ${p.seoScore}, Views: ${p.pageViews})`).join('; ')}
        - Traffic Sources: ${insights.trafficSources.map(s => `${s.source}: ${s.totalSessions} sessions`).join(', ')}
        - User Behavior: ${insights.overview.avgBounceRate}% bounce rate, ${insights.overview.avgSessionDuration}s avg session
        
        Based on this performance data, create a keyword optimization strategy.
        Language: ${language}
        
        Return ONLY a JSON object:
        {
          "optimizationOpportunities": [
            {
              "page": "page title/path",
              "currentPerformance": "description of current analytics performance", 
              "suggestedKeywords": ["keyword1", "keyword2"],
              "optimizationType": "new-target/optimization/expansion",
              "reason": "why this optimization makes sense based on analytics",
              "priority": "high/medium/low"
            }
          ],
          "contentGaps": [
            {
              "opportunity": "content gap description",
              "keywords": ["target keywords"],
              "basedOn": "analytics insight that suggests this gap",
              "estimatedImpact": "high/medium/low"
            }
          ],
          "quickWins": [
            {
              "action": "specific action to take",
              "keywords": ["related keywords"], 
              "expectedResult": "expected improvement",
              "analyticsSupport": "why analytics data supports this"
            }
          ]
        }
      `;

      const result = await this.aiContentGenerator.makeAIRequest(prompt, { 
        isJson: true, 
        maxTokens: 3500, 
        temperature: 0.6 
      });

      return {
        websiteId,
        analysis: insights,
        strategy: result,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[AI Analytics] Failed to generate keyword strategy:', error);
      throw new Error(`Failed to generate analytics-based keyword strategy: ${error.message}`);
    }
  }
}

module.exports = new AIAnalyticsService();