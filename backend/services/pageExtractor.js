const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

class PageExtractor {
    constructor() {
        this.timeout = 45000;
        this.axiosInstance = axios.create({
            timeout: 15000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' }
        });
    }

    async extract(url, browser) {
        const baseDomain = new URL(url).hostname.replace(/^www\./, '');
        let internalLinks = new Set();

        try {
            const response = await this.axiosInstance.get(url);
            const staticHtml = response.data;
            const $ = cheerio.load(staticHtml);
            
            $('a[href]').each((i, el) => {
                const href = $(el).attr('href');
                if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
                try {
                    const absoluteUrl = new URL(href, url);
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

        let page = null;
        let clientSideError = null;
        try {
            page = await browser.newPage();
            page.on('pageerror', (err) => { clientSideError = err.message; });
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            await page.goto(url, { waitUntil: 'networkidle2', timeout: this.timeout });
            await delay(1500);

            const bodyHtml = await page.content();
            if (bodyHtml.includes('Application error: a client-side exception has occurred') || clientSideError) {
                console.warn(`[PageExtractor] 🟡 Client-side error detected on ${url}.`);
                return {
                    url,
                    title: 'Client-Side Error',
                    error: clientSideError || 'Next.js client-side exception',
                    errorType: 'CLIENT_ERROR',
                    internalLinks: Array.from(internalLinks),
                };
            }

            const $ = cheerio.load(bodyHtml);
            $('body').find('script, style, nav, footer, header, aside, form, noscript').remove();
            const content = $('body').text().replace(/\s\s+/g, ' ').trim().substring(0, 15000);
            
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
                url,
                title: $('title').first().text().trim() || 'No Title Found',
                metaDescription: $('meta[name="description"]').attr('content')?.trim() || '',
                headings,
                internalLinks: Array.from(internalLinks),
                content,
            };
        } catch (puppeteerError) {
            console.error(`[PageExtractor] ❌ Dynamic extraction failed for ${url}: ${puppeteerError.message}`);
            if (internalLinks.size > 0) {
                return {
                    url,
                    title: 'Dynamic Extraction Failed',
                    error: puppeteerError.message,
                    errorType: 'CONNECTION_ERROR',
                    internalLinks: Array.from(internalLinks),
                };
            }
            return { url, error: puppeteerError.message, errorType: 'CONNECTION_ERROR' };
        } finally {
            if (page) await page.close();
        }
    }
}

module.exports = PageExtractor;