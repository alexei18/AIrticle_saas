const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth'); // MODIFICAT: Destructurăm importul
const AiSuggestionsService = require('../services/aiSuggestionsService');
const { Website, CrawledPage } = require('../models');

// Toate rutele de aici necesită autentificare
router.use(authenticateToken); // MODIFICAT: Folosim funcția corectă

/**
 * @route   GET /api/ai-suggestions/sitemap/:websiteId
 * @desc    Generează sitemap.xml pentru un website
 * @access  Private
 */
router.get('/sitemap/:websiteId', async (req, res) => {
  try {
    const website = await Website.findOne({ 
      where: { id: req.params.websiteId, userId: req.user.id } 
    });

    if (!website) {
      return res.status(404).json({ msg: 'Website not found or access denied' });
    }

    const sitemapXml = await AiSuggestionsService.generateSitemap(req.params.websiteId);
    res.header('Content-Type', 'application/xml');
    res.send(sitemapXml);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

/**
 * @route   GET /api/ai-suggestions/schema/:pageId
 * @desc    Generează Schema.org JSON-LD pentru o pagină
 * @access  Private
 */
router.get('/schema/:pageId', async (req, res) => {
  try {
    const page = await CrawledPage.findByPk(req.params.pageId);
    if (!page) {
      return res.status(404).json({ msg: 'Page not found' });
    }

    // Verificăm dacă utilizatorul are acces la website-ul asociat paginii
    const website = await Website.findOne({
      where: { id: page.websiteId, userId: req.user.id }
    });

    if (!website) {
      return res.status(403).json({ msg: 'Access denied to this resource' });
    }

    const schemaJson = await AiSuggestionsService.generateSchema(req.params.pageId);
    if (!schemaJson) {
      return res.status(500).json({ msg: 'Failed to generate schema' });
    }
    
    res.json(schemaJson);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
