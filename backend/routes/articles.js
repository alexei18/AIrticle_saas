const express = require('express');
const Joi = require('joi');
const { Article, Website } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const AIContentGenerator = require('../services/aiContentGenerator');

const router = express.Router();
router.use(authenticateToken);

const parseArticleJSON = (article) => {
    if (!article) return article;
    const data = article.toJSON ? article.toJSON() : { ...article };
    if (typeof data.targetKeywords === 'string') {
        try { data.targetKeywords = JSON.parse(data.targetKeywords); } catch (e) { data.targetKeywords = []; }
    }
    if (!Array.isArray(data.targetKeywords)) { data.targetKeywords = []; }
    return data;
};

router.get('/', async (req, res) => {
  try {
    const result = await Article.findAndCountAll({
      where: { userId: req.user.id },
      attributes: { exclude: ['content'] },
      include: [{ model: Website, as: 'website', attributes: ['id', 'domain', 'name'] }],
      order: [['created_at', 'DESC']],
      limit: 50,
      offset: 0
    });
    res.json({ articles: result.rows.map(parseArticleJSON), total: result.count });
  } catch (error) {
    console.error('Fetch all articles error:', error);
    res.status(500).json({ error: 'Failed to fetch all articles' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const article = await Article.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: Website, as: 'website' }]
    });
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json({ article: parseArticleJSON(article) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { error, value } = Joi.object({
        websiteId: Joi.number().required(),
        title: Joi.string().required(),
        targetKeywords: Joi.array().items(Joi.string()).min(1).required(),
        siteAnalysis: Joi.object().required(),
    }).unknown(true).validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const website = await Website.findOne({ where: { id: value.websiteId, userId: req.user.id } });
    if (!website) return res.status(404).json({ error: 'Website not found' });

    const aiGenerator = new AIContentGenerator();
    const generatedContent = await aiGenerator.generateArticle({ ...value, websiteDomain: website.domain });
    
    const slug = value.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const article = await Article.create({
      websiteId: value.websiteId, userId: req.user.id, title: value.title, slug,
      content: generatedContent.content, metaTitle: generatedContent.metaTitle,
      metaDescription: generatedContent.metaDescription, targetKeywords: value.targetKeywords,
      wordCount: generatedContent.wordCount, seoScore: generatedContent.seoScore, status: 'draft'
    });
    res.status(201).json({ message: 'Article generated successfully', article: parseArticleJSON(article) });
  } catch (error) {
    console.error('Generate article error:', error);
    res.status(500).json({ error: 'Failed to generate article', details: error.message });
  }
});

router.post('/generate-bulk', async (req, res) => {
  try {
    const { error, value } = Joi.object({
      websiteId: Joi.number().required(),
      numberOfArticles: Joi.number().min(1).max(20).required(),
      siteAnalysis: Joi.object().optional(),
    }).unknown(true).validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const website = await Website.findOne({ where: { id: value.websiteId, userId: req.user.id } });
    if (!website) return res.status(404).json({ error: 'Website not found' });
    
    const aiGenerator = new AIContentGenerator();
    const options = { ...value, websiteDomain: website.domain, userId: req.user.id };
    const generatedArticlesData = await aiGenerator.generateBulkArticles(options);

    if (!generatedArticlesData || generatedArticlesData.length === 0) {
      return res.status(500).json({ error: 'AI failed to generate any articles.' });
    }

    const articlesToSave = generatedArticlesData.map(data => ({ ...data, websiteId: website.id, userId: req.user.id, status: 'draft' }));
    await Article.bulkCreate(articlesToSave);

    res.status(201).json({ message: `Successfully generated ${articlesToSave.length} articles`, totalGenerated: articlesToSave.length });
  } catch (error) {
    console.error('Bulk generate articles error:', error);
    res.status(500).json({ error: 'Failed to generate articles in bulk', details: error.message });
  }
});

router.delete('/:id', async (req, res) => {
    try {
        const article = await Article.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!article) return res.status(404).json({ error: 'Article not found' });
        await article.destroy();
        res.json({ message: 'Article deleted successfully' });
    } catch (error) {
        console.error('Delete article error:', error);
        res.status(500).json({ error: 'Failed to delete article' });
    }
});

module.exports = router;
