const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const WebsiteAnalyzer = require('./websiteAnalyzer');

class PageExtractor {
    constructor() {
        this.analyzer = new WebsiteAnalyzer();
        this.timeout = 45000;
        this.axiosInstance = axios.create({
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' }
        });
    }

    async extract(url, browser, isSimilarPage = false) {
        const baseDomain = new URL(url).hostname.replace(/^www\./, '');
        let internalLinks = new Set();

        // Enhanced static extraction with redirect handling
        try {
            const response = await this.axiosInstance.get(url, {
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
                    const absoluteUrl = new URL(href, response.request.res.responseUrl || url);
                    if (['http:', 'https:'].includes(absoluteUrl.protocol)) {
                        const cleanUrl = (absoluteUrl.href).split('#')[0];
                        if (new URL(cleanUrl).hostname.replace(/^www\./, '').endsWith(baseDomain)) {
                            internalLinks.add(cleanUrl);
                        }
                    }
                } catch (e) { /* ignoră */ }
            });
            console.log(`[PageExtractor] 🔗 Static extraction found ${internalLinks.size} links on ${url}`);
        } catch (axiosError) {
            console.warn(`[PageExtractor] ⚠️ Static extraction failed for ${url}: ${axiosError.message}. Proceeding with dynamic only.`);
        }

        // If no links found, add common paths as fallback
        if (internalLinks.size === 0) {
            const commonPaths = ['/about', '/contact', '/services', '/products', '/blog', '/news', '/pricing', '/features', '/support', '/help', '/faq', '/en', '/ro'];
            const urlObj = new URL(url);
            commonPaths.forEach(path => {
                const potentialUrl = `${urlObj.protocol}//${urlObj.hostname}${path}`;
                internalLinks.add(potentialUrl);
            });
            console.log(`[PageExtractor] 🔗 Added ${commonPaths.length} common paths as fallback links`);
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
                { waitUntil: 'networkidle2', timeout: this.timeout },
                { waitUntil: 'domcontentloaded', timeout: this.timeout },
                { waitUntil: 'load', timeout: 30000 }
            ];

            for (let strategy of strategies) {
                try {
                    const response = await page.goto(url, strategy);
                    finalUrl = page.url(); // Get final URL after redirects
                    navigationSuccess = true;
                    console.log(`[PageExtractor] ✅ Navigation successful with strategy: ${strategy.waitUntil}`);
                    break;
                } catch (navError) {
                    console.warn(`[PageExtractor] ⚠️ Navigation failed with ${strategy.waitUntil}: ${navError.message}`);
                    continue;
                }
            }

            if (!navigationSuccess) {
                throw new Error('All navigation strategies failed');
            }

            // Enhanced wait strategies for JavaScript-heavy sites
            await this.waitForContentLoad(page, isSimilarPage);

            const bodyHtml = await page.content();
            
            // Handle client-side errors but still try to extract content
            if (bodyHtml.includes('Application error: a client-side exception has occurred') || clientSideError) {
                console.warn(`[PageExtractor] 🟡 Client-side error detected on ${url}, attempting partial extraction.`);
                
                // Try to extract what we can despite errors
                const partialData = await this.extractPartialContent(page, finalUrl, internalLinks, clientSideError);
                if (partialData) {
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
                    internalLinks: Array.from(internalLinks),
                };
            }

            const $ = cheerio.load(bodyHtml);
            const pageAnalysis = this.analyzer.collectQuantitativeData($, url);

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

            return {
                url: finalUrl,
                ...pageAnalysis,
                headings,
                internalLinks: Array.from(internalLinks),
                content,
            };
        } catch (puppeteerError) {
            console.error(`[PageExtractor] ❌ Dynamic extraction failed for ${url}: ${puppeteerError.message}`);
            
            // Enhanced fallback - try to extract from static content if available
            if (internalLinks.size > 0) {
                const fallbackData = await this.tryFallbackExtraction(url, internalLinks);
                if (fallbackData) {
                    return fallbackData;
                }
                
                return {
                    url: finalUrl || url,
                    title: 'Dynamic Extraction Failed',
                    error: puppeteerError.message,
                    errorType: 'CONNECTION_ERROR',
                    internalLinks: Array.from(internalLinks),
                };
            }
            return { url: finalUrl || url, error: puppeteerError.message, errorType: 'CONNECTION_ERROR' };
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
            const dynamicLinks = await this.extractLinksFromPage(page, url).catch(() => []);
            dynamicLinks.forEach(link => internalLinks.add(link));

            if (title !== 'Partial Extraction' || content.length > 100 || dynamicLinks.length > 0) {
                return {
                    url,
                    title,
                    content,
                    error: `Partial extraction due to: ${error}`,
                    errorType: 'PARTIAL_SUCCESS',
                    internalLinks: Array.from(internalLinks),
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
        try {
            // Try one more time with a different approach
            const response = await this.axiosInstance.get(url, {
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
                return {
                    url,
                    title,
                    content,
                    error: 'Extracted via fallback method',
                    errorType: 'FALLBACK_SUCCESS',
                    internalLinks: Array.from(internalLinks),
                    wordCount: content.split(/\s+/).length,
                    headings: []
                };
            }
        } catch (fallbackError) {
            console.warn(`[PageExtractor] Fallback extraction failed: ${fallbackError.message}`);
        }
        return null;
    }

    // Enhanced link extraction with multiple strategies
    async extractLinksFromPage(page, baseUrl) {
        const baseDomain = new URL(baseUrl).hostname.replace(/^www\./, '');
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
                            links.push(absoluteUrl.href.split('#')[0]);
                        }
                    } catch (e) {}
                });
                return [...new Set(links)];
            }, baseDomain);
            domLinks.forEach(link => allLinks.add(link));
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
                                links.push(absoluteUrl.href.split('#')[0]);
                            }
                        } catch (e) {}
                    });
                });
                return [...new Set(links)];
            }, baseDomain);
            navLinks.forEach(link => allLinks.add(link));
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
                            links.push(absoluteUrl.href.split('#')[0]);
                        }
                    } catch (e) {}
                });
                return [...new Set(links)];
            }, baseDomain);
            delayedLinks.forEach(link => allLinks.add(link));
        } catch (e) {
            console.warn(`[PageExtractor] Delayed link extraction failed: ${e.message}`);
        }

        // Strategy 4: Common website patterns - generate likely URLs
        try {
            const commonPaths = ['/about', '/contact', '/services', '/products', '/blog', '/news', '/pricing', '/features', '/support', '/help', '/faq'];
            const baseUrlObj = new URL(baseUrl);
            commonPaths.forEach(path => {
                const potentialUrl = `${baseUrlObj.protocol}//${baseUrlObj.hostname}${path}`;
                allLinks.add(potentialUrl);
            });
        } catch (e) {
            console.warn(`[PageExtractor] Common path generation failed: ${e.message}`);
        }

        const linksArray = Array.from(allLinks).filter(link => {
            try {
                return new URL(link).hostname.replace(/^www\./, '').endsWith(baseDomain);
            } catch (e) {
                return false;
            }
        });

        console.log(`[PageExtractor] 🔗 Enhanced extraction found ${linksArray.length} potential links`);
        return linksArray;
    }
}

module.exports = PageExtractor;