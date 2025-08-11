const express = require('express');
const Joi = require('joi');
const { Website } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const aiAnalyticsService = require('../services/aiAnalyticsService');

const router = express.Router();
router.use(authenticateToken);

// Generate content recommendations based on Google Analytics data
router.post('/recommendations/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const schema = Joi.object({
      days: Joi.number().min(7).max(365).optional().default(30),
      language: Joi.string().valid('ro', 'en', 'es', 'fr', 'de').optional().default('ro')
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Verify website belongs to user
    const website = await Website.findOne({
      where: { id: websiteId, userId: req.user.id }
    });
    
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const recommendations = await aiAnalyticsService.generateContentRecommendationsFromAnalytics(
      websiteId, 
      value
    );
    
    res.json({ 
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    
    if (error.message.includes('No Google Analytics data')) {
      return res.status(400).json({ 
        error: 'Google Analytics data not available. Please connect and sync your analytics data first.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate AI recommendations',
      details: error.message
    });
  }
});

// Generate topic ideas based on Google Analytics performance data
router.post('/topics/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const schema = Joi.object({
      days: Joi.number().min(7).max(365).optional().default(30),
      numberOfTopics: Joi.number().min(1).max(20).optional().default(5),
      language: Joi.string().valid('ro', 'en', 'es', 'fr', 'de').optional().default('ro')
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Verify website belongs to user
    const website = await Website.findOne({
      where: { id: websiteId, userId: req.user.id }
    });
    
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const topics = await aiAnalyticsService.generateTopicIdeasFromAnalytics(
      websiteId, 
      value
    );
    
    res.json({ 
      success: true,
      data: topics
    });
  } catch (error) {
    console.error('Error generating AI topic ideas:', error);
    
    if (error.message.includes('No Google Analytics data')) {
      return res.status(400).json({ 
        error: 'Google Analytics data not available. Please connect and sync your analytics data first.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate AI topic ideas',
      details: error.message
    });
  }
});

// Generate keyword strategy based on Google Analytics performance
router.post('/keyword-strategy/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const schema = Joi.object({
      days: Joi.number().min(7).max(365).optional().default(30),
      language: Joi.string().valid('ro', 'en', 'es', 'fr', 'de').optional().default('ro')
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Verify website belongs to user
    const website = await Website.findOne({
      where: { id: websiteId, userId: req.user.id }
    });
    
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const keywordStrategy = await aiAnalyticsService.generateKeywordStrategyFromAnalytics(
      websiteId, 
      value
    );
    
    res.json({ 
      success: true,
      data: keywordStrategy
    });
  } catch (error) {
    console.error('Error generating AI keyword strategy:', error);
    
    if (error.message.includes('No Google Analytics data')) {
      return res.status(400).json({ 
        error: 'Google Analytics data not available. Please connect and sync your analytics data first.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate AI keyword strategy',
      details: error.message
    });
  }
});

// Get analytics insights summary for AI analysis
router.get('/insights/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { days = 30 } = req.query;

    // Verify website belongs to user
    const website = await Website.findOne({
      where: { id: websiteId, userId: req.user.id }
    });
    
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Get recent analytics data
    const analyticsData = await aiAnalyticsService.getRecentAnalyticsData(
      websiteId, 
      parseInt(days)
    );
    
    if (!analyticsData || analyticsData.length === 0) {
      return res.status(400).json({ 
        error: 'No Google Analytics data available. Please connect and sync your analytics data first.' 
      });
    }

    // Extract insights
    const insights = await aiAnalyticsService.extractAnalyticsInsights(analyticsData);
    
    // Get page performance data  
    const pagePerformance = await aiAnalyticsService.getPagePerformanceData(
      websiteId, 
      analyticsData
    );

    res.json({ 
      success: true,
      data: {
        insights,
        pagePerformance,
        dataAvailable: analyticsData.length > 0,
        lastUpdated: analyticsData.length > 0 ? analyticsData[0].createdAt : null
      }
    });
  } catch (error) {
    console.error('Error getting analytics insights:', error);
    res.status(500).json({ 
      error: 'Failed to get analytics insights',
      details: error.message
    });
  }
});

// Generate bulk articles based on analytics insights
router.post('/generate-articles/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const schema = Joi.object({
      days: Joi.number().min(7).max(365).optional().default(30),
      numberOfArticles: Joi.number().min(1).max(10).optional().default(3),
      wordCount: Joi.number().min(500).max(5000).optional().default(2000),
      language: Joi.string().valid('ro', 'en', 'es', 'fr', 'de').optional().default('ro'),
      tone: Joi.string().valid('professional', 'casual', 'friendly', 'authoritative').optional().default('professional')
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Verify website belongs to user
    const website = await Website.findOne({
      where: { id: websiteId, userId: req.user.id }
    });
    
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    // Generate topics based on analytics
    const topicsResult = await aiAnalyticsService.generateTopicIdeasFromAnalytics(
      websiteId, 
      { 
        days: value.days, 
        numberOfTopics: value.numberOfArticles,
        language: value.language 
      }
    );

    if (!topicsResult.topics || topicsResult.topics.length === 0) {
      return res.status(400).json({ 
        error: 'Could not generate topics from analytics data' 
      });
    }

    // Generate articles using the AI content generator
    const AIContentGenerator = require('../services/aiContentGenerator');
    const contentGenerator = new AIContentGenerator();

    const generatedArticles = [];
    
    for (const topic of topicsResult.topics) {
      try {
        const article = await contentGenerator.generateArticle({
          websiteId,
          websiteDomain: website.domain,
          title: topic.title,
          targetKeywords: topic.keywords,
          wordCount: value.wordCount,
          language: value.language,
          tone: value.tone
        });

        generatedArticles.push({
          ...article,
          title: topic.title,
          targetKeywords: topic.keywords,
          analyticsReason: topic.reason,
          estimatedTrafficPotential: topic.estimatedTrafficPotential
        });
      } catch (articleError) {
        console.error(`Failed to generate article for topic "${topic.title}":`, articleError);
      }
    }

    res.json({ 
      success: true,
      data: {
        topics: topicsResult.topics,
        articles: generatedArticles,
        generatedCount: generatedArticles.length,
        requestedCount: value.numberOfArticles
      }
    });
  } catch (error) {
    console.error('Error generating articles from analytics:', error);
    
    if (error.message.includes('No Google Analytics data')) {
      return res.status(400).json({ 
        error: 'Google Analytics data not available. Please connect and sync your analytics data first.' 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate articles from analytics',
      details: error.message
    });
  }
});

module.exports = router;