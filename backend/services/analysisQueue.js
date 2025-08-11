const Queue = require('bull');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const WebsiteAnalyzer = require('../services/websiteAnalyzer');
const PageExtractor = require('./pageExtractor');
const RecursiveCrawler = require('./recursiveCrawler');
const AIContentGenerator = require('./aiContentGenerator');
const SEOService = require('./seoService');
const { Website, Analysis, CrawledPage } = require('../models');

const analysisQueue = new Queue('seo-analysis', process.env.REDIS_URL || 'redis://127.0.0.1:6379');

analysisQueue.process('general-crawl', async (job) => {
  const { websiteData, options } = job.data;
  console.log(`[Queue] Processing general crawl for ${websiteData.domain}`);

  const website = await Website.findByPk(websiteData.id);
  if (!website) {
    throw new Error(`Website with ID ${websiteData.id} not found.`);
  }
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu'],
    ignoreHTTPSErrors: true 
  });

  try {
    await website.update({ crawlStatus: 'crawling', lastCrawledAt: new Date() });

    const extractor = new PageExtractor();
    const crawler = new RecursiveCrawler(extractor);
    const allProcessedPages = await crawler.crawl(`https://${website.domain}`);
    
    if (allProcessedPages.length === 0) {
      throw new Error("Crawler could not access or process any pages from the website.");
    }
    
    const pagesToAnalyze = allProcessedPages.filter(p => !p.error && !p.errorType);
    
    if (pagesToAnalyze.length > 0) {
        const analyzer = new WebsiteAnalyzer();
        const aiGenerator = new AIContentGenerator();
        
        console.log(`[Queue] Starting analysis for ${pagesToAnalyze.length} valid pages...`);

        const pageAnalysisPromises = pagesToAnalyze.map(async (pageData) => {
          const quantitativeAnalysis = await analyzer.analyzePage(pageData.url, browser);
          
          if (quantitativeAnalysis.error) {
              return { ...pageData, seoScore: 0, issues: [quantitativeAnalysis.error], aiRecommendations: [] };
          }
          
          const qualitativeAnalysis = await aiGenerator.analyzePageQuality(quantitativeAnalysis);
          
          const combinedScore = Math.round((quantitativeAnalysis.quantitativeScore * 0.4) + (qualitativeAnalysis.score * 0.6));
          
          return { 
              ...pageData, 
              websiteId: website.id, 
              seoScore: combinedScore, 
              issues: quantitativeAnalysis.issues,
              aiRecommendations: qualitativeAnalysis.recommendations
          };
        });

        // MODIFICAT: Folosim Promise.allSettled
        const results = await Promise.allSettled(pageAnalysisPromises);
        
        const successfullyAnalyzedPages = [];
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successfullyAnalyzedPages.push(result.value);
            } else {
                console.error(`[Queue] Analysis failed for page ${pagesToAnalyze[index].url}:`, result.reason);
            }
        });

        if (successfullyAnalyzedPages.length > 0) {
            console.log(`[Queue] 💾 Saving ${successfullyAnalyzedPages.length} analyzed pages to the database...`);
            await CrawledPage.destroy({ where: { websiteId: website.id } });
            await CrawledPage.bulkCreate(successfullyAnalyzedPages);
            console.log(`[Queue] ✅ Pages saved successfully.`);
        } else {
            console.warn('[Queue] No pages were successfully analyzed to be saved.');
        }


        const totalOnPageScore = successfullyAnalyzedPages.reduce((sum, p) => sum + (p.seoScore || 0), 0);
        const avgOnPageScore = successfullyAnalyzedPages.length > 0 ? Math.round(totalOnPageScore / successfullyAnalyzedPages.length) : 0;
        
        const domainAnalysisResult = await analyzer.analyzeDomain(website.domain, options.language);
        const overallScore = Math.round((avgOnPageScore * 0.6) + ((domainAnalysisResult?.score || 0) * 0.4));
        const issueList = successfullyAnalyzedPages.flatMap(p => p.issues || []);
        const technicalIssues = issueList.filter(issue => issue && (issue.toLowerCase().includes('tehnic') || issue.toLowerCase().includes('critic')));
        const contentIssues = issueList.filter(issue => issue && issue.toLowerCase().includes('conținut'));
        const recommendations = await aiGenerator.generateDomainRecommendations({
            totalPages: successfullyAnalyzedPages.length, avgOnPageScore,
            semrushScore: domainAnalysisResult?.score,
            technicalIssues, contentIssues
        });
        await Analysis.create({
          websiteId: website.id, overallScore,
          technicalReport: { score: avgOnPageScore, issues: technicalIssues },
          contentReport: { score: avgOnPageScore, issues: contentIssues },
          semrushReport: domainAnalysisResult.data,
          recommendations,
        });
    } else {
        console.warn(`[Queue] No valid pages found for ${website.domain} to analyze. Saving empty report.`);
        await CrawledPage.destroy({ where: { websiteId: website.id } });
        await Analysis.create({
            websiteId: website.id, overallScore: 0,
            technicalReport: { score: 0, issues: ["All pages failed to analyze. The website might have client-side errors on all pages or connectivity issues."] },
            contentReport: { score: 0, issues: [] },
            recommendations: [{ title: "Investigation Required", description: "The crawler could access the website but failed to fully analyze any pages, likely due to JavaScript errors or connectivity problems. Manual review is recommended."}]
        });
    }

    await website.update({ crawlStatus: 'completed' });
    console.log(`[Queue] ✅ General crawl finished for ${website.domain}`);
  } catch (error) {
    console.error(`[Queue] ❌ General crawl FAILED for ${website.domain}:`, error.message);
    if (website) {
      await website.update({ crawlStatus: 'failed' });
    }
    throw error;
  } finally {
      if (browser) await browser.close();
  }
});

analysisQueue.process('deep-analysis', async (job) => {
    const { websiteData } = job.data;
    console.log(`[Queue] Processing deep analysis for ${websiteData.domain}`);
    const website = await Website.findByPk(websiteData.id);
    if (!website) {
        throw new Error(`Website with ID ${websiteData.id} not found.`);
    }
    await SEOService.runDeepAnalysis(website);
});

module.exports = {
  queue: analysisQueue,
  addGeneralCrawlJob: async (website, options = {}) => {
    await analysisQueue.add('general-crawl', { websiteData: website.toJSON(), options });
  },
  addDeepAnalysisJob: async (website) => {
    const websiteData = website.toJSON();
    await analysisQueue.add('general-crawl', { websiteData, options: {} });
    await analysisQueue.add('deep-analysis', { websiteData });
  }
};