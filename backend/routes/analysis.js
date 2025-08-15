const express = require('express');
const { Website, Analysis, CrawledPage } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const analysisQueue = require('../services/analysisQueue'); // Folosim obiectul corect exportat
const AIContentGenerator = require('../services/aiContentGenerator'); // Necesar pentru research

const router = express.Router();
router.use(authenticateToken);

// Pornește un crawl general și o analiză on-page
router.post('/trigger', async (req, res) => {
    try {
        const { websiteId } = req.body;
        if (!websiteId) return res.status(400).json({ error: 'websiteId is required' });
        const website = await Website.findOne({ where: { id: websiteId, userId: req.user.id } });
        if (!website) return res.status(404).json({ error: 'Website not found.' });

        // Apelăm funcția corectă din obiectul importat
        await analysisQueue.addGeneralCrawlJob(website, req.body);

        res.status(202).json({ message: 'Analysis initiated.', status: 'crawling' });
    } catch (error) {
        console.error('Failed to queue analysis job:', error);
        res.status(500).json({ error: 'Failed to initiate analysis.' });
    }
});

// Preia ultimul raport de analiză pentru un website
router.get('/latest/:websiteId', async (req, res) => {
    try {
        const { websiteId } = req.params;
        const latestAnalysis = await Analysis.findOne({ where: { websiteId }, order: [['created_at', 'DESC']] });
        if (!latestAnalysis) return res.status(404).json({ error: 'No analysis found yet.' });
        
        const responseData = latestAnalysis.toJSON();
        // Parsează câmpurile JSON stocate ca text
        for (const key of ['technicalReport', 'contentReport', 'semrushReport', 'recommendations']) {
            if (typeof responseData[key] === 'string') {
                try { 
                    responseData[key] = JSON.parse(responseData[key]); 
                } catch (e) { 
                    responseData[key] = null; 
                }
            }
        }
        res.json({ analysis: responseData });
    } catch (error) {
        console.error('Failed to fetch latest analysis:', error);
        res.status(500).json({ error: 'Failed to fetch analysis' });
    }
});

// Preia toate paginile crawl-uite pentru un website
router.get('/:websiteId/crawled-pages', async (req, res) => {
    const parseCrawledPageJSON = (page) => {
        const data = page.toJSON();
        ['issues', 'headings', 'aiRecommendations', 'suggestions'].forEach(key => {
            if (typeof data[key] === 'string') {
                try { data[key] = JSON.parse(data[key]); } catch (e) { data[key] = []; }
            }
            if (!Array.isArray(data[key])) data[key] = [];
        });
        return data;
    };
    try {
        const { websiteId } = req.params;
        const pages = await CrawledPage.findAll({ where: { websiteId }, order: [['seo_score', 'ASC']] });
        // Filtrează paginile care au eșuat din cauza problemelor de conexiune
        const validPages = pages.filter(page => {
            const data = page.toJSON();
            return !data.error || data.errorType !== 'CONNECTION_ERROR';
        });
        res.json({ pages: validPages.map(parseCrawledPageJSON) });
    } catch (error) {
        console.error('Failed to fetch crawled pages:', error);
        res.status(500).json({ error: 'Failed to fetch crawled pages' });
    }
});

// Endpoint pentru keyword research bazat pe conținutul site-ului
router.post('/:websiteId/keyword-research', async (req, res) => {
    try {
        const { websiteId } = req.params;
        const { language = 'ro' } = req.body;
        
        const website = await Website.findOne({ where: { id: websiteId, userId: req.user.id } });
        if (!website) return res.status(404).json({ error: 'Website not found.' });

        const pages = await CrawledPage.findAll({ 
            where: { websiteId }, 
            attributes: ['title', 'headings', 'url', 'metaDescription'],
            limit: 50 
        });
        
        if (pages.length === 0) {
            return res.status(400).json({ error: 'No crawled pages found. Please run analysis first.' });
        }

        const pageContext = pages.map(p => ({
            title: p.title,
            headings: typeof p.headings === 'string' ? JSON.parse(p.headings || '[]') : p.headings || [],
            url: p.url,
            metaDescription: p.metaDescription
        }));

        const aiGenerator = new AIContentGenerator();
        console.log(`[Keyword Research] Starting research for ${website.domain}`);
        
        const keywordReport = await aiGenerator.generateKeywordResearchReport(
            website.domain, 
            pageContext, 
            { language }
        );

        if (keywordReport.error) {
            return res.status(500).json({ error: keywordReport.error });
        }

        res.json({ 
            keywordResearch: keywordReport,
            websiteDomain: website.domain,
            pagesAnalyzed: pages.length
        });
    } catch (error) {
        console.error('[Keyword Research Endpoint] Error:', error.message);
        res.status(500).json({ error: 'Failed to generate keyword research report' });
    }
});

// Endpoint pentru analiza competitorilor pe un anumit keyword
router.post('/:websiteId/competitor-keywords', async (req, res) => {
    try {
        const { websiteId } = req.params;
        const { keyword, language = 'ro' } = req.body;
        
        if (!keyword) {
            return res.status(400).json({ error: 'Keyword is required' });
        }

        const website = await Website.findOne({ where: { id: websiteId, userId: req.user.id } });
        if (!website) return res.status(404).json({ error: 'Website not found.' });
        
        const aiGenerator = new AIContentGenerator();
        const competitorAnalysis = await aiGenerator.serpApi.getCompetitorAnalysis(
            website.domain, 
            keyword, 
            { language, country: 'ro' }
        );

        if (!competitorAnalysis) {
            return res.status(500).json({ error: 'Failed to get competitor analysis' });
        }

        const relatedKeywords = await aiGenerator.serpApi.getRelatedKeywords(keyword, { language, country: 'ro' });

        res.json({ 
            keyword,
            domain: website.domain,
            competitorAnalysis,
            relatedKeywords: relatedKeywords.slice(0, 15)
        });
    } catch (error) {
        console.error('[Competitor Keywords Endpoint] Error:', error.message);
        res.status(500).json({ error: 'Failed to get competitor keywords' });
    }
});


module.exports = router;