const cheerio = require('cheerio');

class WebsiteAnalyzer {
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

  collectQuantitativeData($, url) {
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