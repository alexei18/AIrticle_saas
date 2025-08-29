const cheerio = require('cheerio');

// Import franc - version 6+ exports franc as a named export
const { franc } = require('franc');
const LanguageDetector = require('./languageDetector');

class WebsiteAnalyzer {
  constructor() {
    this.analyzedPages = new Set();
    this.analyzeResults = new Map(); // Store results to avoid duplicates
    this.languageDetector = new LanguageDetector();
    this.siteAnalyzed = false; // Flag să știm dacă am analizat structura site-ului
  }

  // Intelligent URL normalization using LanguageDetector
  removeLanguageFromUrl(url) {
    try {
      const urlObj = new URL(url);
      let pathname = urlObj.pathname;
      
      // Detectează limba în URL
      const detectedLanguage = this.languageDetector.detectLanguageInUrl(url);
      
      if (detectedLanguage) {
        // Elimină limba doar dacă a fost detectată ca fiind un cod de limbă real
        pathname = pathname.replace(new RegExp(`^/${detectedLanguage}(/|$)`), '/');
        console.log(`[WebsiteAnalyzer] Removed language '${detectedLanguage}' from URL: ${url}`);
      }
      
      // If we removed a language code and path is empty, make it root
      if (pathname === '' || pathname === '/') {
        pathname = '/';
      }
      
      // Remove trailing slash for consistency, but keep root slash
      if (pathname.endsWith('/') && pathname.length > 1) {
        pathname = pathname.slice(0, -1);
      }
      
      return `${urlObj.protocol}//${urlObj.hostname}${pathname}${urlObj.search}`;
    } catch (error) {
      return url; // Return original URL if parsing fails
    }
  }

  // Analizează structura limbii site-ului folosind URL-urile colectate
  analyzeSiteLanguageStructure(urls) {
    if (!this.siteAnalyzed && urls && urls.length > 0) {
      const analysis = this.languageDetector.analyzeSiteLanguagePattern(urls);
      this.siteAnalyzed = true;
      console.log(`[WebsiteAnalyzer] Site language analysis complete:`, analysis);
      return analysis;
    }
    return null;
  }

  // Reset pentru un nou site
  resetForNewSite() {
    this.analyzedPages.clear();
    this.analyzeResults.clear();
    this.languageDetector.reset();
    this.siteAnalyzed = false;
    console.log('[WebsiteAnalyzer] Reset for new site analysis');
  }

  async analyzePage(url, browser) {
    // Asigură-te că folosim limba detectată pentru normalizare
    const normalizedUrl = this.removeLanguageFromUrl(url);
    
    // Check if we already have a successful analysis for this normalized URL
    if (this.analyzeResults.has(normalizedUrl)) {
      const existingResult = this.analyzeResults.get(normalizedUrl);
      if (!existingResult.error) {
        console.log(`[WebsiteAnalyzer] ✅ Reusing cached analysis: ${url} → normalized: ${normalizedUrl}`);
        // Return a copy with the original URL
        return { ...existingResult, url: url };
      }
    }
    
    console.log(`[WebsiteAnalyzer] 🔄 Analyzing new URL: ${url} → normalized: ${normalizedUrl}`);
    
    // Mark as being analyzed
    this.analyzedPages.add(normalizedUrl);

    let page = null;
    try {
      page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
      const contentHtml = await page.content();
      const $ = cheerio.load(contentHtml);
      const textContent = $('body').text();
      
      let language = 'unknown';
      try {
        language = franc(textContent) || 'unknown';
        console.log(`Detected language for ${url}: ${language}`);
      } catch (langError) {
        console.warn(`Language detection failed for ${url}:`, langError.message);
        language = 'unknown';
      }

      const analysisResult = this.collectQuantitativeData($, url);
      const result = { ...analysisResult, language, url };
      
      // Store successful result
      this.analyzeResults.set(normalizedUrl, result);
      console.log(`Successfully analyzed and cached: ${url} (normalized: ${normalizedUrl})`);
      
      return result;
    } catch (error) {
      console.warn(`[Analyzer] Quantitative analysis failed for ${url}: ${error.message}`);
      const errorResult = {
        url,
        error: `Analysis failed: ${error.code || error.message}`,
        quantitativeScore: 0,
        issues: [`Analysis failed: ${error.code || error.message}`],
        wordCount: 0,
        title: 'Error',
        metaDescription: '',
        h1: '',
        contentSample: '',
        language: 'unknown',
      };
      
      // Only store error result if we don't have a successful one already
      if (!this.analyzeResults.has(normalizedUrl) || this.analyzeResults.get(normalizedUrl).error) {
        this.analyzeResults.set(normalizedUrl, errorResult);
      }
      
      return errorResult;
    } finally {
      if (page) await page.close();
    }
  }

  collectQuantitativeData($, url = '') {
    let quantitativeScore = 100;
    const issues = [];
    const suggestions = [];

    suggestions.push("Verifică dacă există un fișier sitemap.xml la rădăcina domeniului pentru a ajuta motoarele de căutare să descopere toate paginile.");

    const schemaScripts = $('script[type="application/ld+json"]');
    if (schemaScripts.length === 0) {
      quantitativeScore -= 5;
      issues.push("Conținut: Nu s-au găsit date structurate Schema.org (JSON-LD).");
      suggestions.push("Adaugă date structurate (Schema.org) pentru a oferi context motoarelor de căutare despre conținutul paginii.");
    } else {
      suggestions.push("Bun! Pagina folosește date structurate (Schema.org). Asigură-te că sunt valide și relevante.");
    }
    
    const title = $('title').text().trim();
    if (!title) { quantitativeScore -= 10; issues.push("Tehnic: Lipsește eticheta <title>."); }
    else if (title.length > 65) { quantitativeScore -= 5; issues.push("Tehnic: Titlul este prea lung (> 65 caractere)."); }
    else if (title.length < 30) { quantitativeScore -= 5; issues.push("Tehnic: Titlul este prea scurt (< 30 caractere)."); }

    const metaDesc = $('meta[name="description"]').attr('content')?.trim() || '';
    if (!metaDesc) { quantitativeScore -= 10; issues.push("Tehnic: Lipsește meta descrierea."); }
    else if (metaDesc.length > 160) { quantitativeScore -= 5; issues.push("Tehnic: Meta descrierea este prea lungă (> 160 caractere)."); }
    else if (metaDesc.length < 70) { quantitativeScore -= 5; issues.push("Tehnic: Meta descrierea este prea scurtă (< 70 caractere)."); }

    const h1s = $('h1');
    if (h1s.length === 0) { quantitativeScore -= 10; issues.push("Critic: Lipsește eticheta H1."); }
    if (h1s.length > 1) { quantitativeScore -= 5; issues.push(`Tehnic: S-au găsit ${h1s.length} etichete H1 (recomandat este 1).`); }

    const images = $('img');
    const imagesWithoutAlt = images.filter((i, img) => !$(img).attr('alt')?.trim()).length;
    if (images.length > 0 && imagesWithoutAlt > 0) {
      quantitativeScore -= Math.min(5, imagesWithoutAlt * 1);
      issues.push(`Conținut: ${imagesWithoutAlt} din ${images.length} imagini nu au atribut 'alt' descriptiv.`);
    }

    const textContent = $('body').text();
    const wordCount = textContent.trim().split(/\s+/).length;
    if (wordCount < 300) { quantitativeScore -= 10; issues.push(`Conținut: Conținutul este subțire (${wordCount} cuvinte).`); }

    return {
      title,
      metaDescription: metaDesc,
      h1: h1s.first().text().trim(),
      wordCount,
      contentSample: textContent.replace(/\s\s+/g, ' ').trim().substring(0, 4000),
      issues,
      suggestions,
      quantitativeScore: Math.max(0, quantitativeScore)
    };
  }
}

module.exports = WebsiteAnalyzer;