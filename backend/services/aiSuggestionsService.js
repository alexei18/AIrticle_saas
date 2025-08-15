const { CrawledPage } = require('../models');
const AIProviderManager = require('./aiProviders'); // MODIFICAT: Importăm clasa

class AiSuggestionsService {
  constructor() {
    this.aiProvider = new AIProviderManager(); // MODIFICAT: Creăm o instanță
  }

  /**
   * Generează un sitemap XML pe baza paginilor crawlate.
   * @param {number} websiteId - ID-ul website-ului.
   * @returns {Promise<string>} - String-ul XML al sitemap-ului.
   */
  async generateSitemap(websiteId) {
    const pages = await CrawledPage.findAll({
      where: { websiteId }, // MODIFICAT: Am scos clauza 'error' care nu există
      attributes: ['url'],
    });

    if (pages.length === 0) {
      return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
    }

    const urlEntries = pages.map(page => `
  <url>
    <loc>${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.8</priority>
  </url>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntries}
</urlset>`;
  }

  /**
   * Generează markup Schema.org pentru o pagină specifică.
   * @param {number} pageId - ID-ul paginii crawlate.
   * @returns {Promise<object|null>} - Obiectul JSON-LD pentru Schema.org sau null dacă eșuează.
   */
  async generateSchema(pageId) {
    const page = await CrawledPage.findByPk(pageId);
    if (!page || !page.content) { // MODIFICAT: Folosim page.content
      console.error(`[AISuggestions] Pagina cu ID ${pageId} nu a fost găsită sau nu are conținut.`);
      return null;
    }

    const prompt = `
      Analizează următorul conținut de pagină web și generează un script JSON-LD optim pentru Schema.org.
      - Identifică tipul principal de conținut (ex: Articol, Produs, Serviciu, Pagina de contact).
      - Include detalii relevante precum titlu, descriere, autor (dacă e cazul), etc.
      - Răspunde doar cu conținutul JSON valid, fără text explicativ înconjurător.

      URL: ${page.url}
      Titlu: ${page.title}
      Conținut:
      "${page.content.substring(0, 2000)}..."
    `;

    try {
      // MODIFICAT: Folosim metoda corectă și specificăm că vrem JSON
      const jsonResponse = await this.aiProvider.makeAIRequest(prompt, { isJson: true });
      return jsonResponse;
    } catch (error) {
      console.error(`[AISuggestions] Eroare la generarea schemei pentru pagina ${pageId}:`, error);
      // Fallback la un schema generic în caz de eroare
      return {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "url": page.url,
        "name": page.title,
        "description": page.metaDescription
      };
    }
  }
}

module.exports = new AiSuggestionsService();
