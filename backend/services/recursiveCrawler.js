const { URL } = require('url');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios'); // Adăugat
puppeteer.use(StealthPlugin());

class RecursiveCrawler {
    constructor(extractor) {
        this.extractor = extractor;
        this.maxConcurrentRequests = 5;
        this.maxPagesToCrawl = 1000; // MODIFICAT: Mărit la 1000
        this.PRODUCT_URL_LIMIT = 50;
    }

    isValidUrl(urlString) {
        try {
            const urlObj = new URL(urlString);
            const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
            return domainRegex.test(urlObj.hostname);
        } catch (e) {
            return false;
        }
    }

    getUrlPattern(path) {
        return path.replace(/\/\d+/g, '/[id]').replace(/\/[a-zA-Z0-9-]{10,}/g, '/[slug]');
    }

    async crawl(startUrl) {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu'],
            ignoreHTTPSErrors: true 
        });

        // MODIFICAT: Declarăm patternCounts aici pentru a fi în scope-ul corect
        const patternCounts = new Map();

        try {
            const queue = [startUrl]; // MODIFICAT: Coada conține doar URL-uri
            const crawledUrls = new Set([startUrl]);
            const allProcessedPages = [];

            // Verificare robots.txt (adăugat)
            try {
                const robotsUrl = new URL('/robots.txt', startUrl);
                const response = await axios.get(robotsUrl.href);
                if (response.status === 200) {
                    console.log(`[Crawler] ✅ robots.txt găsit pentru ${startUrl}.`);
                    // Aici s-ar putea adăuga logica de parsare a regulilor din robots.txt
                }
            } catch (error) {
                console.warn(`[Crawler] ⚠️ Nu s-a putut accesa robots.txt pentru ${startUrl}. Se continuă fără reguli.`);
            }

            while (queue.length > 0 && allProcessedPages.length < this.maxPagesToCrawl) {
                const batch = queue.splice(0, this.maxConcurrentRequests);
                console.log(`[Crawler] Processing batch of ${batch.length}. Queue: ${queue.length}. Found: ${allProcessedPages.filter(p => !p.error).length}`);

                const promises = batch.map(async (url) => {
                    const pathPattern = this.getUrlPattern(new URL(url).pathname);
                    const count = patternCounts.get(pathPattern) || 0;
                    if (count >= this.PRODUCT_URL_LIMIT) {
                        console.warn(`[Crawler] ⚠️ Skipping URL due to pattern limit: ${url}`);
                        return null;
                    }
                    patternCounts.set(pathPattern, count + 1);

                    console.log(`[Crawler] ➡️ Crawling: ${url}`);
                    const pageData = await this.extractor.extract(url, browser);
                    
                    if (!pageData) {
                        return null;
                    }
                    
                    allProcessedPages.push(pageData);

                    if (pageData.errorType === 'CONNECTION_ERROR') {
                        console.warn(`[Crawler] ⚠️ Skipping page due to CONNECTION_ERROR: ${url}`);
                        return null;
                    }

                    const newLinks = pageData.internalLinks || [];
                    const nextLinks = [];
                    newLinks.forEach(link => {
                        if (this.isValidUrl(link) && !crawledUrls.has(link)) {
                            crawledUrls.add(link);
                            nextLinks.push(link);
                        } else if (!this.isValidUrl(link)) {
                            console.warn(`[Crawler] 🚫 Invalid URL found and skipped: ${link}`);
                        }
                    });
                    return nextLinks;
                });
                
                const results = await Promise.all(promises);
                
                results.forEach(nextLinks => {
                    if (Array.isArray(nextLinks)) {
                        queue.push(...nextLinks);
                    }
                });
            }
            
            const validPages = allProcessedPages.filter(p => !p.error);
            console.log(`[Crawler] ✅ Finished crawl. Processed ${allProcessedPages.length} pages, found ${validPages.length} valid pages.`);
            return allProcessedPages;
        } finally {
            console.log('[Crawler] Closing browser instance.');
            await browser.close();
        }
    }
}

module.exports = RecursiveCrawler;