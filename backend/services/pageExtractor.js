const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');
const { normalizeUrl } = require('../utils/urlUtils');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const WebsiteAnalyzer = require('./websiteAnalyzer');
const LanguageDetector = require('./languageDetector');
const UrlFallbackHandler = require('./urlFallbackHandler');

class PageExtractor {
    constructor() {
        this.languageDetector = new LanguageDetector();
        this.fallbackHandler = new UrlFallbackHandler(this.languageDetector);
        this.analyzer = new WebsiteAnalyzer();
        // Sincronizăm LanguageDetector-ul între analyzer și extractor
        this.analyzer.languageDetector = this.languageDetector;
        
        this.timeout = 45000;
        this.siteAnalyzed = false; // Track if we analyzed the site structure
        this.axiosInstance = axios.create({
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' }
        });
    }

    // Reset for new site analysis
    resetForNewSite() {
        this.siteAnalyzed = false;
        this.languageDetector.reset();
        this.analyzer.resetForNewSite();
        console.log('[PageExtractor] Reset for new site analysis');
    }

    async extract(url, browser, isSimilarPage = false) {
        const normalizedUrl = normalizeUrl(url);
        const baseDomain = new URL(normalizedUrl).hostname.replace(/^www\./, '');
        let internalLinks = new Set();

        // Enhanced static extraction with redirect handling
        try {
            const response = await this.axiosInstance.get(normalizedUrl, {
                maxRedirects: 5,
                validateStatus: function (status) {
                    return status >= 200 && status < 400; // Accept redirects
                }
            });
            const staticHtml = response.data;
            const $ = cheerio.load(staticHtml);
            
            $('a[href]').each((i, el) => {
                const href = $(el).attr('href');
                if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
                try {
                    const absoluteUrl = new URL(href, response.request.res.responseUrl || normalizedUrl);
                    if (['http:', 'https:'].includes(absoluteUrl.protocol)) {
                        const cleanUrl = normalizeUrl(absoluteUrl.href);
                        if (new URL(cleanUrl).hostname.replace(/^www\./, '').endsWith(baseDomain)) {
                            
                            // Dacă am detectat că site-ul folosește limba, filtrează URL-urile fără limbă
                            if (this.languageDetector.siteLanguagePattern) {
                                const hasLanguage = this.languageDetector.detectLanguageInUrl(cleanUrl);
                                // Allow root URLs (e.g., https://domain.com) even if they don't have a language code
                                const isRootUrl = new URL(cleanUrl).pathname === '/';
                                if (!hasLanguage && !isRootUrl) {
                                    console.log(`[PageExtractor] 🚫 Filtering URL without language: ${cleanUrl} (site uses: ${this.languageDetector.siteLanguagePattern})`);
                                    return; // Skip URLs without language when site uses language
                                }
                            }
                            
                            internalLinks.add(cleanUrl);
                        }
                    }
                } catch (e) { /* ignoră */ }
            });
            console.log(`[PageExtractor] 🔗 Static extraction found ${internalLinks.size} links on ${url}`);
        } catch (axiosError) {
            console.warn(`[PageExtractor] ⚠️ Static extraction failed for ${url}: ${axiosError.message}. Proceeding with dynamic only.`);
        }

        // If no links found, add intelligent common paths as fallback
        if (internalLinks.size === 0) {
            console.log(`[PageExtractor] 🔗 No links found, generating intelligent fallback paths`);
            
            // Analyze site structure if not already done
            if (!this.siteAnalyzed) {
                await this.fallbackHandler.analyzeSiteStructure([url]);
                this.siteAnalyzed = true;
            }
            
            // Generate intelligent common paths based on detected language pattern
            const intelligentPaths = this.fallbackHandler.generateIntelligentCommonPaths(url);
            
            // Test which URLs actually work
            const commonPathsArray = ['about', 'contact', 'services', 'products', 'blog', 'news', 'pricing', 'features', 'support', 'help', 'faq'];
            const workingUrls = await this.fallbackHandler.filterWorkingUrls(url, commonPathsArray);
            
            // Add working URLs to internal links
            workingUrls.forEach(workingUrl => {
                internalLinks.add(workingUrl);
            });
            
            console.log(`[PageExtractor] 🔗 Added ${workingUrls.length} verified working fallback links`);
        }

        let page = null;
        let clientSideError = null;
        let finalUrl = url;
        
        try {
            page = await browser.newPage();
            
            // Enhanced error handling
            page.on('pageerror', (err) => { clientSideError = err.message; });
            page.on('requestfailed', (request) => {
                console.warn(`[PageExtractor] Request failed: ${request.url()}`);
            });
            
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            // Enhanced page navigation with multiple strategies
            let navigationSuccess = false;
            const strategies = [
                { waitUntil: 'networkidle0', timeout: this.timeout },
                { waitUntil: 'domcontentloaded', timeout: this.timeout },
            ];

            for (let strategy of strategies) {
                try {
                    await page.goto(normalizedUrl, strategy);
                    const finalUrlAfterRedirect = page.url();
                    finalUrl = normalizeUrl(finalUrlAfterRedirect); // Normalize final URL
                    navigationSuccess = true;
                    console.log(`[PageExtractor] ✅ Navigation successful for ${finalUrl} with strategy: ${strategy.waitUntil}`);
                    break;
                } catch (navError) {
                    console.warn(`[PageExtractor] ⚠️ Navigation failed for ${normalizedUrl} with ${strategy.waitUntil}: ${navError.message}`);
                    continue;
                }
            }

            if (!navigationSuccess) {
                throw new Error(`All navigation strategies failed for ${normalizedUrl}`);
            }

            // Enhanced wait strategies for JavaScript-heavy sites
            await this.waitForContentLoad(page, isSimilarPage);

            const bodyHtml = await page.content();
            
            // Handle client-side errors but still try to extract content
            if (bodyHtml.includes('Application error: a client-side exception has occurred') || clientSideError) {
                console.warn(`[PageExtractor] 🟡 Client-side error detected on ${finalUrl}, attempting partial extraction.`);
                
                // Try to extract what we can despite errors
                const partialData = await this.extractPartialContent(page, finalUrl, internalLinks, clientSideError);
                if (partialData) {
                    // Attempt to run analysis on partial content if we have enough
                    if (partialData.content && partialData.content.length > 100) {
                        try {
                            const $ = cheerio.load(partialData.content);
                            const analysis = this.analyzer.collectQuantitativeData($, finalUrl);
                            partialData = { ...partialData, ...analysis };
                            console.log(`[PageExtractor] ✅ Enhanced partial extraction with analysis: score ${analysis.quantitativeScore}`);
                        } catch (analysisError) {
                            console.warn(`[PageExtractor] Partial content analysis failed: ${analysisError.message}`);
                        }
                    }
                    
                    console.log(`[PageExtractor] ✅ Partial extraction successful: ${partialData.content?.length || 0} chars, ${partialData.internalLinks?.length || 0} links`);
                    return partialData;
                } else {
                    console.warn(`[PageExtractor] ⚠️ Partial extraction failed to get meaningful content`);
                }
                
                return {
                    url: finalUrl,
                    title: 'Client-Side Error',
                    error: clientSideError || 'Next.js client-side exception',
                    errorType: 'CLIENT_ERROR',
                    internalLinks: Array.from(internalLinks).map(normalizeUrl),
                };
            }

            const $ = cheerio.load(bodyHtml);
            
            // Try using the analyzer's analyzePage method first for complete analysis
            let pageAnalysis;
            try {
                const analyzeResult = await this.analyzer.analyzePage(finalUrl, browser);
                if (analyzeResult && !analyzeResult.error) {
                    pageAnalysis = analyzeResult;
                    console.log(`[PageExtractor] Complete analysis successful for ${finalUrl}: score ${analyzeResult.quantitativeScore}`);
                } else {
                    // Fallback to direct analysis
                    pageAnalysis = this.analyzer.collectQuantitativeData($, finalUrl);
                    console.log(`[PageExtractor] Using direct analysis for ${finalUrl}: score ${pageAnalysis.quantitativeScore}`);
                }
            } catch (analyzeError) {
                console.warn(`[PageExtractor] Analyzer failed, using fallback: ${analyzeError.message}`);
                pageAnalysis = this.analyzer.collectQuantitativeData($, finalUrl);
            }

            $('body').find('script, style, nav, footer, header, aside, form, noscript').remove();
            const content = $('body').text().replace(/\s\s+/g, ' ').trim().substring(0, 8000); // Reduced from 15000
            
            // MODIFICAT: Folosim .each() pentru a construi array-ul în mod sigur
            const headings = [];
            $('h1, h2, h3').each((i, el) => {
                const text = $(el).text().trim();
                if (text) {
                    headings.push({
                        level: parseInt(el.tagName.substring(1)),
                        text: text
                    });
                }
            });

            // Extract and normalize all links from the page
            const dynamicLinks = await this.extractLinksFromPage(page, finalUrl);
            dynamicLinks.forEach(link => internalLinks.add(link));

            return {
                url: finalUrl,
                ...pageAnalysis,
                headings,
                internalLinks: Array.from(internalLinks),
                content,
            };
        } catch (puppeteerError) {
            console.error(`[PageExtractor] ❌ Dynamic extraction failed for ${normalizedUrl}: ${puppeteerError.message}`);
            
            // Enhanced fallback - try to extract from static content if available
            if (internalLinks.size > 0) {
                const fallbackData = await this.tryFallbackExtraction(normalizedUrl, internalLinks);
                if (fallbackData) {
                    return fallbackData;
                }
                
                return {
                    url: finalUrl || normalizedUrl,
                    title: 'Dynamic Extraction Failed',
                    error: puppeteerError.message,
                    errorType: 'CONNECTION_ERROR',
                    internalLinks: Array.from(internalLinks).map(normalizeUrl),
                };
            }
            return { url: finalUrl || normalizedUrl, error: puppeteerError.message, errorType: 'CONNECTION_ERROR' };
        } finally {
            if (page) await page.close();
        }
    }

    async waitForContentLoad(page, isSimilarPage = false) {
        // Reduced timeouts for similar pages to speed up crawling
        const timeout = isSimilarPage ? 2000 : 5000;
        const fallbackDelay = isSimilarPage ? 1000 : 3000;
        
        const waitStrategies = [
            // Wait for common loading indicators to disappear
            () => page.waitForFunction(() => !document.querySelector('.loading, .spinner, [class*="loading"]'), { timeout }),
            // Wait for React/Vue app to mount
            () => page.waitForFunction(() => document.querySelector('[data-reactroot], #__next, #app, main, .app'), { timeout }),
            // Wait for content to appear
            () => page.waitForFunction(() => document.body && document.body.children.length > 1, { timeout }),
            // Simple delay as fallback
            () => delay(fallbackDelay)
        ];

        for (let strategy of waitStrategies) {
            try {
                await strategy();
                console.log(`[PageExtractor] ✅ Content loading strategy succeeded`);
                return;
            } catch (waitError) {
                console.warn(`[PageExtractor] ⚠️ Wait strategy failed: ${waitError.message}`);
                continue;
            }
        }
        
        // Final fallback
        await delay(isSimilarPage ? 500 : 2000);
    }

    async extractPartialContent(page, url, internalLinks, error) {
        try {
            const title = await page.title().catch(() => 'Partial Extraction');
            const normalizedUrl = normalizeUrl(url);
            
            // Try to get any visible text
            const content = await page.evaluate(() => {
                const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div');
                let text = '';
                for (let el of textElements) {
                    if (el.offsetParent !== null) { // visible element
                        text += el.textContent + ' ';
                    }
                }
                return text.trim().substring(0, 3000); // Reduced from 5000
            }).catch(() => '');

            // Try to extract additional links from the current page with multiple methods
            const dynamicLinks = await this.extractLinksFromPage(page, normalizedUrl).catch(() => []);
            dynamicLinks.forEach(link => internalLinks.add(link));

            if (title !== 'Partial Extraction' || content.length > 100 || dynamicLinks.length > 0) {
                return {
                    url: normalizedUrl,
                    title,
                    content,
                    error: `Partial extraction due to: ${error}`,
                    errorType: 'PARTIAL_SUCCESS',
                    internalLinks: Array.from(internalLinks).map(normalizeUrl),
                    wordCount: content.split(/\s+/).length,
                    headings: []
                };
            }
        } catch (extractError) {
            console.warn(`[PageExtractor] Partial extraction failed: ${extractError.message}`);
        }
        return null;
    }

    async tryFallbackExtraction(url, internalLinks) {
        const normalizedUrl = normalizeUrl(url);
        try {
            // Try one more time with a different approach
            const response = await this.axiosInstance.get(normalizedUrl, {
                maxRedirects: 10,
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; WebCrawler/1.0)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
            });

            const $ = cheerio.load(response.data);
            const title = $('title').text().trim() || 'Fallback Extraction';
            const content = $('body').text().replace(/\s\s+/g, ' ').trim().substring(0, 2000); // Reduced for fallback

            if (content.length > 100) {
                // Try to run complete analysis on fallback content
                let analysis = {
                    title,
                    content,
                    wordCount: content.split(/\s+/).length,
                    headings: []
                };
                
                try {
                    const completeAnalysis = this.analyzer.collectQuantitativeData($, normalizedUrl);
                    analysis = { ...analysis, ...completeAnalysis };
                    console.log(`[PageExtractor] ✅ Fallback extraction with complete analysis: score ${completeAnalysis.quantitativeScore}`);
                } catch (analysisError) {
                    console.warn(`[PageExtractor] Fallback analysis failed: ${analysisError.message}`);
                }
                
                return {
                    url: normalizedUrl,
                    ...analysis,
                    error: 'Extracted via fallback method',
                    errorType: 'FALLBACK_SUCCESS',
                    internalLinks: Array.from(internalLinks).map(normalizeUrl)
                };
            }
        } catch (fallbackError) {
            console.warn(`[PageExtractor] Fallback extraction failed: ${fallbackError.message}`);
        }
        return null;
    }

    // Enhanced link extraction with multiple strategies
    async extractLinksFromPage(page, baseUrl) {
        const normalizedBaseUrl = normalizeUrl(baseUrl);
        const baseDomain = new URL(normalizedBaseUrl).hostname.replace(/^www\./, '');
        const allLinks = new Set();

        // Strategy 1: Standard DOM query
        try {
            const domLinks = await page.evaluate((domain) => {
                const links = [];
                document.querySelectorAll('a[href]').forEach(link => {
                    try {
                        const href = link.getAttribute('href');
                        if (!href) return;
                        const absoluteUrl = new URL(href, window.location.href);
                        if (absoluteUrl.hostname.replace(/^www\./, '').endsWith(domain)) {
                            links.push(absoluteUrl.href);
                        }
                    } catch (e) {}
                });
                return [...new Set(links)];
            }, baseDomain);
            domLinks.forEach(link => allLinks.add(normalizeUrl(link)));
        } catch (e) {
            console.warn(`[PageExtractor] DOM link extraction failed: ${e.message}`);
        }

        // Strategy 2: Extract from navigation elements specifically
        try {
            const navLinks = await page.evaluate((domain) => {
                const links = [];
                const selectors = ['nav a', '.nav a', '.navigation a', '.menu a', 'header a', '.header a'];
                selectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach(link => {
                        try {
                            const href = link.getAttribute('href');
                            if (!href) return;
                            const absoluteUrl = new URL(href, window.location.href);
                            if (absoluteUrl.hostname.replace(/^www\./, '').endsWith(domain)) {
                                links.push(absoluteUrl.href);
                            }
                        } catch (e) {}
                    });
                });
                return [...new Set(links)];
            }, baseDomain);
            navLinks.forEach(link => allLinks.add(normalizeUrl(link)));
        } catch (e) {
            console.warn(`[PageExtractor] Navigation link extraction failed: ${e.message}`);
        }

        // Strategy 3: Quick check for additional links (reduced timeout for similar pages)
        try {
            await page.waitForTimeout(500); // Reduced from 2000ms
            const delayedLinks = await page.evaluate((domain) => {
                const links = [];
                document.querySelectorAll('a[href]').forEach(link => {
                    try {
                        const href = link.getAttribute('href');
                        if (!href) return;
                        const absoluteUrl = new URL(href, window.location.href);
                        if (absoluteUrl.hostname.replace(/^www\./, '').endsWith(domain)) {
                            links.push(absoluteUrl.href);
                        }
                    } catch (e) {}
                });
                return [...new Set(links)];
            }, baseDomain);
            delayedLinks.forEach(link => allLinks.add(normalizeUrl(link)));
        } catch (e) {
            console.warn(`[PageExtractor] Delayed link extraction failed: ${e.message}`);
        }

        // Strategy 4: Common website patterns - generate likely URLs
        try {
            const commonPaths = ['/about', '/contact', '/services', '/products', '/blog', '/news', '/pricing', '/features', '/support', '/help', '/faq'];
            const baseUrlObj = new URL(normalizedBaseUrl);
            commonPaths.forEach(path => {
                const potentialUrl = `${baseUrlObj.protocol}//${baseUrlObj.hostname}${path}`;
                allLinks.add(normalizeUrl(potentialUrl));
            });
        } catch (e) {
            console.warn(`[PageExtractor] Common path generation failed: ${e.message}`);
        }

        const linksArray = Array.from(allLinks).filter(link => {
            try {
                // Verifică dacă link-ul aparține domeniului
                if (!new URL(link).hostname.replace(/^www\./, '').endsWith(baseDomain)) {
                    return false;
                }
                
                // Dacă am detectat că site-ul folosește limba, filtrează URL-urile fără limbă
                if (this.languageDetector.siteLanguagePattern) {
                    const hasLanguage = this.languageDetector.detectLanguageInUrl(link);
                    const isRootUrl = new URL(link).pathname === '/';
                    if (!hasLanguage && !isRootUrl) {
                        console.log(`[PageExtractor] 🚫 Filtering dynamic URL without language: ${link} (site uses: ${this.languageDetector.siteLanguagePattern})`);
                        return false;
                    }
                }
                
                return true;
            } catch (e) {
                return false;
            }
        });

        console.log(`[PageExtractor] 🔗 Enhanced extraction found ${linksArray.length} potential links (filtered by language)`);
        return linksArray;
    }
}

module.exports = PageExtractor;