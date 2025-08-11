const express = require('express');
const Joi = require('joi');
const { Website, GoogleAnalyticsConnection } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const googleAnalyticsService = require('../services/googleAnalyticsService');
const { Op } = require('sequelize');

const router = express.Router();
router.use(authenticateToken);

router.get('/status', async (req, res) => {
  try {
    // MODIFICAT: Specificăm explicit coloanele pentru a evita eroarea de nume
    const connection = await GoogleAnalyticsConnection.findOne({
      where: { '$website.user_id$': req.user.id },
      include: [{ model: Website, as: 'website', attributes: [] }],
      attributes: ['id', 'is_active', 'created_at'] // Folosim numele reale ale coloanelor
    });

    const websitesWithConnection = await GoogleAnalyticsConnection.findAll({
        where: { '$website.user_id$': req.user.id },
        include: [{ model: Website, as: 'website', attributes: ['id', 'name']}],
        attributes: ['websiteId', 'gaPropertyId']
    });

    res.json({
      connected: !!connection,
      active: connection?.isActive || false,
      mappings: websitesWithConnection.map(c => ({ websiteId: c.websiteId, gaPropertyId: c.gaPropertyId }))
    });
  } catch (error) {
    console.error('GA Status Error:', error.message);
    res.status(500).json({ error: 'Failed to check GA status' });
  }
});

router.post('/connect', async (req, res) => {
  try {
    const authUrl = googleAnalyticsService.getAuthUrl(req.user.id);
    res.json({ authUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start GA connection' });
  }
});

router.post('/callback', async (req, res) => {
    const { code, state: userId } = req.body;
    if (req.user.id !== parseInt(userId)) {
        return res.status(403).json({ error: 'User mismatch' });
    }
    const userWebsite = await Website.findOne({ where: { userId: req.user.id } });
    if (!userWebsite) {
        return res.status(400).json({ error: 'You must add at least one website before connecting to Google Analytics.' });
    }
    try {
        await googleAnalyticsService.exchangeCodeForTokens(code, userWebsite.id);
        res.json({ message: 'Google Analytics connected successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to connect Google Analytics.' });
    }
});


router.get('/properties', async (req, res) => {
    try {
        const connection = await GoogleAnalyticsConnection.findOne({
            where: { '$website.user_id$': req.user.id },
            include: [{ model: Website, as: 'website' }],
        });
        if (!connection || !connection.accessToken) {
            return res.status(400).json({ error: 'Google Analytics not connected for this user.' });
        }
        googleAnalyticsService.oauth2Client.setCredentials({
            access_token: connection.accessToken,
            refresh_token: connection.refreshToken,
        });
        const properties = await googleAnalyticsService.getAccountProperties();
        res.json({ properties });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch GA properties' });
    }
});

router.post('/match-properties', async (req, res) => {
    const schema = Joi.object({
        matches: Joi.object().pattern(Joi.number(), Joi.string().required())
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    try {
        const { matches } = value;
        const websiteIds = Object.keys(matches).map(id => parseInt(id));
        const userWebsites = await Website.findAll({ where: { userId: req.user.id, id: { [Op.in]: websiteIds } }});
        if (userWebsites.length !== websiteIds.length) {
            return res.status(403).json({ error: 'Attempt to match unauthorized websites.' });
        }

        const connection = await GoogleAnalyticsConnection.findOne({
            where: { '$website.user_id$': req.user.id },
            include: [{ model: Website, as: 'website' }],
        });
        if (!connection) return res.status(400).json({ error: 'No active Google connection found.' });

        const operations = Object.entries(matches).map(([websiteId, gaPropertyId]) => {
            return GoogleAnalyticsConnection.upsert({
                websiteId: parseInt(websiteId),
                gaPropertyId,
                accessToken: connection.accessToken,
                refreshToken: connection.refreshToken,
                tokenExpiresAt: connection.tokenExpiresAt,
                isActive: true,
            });
        });

        await Promise.all(operations);
        res.json({ message: 'Property mappings saved successfully.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save mappings.' });
    }
});


router.post('/sync/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;
    const website = await Website.findOne({ where: { id: websiteId, userId: req.user.id } });
    if (!website) return res.status(404).json({ error: 'Website not found' });

    await googleAnalyticsService.fetchAnalyticsData(websiteId);
    res.json({ message: 'Analytics data synced successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to sync analytics data' });
  }
});

router.delete('/disconnect', async (req, res) => {
    try {
      const userWebsites = await Website.findAll({ where: { userId: req.user.id }, attributes: ['id'] });
      const websiteIds = userWebsites.map(w => w.id);
      await GoogleAnalyticsConnection.destroy({ where: { websiteId: { [Op.in]: websiteIds } } });
      res.json({ message: 'Google Analytics disconnected successfully.' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to disconnect GA.' });
    }
  });

module.exports = router;