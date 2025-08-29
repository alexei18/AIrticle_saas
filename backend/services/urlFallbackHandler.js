const axios = require('axios');

class UrlFallbackHandler {
    constructor(languageDetector) {
        this.languageDetector = languageDetector;
        this.axiosInstance = axios.create({
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            validateStatus: function (status) {
                // Consideră 2xx și 3xx ca succes, 4xx și 5xx ca eșec
                return status >= 200 && status < 400;
            }
        });
    }

    /**
     * Testează dacă un URL există (nu returnează 404)
     */
    async testUrlExists(url) {
        try {
            const response = await this.axiosInstance.head(url);
            console.log(`[UrlFallback] ✅ URL exists: ${url} (Status: ${response.status})`);
            return { exists: true, status: response.status };
        } catch (error) {
            const status = error.response?.status || 0;
            if (status === 404) {
                console.log(`[UrlFallback] ❌ URL not found (404): ${url}`);
                return { exists: false, status: 404, error: 'Not Found' };
            } else {
                console.log(`[UrlFallback] ⚠️ URL test failed: ${url} (Status: ${status}, Error: ${error.message})`);
                return { exists: false, status, error: error.message };
            }
        }
    }

    /**
     * Încearcă să găsească URL-ul corect pentru o cale folosind fallback inteligent
     * Testează variantele în ordinea priorității și se oprește la primul succes
     */
    async findWorkingUrl(baseUrl, path) {
        const variants = this.languageDetector.generateUrlVariants(baseUrl, path);
        
        console.log(`[UrlFallback] Testing ${variants.length} URL variants for path: ${path} (sorted by priority)`);
        
        // Încearcă fiecare variantă în ordinea priorității (au fost sortate deja)
        for (const variant of variants) {
            const langInfo = variant.language ? ` (${variant.language})` : '';
            console.log(`[UrlFallback] Testing priority ${variant.priority || 'default'}: ${variant.url}${langInfo}`);
            
            const result = await this.testUrlExists(variant.url);
            if (result.exists) {
                console.log(`[UrlFallback] ✅ SUCCESS! Found working URL on first try: ${variant.url}`);
                
                // Dacă găsim un URL cu limbă care funcționează, salvăm limba pentru viitor
                if (variant.language) {
                    this.languageDetector.siteLanguagePattern = variant.language;
                    console.log(`[UrlFallback] 🎯 Detected site language: ${variant.language} - will prioritize for future URLs`);
                }
                
                return {
                    url: variant.url,
                    type: variant.type,
                    status: result.status,
                    description: variant.description,
                    language: variant.language
                };
            }
        }

        console.log(`[UrlFallback] ❌ No working URL found after testing ${variants.length} variants for path: ${path}`);
        return null;
    }

    /**
     * Procesează o listă de căi și returnează doar URL-urile care funcționează
     */
    async filterWorkingUrls(baseUrl, paths) {
        const workingUrls = [];
        const batchSize = 5; // Procesează 5 URL-uri în paralel
        
        console.log(`[UrlFallback] Filtering ${paths.length} URLs in batches of ${batchSize}`);
        
        for (let i = 0; i < paths.length; i += batchSize) {
            const batch = paths.slice(i, i + batchSize);
            const promises = batch.map(path => this.findWorkingUrl(baseUrl, path));
            
            const results = await Promise.all(promises);
            
            results.forEach((result, index) => {
                if (result) {
                    workingUrls.push(result.url);
                    console.log(`[UrlFallback] ✅ Batch ${Math.floor(i/batchSize) + 1}: ${result.url}`);
                } else {
                    console.log(`[UrlFallback] ❌ Batch ${Math.floor(i/batchSize) + 1}: No working URL for ${batch[index]}`);
                }
            });
        }
        
        console.log(`[UrlFallback] Final result: ${workingUrls.length}/${paths.length} working URLs found`);
        return workingUrls;
    }

    /**
     * Generează URL-uri inteligente pentru common paths bazat pe pattern-ul site-ului
     */
    generateIntelligentCommonPaths(baseUrl) {
        const commonPaths = [
            'about', 'contact', 'services', 'products', 'blog', 'news', 
            'pricing', 'features', 'support', 'help', 'faq'
        ];
        
        return commonPaths.map(path => {
            // Folosește languageDetector pentru a genera URL-ul corect
            return this.languageDetector.generateCorrectUrl(baseUrl, path);
        }).filter(url => url !== null);
    }

    /**
     * Analiza inițială a site-ului pentru a detecta pattern-ul de limbă
     */
    async analyzeSiteStructure(initialUrls) {
        console.log(`[UrlFallback] Analyzing site structure with ${initialUrls.length} initial URLs`);
        
        // Permite languageDetector să analizeze URL-urile
        const analysis = this.languageDetector.analyzeSiteLanguagePattern(initialUrls);
        
        console.log(`[UrlFallback] Site analysis complete:`, analysis);
        return analysis;
    }
}

module.exports = UrlFallbackHandler;