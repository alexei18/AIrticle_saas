const cheerio = require('cheerio');
const SEMrushService = require('./semrushService');

class WebsiteAnalyzer {
  constructor() {
    this.semrushService = new SEMrushService();
  }

  async analyzePage(url, browser) {
    let page = null;
    try {
      page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
      const contentHtml = await page.content();
      const $ = cheerio.load(contentHtml);

      return this.collectQuantitativeData($);

    } catch (error) {
      console.warn(`[Analyzer] Quantitative analysis failed for ${url}: ${error.message}`);
      // MODIFICAT: Returnăm un obiect cu eroare, dar cu structură consistentă
      return { 
          error: `Analysis failed: ${error.code || error.message}`,
          quantitativeScore: 0,
          issues: [`Analysis failed: ${error.code || error.message}`],
          wordCount: 0,
          title: 'Error',
          metaDescription: '',
          h1: '',
          contentSample: ''
      };
    } finally {
      if (page) await page.close();
    }
  }

  collectQuantitativeData($) {
    let quantitativeScore = 100;
    const issues = [];
    
    const title = $('title').text().trim();
    if (!title) { quantitativeScore -= 10; issues.push("Tehnic: Lipsește eticheta <title>."); }
    else if (title.length > 65) { quantitativeScore -= 5; issues.push("Tehnic: Titlul este prea lung (> 65 caractere)."); }
    else if (title.length < 30) { quantitativeScore -= 5; issues.push("Tehnic: Titlul este prea scurt (< 30 caractere)."); }

    const metaDesc = $('meta[name="description"]').attr('content')?.trim() || '';
    if (!metaDesc) { quantitativeScore -= 10; issues.push("Tehnic: Lipsește meta descrierea."); }
    else if (metaDesc.length > 160) { quantitativeScore -= 5; issues.push("Tehnic: Meta descrierea este prea lungă (> 160 caractere)."); }
    else if (metaDesc.length < 70) { quantitativeScore -= 5; issues.push("Tehnic: Meta descrierea este prea scurtă (< 70 caractere)."); }

    const h1s = $('h1');
    if (h1s.length === 0) { quantitativeScore -= 15; issues.push("Critic: Lipsește eticheta H1."); }
    if (h1s.length > 1) { quantitativeScore -= 10; issues.push(`Tehnic: S-au găsit ${h1s.length} etichete H1 (recomandat este 1).`); }

    const images = $('img');
    const imagesWithoutAlt = images.filter((i, img) => !$(img).attr('alt')?.trim()).length;
    if (images.length > 0 && imagesWithoutAlt > 0) {
      quantitativeScore -= Math.min(10, imagesWithoutAlt * 2);
      issues.push(`Conținut: ${imagesWithoutAlt} din ${images.length} imagini nu au atribut 'alt' descriptiv.`);
    }

    const textContent = $('body').text();
    const wordCount = textContent.trim().split(/\s+/).length;
    if (wordCount < 300) { quantitativeScore -= 15; issues.push(`Conținut: Conținutul este subțire (${wordCount} cuvinte).`); }

    return {
      title,
      metaDescription: metaDesc,
      h1: h1s.first().text().trim(),
      wordCount,
      contentSample: textContent.replace(/\s\s+/g, ' ').trim().substring(0, 4000),
      issues,
      quantitativeScore: Math.max(0, quantitativeScore)
    };
  }

  async analyzeDomain(domain, language = 'ro') {
    console.log(`[Analyzer] 📈 Starting domain-level analysis for: ${domain}`);
    try {
      const semrushAnalysis = await this.semrushService.getDomainAnalysis(domain, language);
      
      if (!semrushAnalysis) {
        console.warn(`[Analyzer] ⚠️ SEMrush analysis failed or returned no data for ${domain}. Continuing without it.`);
        return { 
          score: 0, data: null,
          error: "Could not retrieve domain data from SEMrush. Check API key and credits.",
          recommendations: [] 
        };
      }
      
      const score = this.semrushService.calculateSEOScore(semrushAnalysis);
      const recommendations = this.semrushService.generateRecommendations(semrushAnalysis);
      console.log(`[Analyzer] ✅ Finished domain-level analysis for ${domain}. Score: ${score}`);
      return { score, data: semrushAnalysis, recommendations };
    } catch (error) {
      console.error(`[Analyzer] ❌ Domain analysis failed for ${domain}: ${error.message}`);
      return { score: 0, data: null, error: error.message, recommendations: [] };
    }
  }
}

module.exports = WebsiteAnalyzer;