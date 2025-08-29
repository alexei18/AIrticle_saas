const { URL } = require('url');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios'); // Adăugat
const { normalizeUrl } = require('../utils/urlUtils');
puppeteer.use(StealthPlugin());

class RecursiveCrawler {
    constructor(extractor) {
        this.extractor = extractor;
        this.maxConcurrentRequests = 5;
        this.maxPagesToCrawl = 1000; // MODIFICAT: Mărit la 1000
        this.PRODUCT_URL_LIMIT = 500;
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

    // Enhanced pattern detection for similar URLs
    getAdvancedUrlPattern(url) {
        try {
            const urlObj = new URL(url);
            let path = urlObj.pathname;
            
            // Replace various dynamic patterns with placeholders
            path = path
                // Replace article/blog IDs: article-content-1753801451108-5-0.12757724072025223
                .replace(/article-content-\d+-\d+-[\d.]+/g, 'article-content-[id]')
                // Replace blog post IDs: blog-post-123, post-456
                .replace(/(blog-post-|post-)\d+/g, '$1[id]')
                // Replace product IDs: product-123, item-456
                .replace(/(product-|item-|p)\d+/g, '$1[id]')
                // Replace category IDs: category-123
                .replace(/category-\d+/g, 'category-[id]')
                // Replace user IDs: user-123, profile-456
                .replace(/(user-|profile-|u)\d+/g, '$1[id]')
                // Replace UUIDs and long IDs
                .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[uuid]')
                .replace(/[a-zA-Z0-9]{20,}/g, '[hash]')
                // Replace pure numbers in paths
                .replace(/\/\d{4,}/g, '/[id]')
                // Replace date patterns: 2023/12/25, 2023-12-25
                .replace(/\/\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/g, '/[date]')
                // Replace slugs (long alphanumeric strings with dashes)
                .replace(/\/[a-zA-Z0-9]+-[a-zA-Z0-9-]{5,}/g, '/[slug]');
            
            return path;
        } catch (e) {
            return url;
        }
    }

    // Check if we should skip this URL due to pattern limits
    shouldSkipUrlByPattern(url, patternCounts, maxSimilarPages = 50) {
        const pattern = this.getAdvancedUrlPattern(url);
        const currentCount = patternCounts.get(pattern) || 0;
        
        if (currentCount >= maxSimilarPages) {
            return {
                skip: true,
                reason: `Pattern limit exceeded (${currentCount}/${maxSimilarPages}) for pattern: ${pattern}`
            };
        }
        
        return { skip: false };
    }

    async crawl(startUrl) {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu'],
            ignoreHTTPSErrors: true 
        });

        // MODIFICAT: Declarăm patternCounts aici pentru a fi în scope-ul corect
        const patternCounts = new Map();
        const normalizedStartUrl = normalizeUrl(startUrl);

        try {
            const queue = [normalizedStartUrl]; // MODIFICAT: Coada conține doar URL-uri
            const crawledUrls = new Set([normalizedStartUrl]);
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
                    // Enhanced pattern checking with smart limiting
                    const skipCheck = this.shouldSkipUrlByPattern(url, patternCounts, 50);
                    if (skipCheck.skip) {
                        console.warn(`[Crawler] ⚠️ Skipping URL: ${skipCheck.reason}`);
                        return null;
                    }

                    // Update pattern count
                    const pattern = this.getAdvancedUrlPattern(url);
                    const currentCount = patternCounts.get(pattern) || 0;
                    patternCounts.set(pattern, currentCount + 1);
                    
                    // Log pattern info for first few URLs of each type
                    if (currentCount === 0) {
                        console.log(`[Crawler] 📊 New URL pattern detected: ${pattern}`);
                    } else if (currentCount === 1) {
                        console.log(`[Crawler] 📊 Pattern ${pattern} - analyzing second instance`);
                    } else if (currentCount === 10) {
                        console.log(`[Crawler] 📊 Pattern ${pattern} - 10 similar URLs found, continuing to limit of 50`);
                    }

                    console.log(`[Crawler] ➡️ Crawling: ${url} (pattern: ${pattern}, count: ${currentCount + 1})`);
                    
                    // Pass information about similar pages to optimize extraction
                    const isSimilarPage = currentCount > 5; // After 5 similar pages, use faster extraction
                    const pageData = await this.extractor.extract(url, browser, isSimilarPage);
                    
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
                        const normalizedLink = normalizeUrl(link);
                        if (this.isValidUrl(normalizedLink) && !crawledUrls.has(normalizedLink)) {
                            // Filtrare suplimentară: dacă extractor-ul detectează limba, skipează URL-urile fără limbă
                            if (this.extractor.languageDetector && this.extractor.languageDetector.siteLanguagePattern) {
                                const hasLanguage = this.extractor.languageDetector.detectLanguageInUrl(normalizedLink);
                                if (!hasLanguage) {
                                    console.log(`[Crawler] 🚫 Skipping URL without language: ${normalizedLink} (site uses: ${this.extractor.languageDetector.siteLanguagePattern})`);
                                    return;
                                }
                            }
                            
                            crawledUrls.add(normalizedLink);
                            nextLinks.push(normalizedLink);
                        } else if (!this.isValidUrl(normalizedLink)) {
                            console.warn(`[Crawler] 🚫 Invalid URL found and skipped: ${normalizedLink}`);
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
            
            const validPages = allProcessedPages.filter(p => 
                !p.error || p.errorType === 'PARTIAL_SUCCESS' || p.errorType === 'FALLBACK_SUCCESS'
            );
            
            // Log pattern statistics
            console.log(`[Crawler] 📊 Pattern Analysis Summary:`);
            const sortedPatterns = Array.from(patternCounts.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10); // Top 10 most common patterns
                
            sortedPatterns.forEach(([pattern, count]) => {
                const status = count >= 50 ? '🚫 LIMITED' : '✅ ALLOWED';
                console.log(`[Crawler] 📊 ${status} ${pattern}: ${count} URLs`);
            });
            
            console.log(`[Crawler] ✅ Finished crawl. Processed ${allProcessedPages.length} pages, found ${validPages.length} valid pages.`);
            return allProcessedPages;
        } finally {
            console.log('[Crawler] Closing browser instance.');
            await browser.close();
        }
    }
}

module.exports = RecursiveCrawler;