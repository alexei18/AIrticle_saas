const express = require('express');
const Joi = require('joi');
const { Website, Keyword, Article, Analysis } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// MODIFICAT: Schema Joi folosește o validare mai strictă pentru domenii
const websiteSchema = Joi.object({
  domain: Joi.string().domain({ tlds: { allow: true } }).required()
    .messages({
      'string.domain': 'Domeniul introdus nu are un format valid (ex: exemplu.com)',
      'string.empty': 'Numele domeniului este obligatoriu'
    }),
  name: Joi.string().min(1).max(255).required()
});

// Get all user websites with stats
router.get('/', async (req, res) => {
  try {
    const websites = await Website.findAll({
      where: { userId: req.user.id },
      include: [
        { model: Keyword, as: 'keywords', attributes: ['id', 'isTracking'] },
        { model: Article, as: 'articles', attributes: ['id', 'status'] }
      ],
      order: [['created_at', 'DESC']]
    });

    const websitesWithStats = websites.map(website => {
      const plainWebsite = website.toJSON();
      return {
        ...plainWebsite,
        stats: {
          totalKeywords: plainWebsite.keywords?.length || 0,
          trackingKeywords: plainWebsite.keywords?.filter(k => k.isTracking)?.length || 0,
          totalArticles: plainWebsite.articles?.length || 0,
          publishedArticles: plainWebsite.articles?.filter(a => a.status === 'published')?.length || 0
        }
      };
    });

    res.json({ websites: websitesWithStats });
  } catch (error) {
    console.error('❌ Fetch websites error:', error);
    res.status(500).json({ error: 'Failed to fetch websites' });
  }
});

// Get a single website by ID with stats
router.get('/:id', async (req, res) => {
  try {
    const website = await Website.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        { model: Keyword, as: 'keywords', required: false, attributes: ['id', 'isTracking'] },
        { model: Article, as: 'articles', required: false, attributes: ['id', 'status'] }
      ]
    });

    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }
    
    const plainWebsite = website.toJSON();
    plainWebsite.stats = {
        totalKeywords: plainWebsite.keywords?.length || 0,
        trackingKeywords: plainWebsite.keywords?.filter(k => k.isTracking)?.length || 0,
        totalArticles: plainWebsite.articles?.length || 0,
        publishedArticles: plainWebsite.articles?.filter(a => a.status === 'published')?.length || 0
    };

    res.json({ website: plainWebsite });
  } catch (error) {
    console.error('Fetch website error:', error);
    res.status(500).json({ error: 'Failed to fetch website' });
  }
});

// Add a new website
router.post('/', async (req, res) => {
  try {
    const { error, value } = websiteSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // MODIFICAT: Normalizăm domeniul pentru a elimina protocoale, www, etc.
    const normalizedDomain = value.domain.toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .trim();

    const { name } = value;
    const existingWebsite = await Website.findOne({ where: { domain: normalizedDomain, userId: req.user.id } });
    if (existingWebsite) {
      return res.status(409).json({ error: 'You have already added this website.' });
    }

    const userWebsiteCount = await Website.count({ where: { userId: req.user.id } });
    const planLimits = { starter: 3, professional: 15, enterprise: 999 };
    if (userWebsiteCount >= (planLimits[req.user.planType] || 3)) {
      return res.status(403).json({ error: 'Website limit reached for your current plan.' });
    }

    const website = await Website.create({
      userId: req.user.id,
      domain: normalizedDomain,
      name,
      crawlStatus: 'pending'
    });

    res.status(201).json({ message: 'Website added successfully. Analysis will begin shortly.', website });
  } catch (error) {
    console.error('Add website error:', error);
    res.status(500).json({ error: 'Failed to add website.' });
  }
});

// Update a website
router.put('/:id', async (req, res) => {
  try {
    const website = await Website.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const updateSchema = Joi.object({
      name: Joi.string().min(1).max(255).optional(),
      domain: Joi.string().domain({ tlds: { allow: true } }).optional()
    });
    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    if (value.domain) {
        value.domain = value.domain.toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, '')
          .replace(/\/$/, '')
          .trim();
    }

    await website.update(value);
    res.json({ message: 'Website updated successfully', website });
  } catch (error) {
    console.error('Update website error:', error);
    res.status(500).json({ error: 'Failed to update website.' });
  }
});

const { getBacklinksForDomain } = require('../services/backlinkService');

// Delete a website
router.delete('/:id', async (req, res) => {
  try {
    const website = await Website.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!website) {
      return res.status(404).json({ error: 'Website not found' });
    }
    
    await website.destroy();
    
    res.json({ message: 'Website and all associated data have been deleted.' });
  } catch (error) {
    console.error('Delete website error:', error);
    res.status(500).json({ error: 'Failed to delete website.' });
  }
});

// Get backlinks for a website
router.get('/:id/backlinks', async (req, res) => {
    try {
        const website = await Website.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (!website) {
            return res.status(404).json({ error: 'Website not found' });
        }

        const backlinks = await getBacklinksForDomain(website.domain);
        res.json({ backlinks });
    } catch (error) {
        console.error('Get backlinks error:', error);
        res.status(500).json({ error: 'Failed to fetch backlinks.' });
    }
});

module.exports = router;