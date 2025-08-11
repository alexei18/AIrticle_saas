const express = require('express');
const { Website } = require('../models');
const { authenticateToken } = require('../middleware/auth');
// MODIFICAT: Importăm obiectul întreg
const analysisQueue = require('../services/analysisQueue');

const router = express.Router();
router.use(authenticateToken);

router.post('/deep-analysis/:websiteId', async (req, res) => {
    try {
        const { websiteId } = req.params;
        const website = await Website.findOne({ where: { id: websiteId, userId: req.user.id } });
        if (!website) {
            return res.status(404).json({ error: 'Website not found.' });
        }

        // MODIFICAT: Apelăm funcția corectă din obiect
        await analysisQueue.addDeepAnalysisJob(website);

        res.status(202).json({ message: 'Deep SEO analysis has been queued and will start shortly.' });

    } catch (error) {
        console.error('Failed to queue deep analysis:', error);
        res.status(500).json({ error: 'Failed to queue deep analysis.' });
    }
});

module.exports = router;