const express = require('express');
const Joi = require('joi');
const { Keyword, Website, CrawledPage, Op } = require('../models'); // Asigură-te că Op este importat
const { authenticateToken } = require('../middleware/auth');
const KeywordResearcher = require('../services/keywordResearch');
const AIProviderManager = require('../services/aiProviders');
const KeywordService = require('../services/keywordService');

const router = express.Router();
router.use(authenticateToken);

const researchSchema = Joi.object({
  websiteId: Joi.number().integer().positive().optional(),
  seedKeyword: Joi.string().min(2).max(100).optional(),
  language: Joi.string().valid('ro', 'en').default('ro'),
  maxSuggestions: Joi.number().integer().min(5).max(100).default(10), // Ajustat min
  aiProvider: Joi.string().optional().allow(''),
}).or('websiteId', 'seedKeyword');

const keywordSchema = Joi.object({
  websiteId: Joi.number().integer().positive().required(),
  keyword: Joi.string().min(1).max(500).required(),
  isTracking: Joi.boolean().default(true)
});

router.get('/ai-status', async (req, res) => {
    try {
        const aiProviderManager = new AIProviderManager();
        const available = aiProviderManager.providers.map(p => p.id);
        const providerDetails = { openai: { name: 'OpenAI GPT-4o' }, gemini: { name: 'Google Gemini Pro' } };
        res.json({ providers: providerDetails, available, defaultProvider: available[0] || null });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check AI provider status' });
    }
});

router.post('/research', async (req, res) => {
  try {
    const { error, value } = researchSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { websiteId, seedKeyword, language, maxSuggestions } = value;
    let textToAnalyze = seedKeyword;
    let domain = null;
    let websiteName = seedKeyword;

    if (websiteId) {
        const website = await Website.findOne({ where: { id: websiteId, userId: req.user.id } });
        if (!website) return res.status(404).json({ error: "Website not found." });
        
        domain = website.domain;
        websiteName = website.name;

        const pages = await CrawledPage.findAll({ where: { websiteId }, attributes: ['title', 'content'], limit: 20 });
        if (pages.length === 0) {
          return res.status(400).json({ error: 'No crawled data found. Please run an analysis first.' });
        }
        textToAnalyze = pages.map(p => `${p.title} ${p.content}`).join(' ');
    }

    const researcher = new KeywordResearcher();
    const researchResults = await researcher.researchKeywords(textToAnalyze, {
      language, maxSuggestions, domain, originalSeed: `Research for ${websiteName}`
    });

    res.json({ message: 'Keyword research completed successfully', research: researchResults });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete keyword research', details: error.message });
  }
});

router.post('/auto-research', async (req, res) => {
    const autoSchema = Joi.object({
      websiteId: Joi.number().required(),
      language: Joi.string().default('ro'),
      maxSuggestions: Joi.number().min(5).max(150).default(20),
      aiProvider: Joi.string().optional().allow(''),
    });
    try {
      const { error, value } = autoSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });
  
      const { websiteId, language, maxSuggestions } = value;
      const website = await Website.findOne({ where: { id: websiteId, userId: req.user.id } });
      if (!website) return res.status(404).json({ error: "Website not found." });
  
      const pages = await CrawledPage.findAll({ where: { websiteId }, limit: 25 });
      if (pages.length === 0) {
        return res.status(400).json({ error: 'No crawled data found. Please run an analysis first.' });
      }
  
      const seedText = pages.map(p => `${p.title} ${p.content}`).join(' ').substring(0, 20000);
      
      const researcher = new KeywordResearcher();
      const researchResults = await researcher.researchKeywords(seedText, {
        language, maxSuggestions, domain: website.domain, originalSeed: `Auto-research for ${website.name}`
      });
      
      const topKeywords = researchResults.keywords.filter(kw => kw.score > 60).map(kw => kw.keyword);
      if (topKeywords.length > 0) {
        const existingKeywords = await Keyword.findAll({ where: { websiteId, keyword: { [Op.in]: topKeywords } }, attributes: ['keyword'] });
        const existingSet = new Set(existingKeywords.map(k => k.keyword));
        const newKeywords = topKeywords.filter(k => !existingSet.has(k));
        
        if (newKeywords.length > 0) {
          const keywordObjects = newKeywords.map(keyword => ({ websiteId, keyword, enrichmentStatus: 'pending' }));
          await Keyword.bulkCreate(keywordObjects);
        }

        res.json({
            message: 'Auto-research completed.',
            automation: { totalProcessed: researchResults.totalFound, autoImported: newKeywords.length }
        });
      } else {
        res.json({ message: 'Auto-research completed, no high-value keywords found to import.', automation: { totalProcessed: researchResults.totalFound, autoImported: 0 } });
      }
    } catch (error) {
      console.error('Auto keyword research error:', error);
      res.status(500).json({ error: 'Failed to complete auto-research', details: error.message });
    }
  });

router.get('/', async (req, res) => {
  try {
    const userWebsites = await Website.findAll({ where: { userId: req.user.id }, attributes: ['id'] });
    const websiteIds = userWebsites.map(w => w.id);
    if (websiteIds.length === 0) {
      return res.json({ keywords: [] });
    }

    const keywords = await Keyword.findAll({
      where: { websiteId: { [Op.in]: websiteIds }, isTracking: true },
      include: [{ model: Website, as: 'website', attributes: ['id', 'domain', 'name'] }],
      order: [['created_at', 'DESC']]
    });
    res.json({ keywords });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch keywords', details: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { error, value } = keywordSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { websiteId, keyword } = value;
    const website = await Website.findOne({ where: { id: websiteId, userId: req.user.id } });
    if (!website) return res.status(404).json({ error: 'Website not found' });

    const existingKeyword = await Keyword.findOne({ where: { websiteId, keyword: keyword.toLowerCase().trim() } });
    if (existingKeyword) return res.status(409).json({ error: 'Keyword already exists for this website' });

    const newKeyword = await Keyword.create({ ...value, keyword: keyword.toLowerCase().trim(), enrichmentStatus: 'pending' });
    KeywordService.enrichKeyword(newKeyword);
    
    res.status(201).json({ message: 'Keyword added. Data enrichment is in progress.', keyword: newKeyword });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add keyword' });
  }
});

router.post('/bulk-import', async (req, res) => {
  try {
    const bulkSchema = Joi.object({
      websiteId: Joi.number().integer().positive().required(),
      keywords: Joi.array().items(Joi.string().min(1).max(500)).min(1).max(200).required()
    });
    const { error, value } = bulkSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { websiteId, keywords } = value;
    const website = await Website.findOne({ where: { id: websiteId, userId: req.user.id } });
    if (!website) return res.status(404).json({ error: 'Website not found' });
    
    const existingKeywords = await Keyword.findAll({
      where: { websiteId, keyword: { [Op.in]: keywords.map(k => k.toLowerCase().trim()) } },
      attributes: ['keyword']
    });
    const existingKeywordSet = new Set(existingKeywords.map(k => k.keyword));
    const newKeywordsToCreate = keywords.map(k => k.toLowerCase().trim()).filter(k => !existingKeywordSet.has(k) && k.length > 0);

    if (newKeywordsToCreate.length === 0) {
      return res.status(200).json({ message: 'All provided keywords already exist.', imported: 0, skipped: keywords.length });
    }
    
    const keywordObjects = newKeywordsToCreate.map(keyword => ({ websiteId, keyword, enrichmentStatus: 'pending' }));
    const createdKeywords = await Keyword.bulkCreate(keywordObjects, { returning: true });

    KeywordService.enrichKeywords(createdKeywords);

    res.status(201).json({
      message: `Successfully imported ${newKeywordsToCreate.length} new keywords. Data enrichment is in progress.`,
      imported: newKeywordsToCreate.length,
      skipped: keywords.length - newKeywordsToCreate.length
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Failed to import keywords' });
  }
});

router.put('/:id', async (req, res) => {
    try {
      const keyword = await Keyword.findOne({
        where: { id: req.params.id },
        include: [{ model: Website, as: 'website', where: { userId: req.user.id } }]
      });
      if (!keyword) return res.status(404).json({ error: 'Keyword not found' });
  
      const updateSchema = Joi.object({ isTracking: Joi.boolean().optional() });
      const { error, value } = updateSchema.validate(req.body);
      if (error) return res.status(400).json({ error: error.details[0].message });
  
      await keyword.update(value);
      res.json({ message: 'Keyword updated successfully', keyword });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update keyword' });
    }
});
  
router.delete('/:id', async (req, res) => {
    try {
      const keyword = await Keyword.findOne({
        where: { id: req.params.id },
        // Ne asigurăm că user-ul deține keyword-ul prin asocierea cu Website
        include: [{ model: Website, as: 'website', where: { userId: req.user.id }, attributes: [] }]
      });

      if (!keyword) {
        return res.status(404).json({ error: 'Keyword not found or you do not have permission to delete it.' });
      }
  
      await keyword.destroy();
      res.json({ message: 'Keyword deleted successfully.' });
    } catch (error) {
      console.error('Delete keyword error:', error);
      res.status(500).json({ error: 'Failed to delete keyword' });
    }
});


module.exports = router;