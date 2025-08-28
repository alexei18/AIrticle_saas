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
    
    const pagesToAnalyze = allProcessedPages.filter(p => {
        // Include pages without errors OR pages with partial/fallback success
        return (!p.error && !p.errorType) || 
               (p.errorType === 'PARTIAL_SUCCESS') || 
               (p.errorType === 'FALLBACK_SUCCESS');
    });
    
    if (pagesToAnalyze.length > 0) {
        const analyzer = new WebsiteAnalyzer();
        const aiGenerator = new AIContentGenerator();
        
        console.log(`[Queue] Starting analysis for ${pagesToAnalyze.length} valid pages...`);

        const pageAnalysisPromises = pagesToAnalyze.map(async (pageData) => {
          // Handle partial success cases differently
          if (pageData.errorType === 'PARTIAL_SUCCESS' || pageData.errorType === 'FALLBACK_SUCCESS') {
              console.log(`[Queue] Processing ${pageData.errorType} page: ${pageData.url}`);
              return { 
                  ...pageData, 
                  websiteId: website.id, 
                  seoScore: 30, // Give partial pages a base score
                  issues: [pageData.error || 'Partial content extraction'],
                  aiRecommendations: ['Consider fixing JavaScript errors to improve content accessibility'] 
              };
          }
          
          const quantitativeAnalysis = await analyzer.analyzePage(pageData.url, browser);
          
          if (quantitativeAnalysis.error) {
              return { 
                  ...pageData, 
                  websiteId: website.id, 
                  seoScore: 0, 
                  issues: [quantitativeAnalysis.error], 
                  aiRecommendations: [] 
              };
          }
          
          const qualitativeAnalysis = await aiGenerator.analyzePageQuality(quantitativeAnalysis);
          
          const combinedScore = Math.round((quantitativeAnalysis.quantitativeScore * 0.4) + (qualitativeAnalysis.score * 0.6));
          
          return { 
              ...pageData, 
              websiteId: website.id, 
              seoScore: combinedScore, 
              issues: quantitativeAnalysis.issues,
              suggestions: quantitativeAnalysis.suggestions, // ADĂUGAT
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
            
            // Insert in batches to avoid max_allowed_packet error
            const batchSize = 10;
            for (let i = 0; i < successfullyAnalyzedPages.length; i += batchSize) {
                const batch = successfullyAnalyzedPages.slice(i, i + batchSize);
                console.log(`[Queue] 💾 Inserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(successfullyAnalyzedPages.length/batchSize)} (${batch.length} pages)`);
                
                try {
                    await CrawledPage.bulkCreate(batch);
                } catch (error) {
                    console.error(`[Queue] ❌ Failed to insert batch ${Math.floor(i/batchSize) + 1}:`, error.message);
                    // Try inserting one by one if batch fails
                    for (const page of batch) {
                        try {
                            await CrawledPage.create(page);
                        } catch (singleError) {
                            console.error(`[Queue] ❌ Failed to insert single page ${page.url}:`, singleError.message);
                        }
                    }
                }
            }
            console.log(`[Queue] ✅ Pages saved successfully.`);
        } else {
            console.warn('[Queue] No pages were successfully analyzed to be saved.');
        }


        const totalOnPageScore = successfullyAnalyzedPages.reduce((sum, p) => sum + (p.seoScore || 0), 0);
        const avgOnPageScore = successfullyAnalyzedPages.length > 0 ? Math.round(totalOnPageScore / successfullyAnalyzedPages.length) : 0;
        
        const overallScore = avgOnPageScore;
        const issueList = successfullyAnalyzedPages.flatMap(p => p.issues || []);
        const technicalIssues = issueList.filter(issue => issue && (issue.toLowerCase().includes('tehnic') || issue.toLowerCase().includes('critic')));
        const contentIssues = issueList.filter(issue => issue && issue.toLowerCase().includes('conținut'));
        const recommendations = await aiGenerator.generateDomainRecommendations({
            totalPages: successfullyAnalyzedPages.length, avgOnPageScore,
            technicalIssues, contentIssues
        });
        await Analysis.create({
          websiteId: website.id, overallScore,
          technicalReport: { score: avgOnPageScore, issues: technicalIssues },
          contentReport: { score: avgOnPageScore, issues: contentIssues },
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