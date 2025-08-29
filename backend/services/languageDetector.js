class LanguageDetector {
    constructor() {
        // Common language codes (ISO 639-1)
        this.commonLanguages = [
            'en', 'ro', 'ru', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 
            'cs', 'sk', 'hu', 'bg', 'hr', 'sr', 'sl', 'lt', 'lv', 'et',
            'fi', 'da', 'no', 'sv', 'is', 'tr', 'ar', 'he', 'zh', 'ja',
            'ko', 'th', 'vi', 'hi', 'bn', 'ur', 'fa', 'sw', 'am'
        ];
        this.detectedLanguages = new Set();
        this.siteLanguagePattern = null;
    }

    /**
     * Detectează dacă un URL conține un cod de limbă
     */
    detectLanguageInUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathSegments = urlObj.pathname.split('/').filter(s => s.length > 0);
            
            if (pathSegments.length > 0) {
                const firstSegment = pathSegments[0].toLowerCase();
                if (this.commonLanguages.includes(firstSegment)) {
                    return firstSegment;
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Analizează multiple URL-uri pentru a detecta pattern-ul de limbă al site-ului
     */
    analyzeSiteLanguagePattern(urls) {
        const languagesFound = new Set();
        let urlsWithLanguage = 0;
        let totalUrls = urls.length;

        urls.forEach(url => {
            const lang = this.detectLanguageInUrl(url);
            if (lang) {
                languagesFound.add(lang);
                urlsWithLanguage++;
            }
        });

        // Dacă mai mult de 50% din URL-uri au limbă, site-ul folosește limba în URL
        const usesLanguageInUrl = (urlsWithLanguage / totalUrls) > 0.5;
        
        if (usesLanguageInUrl) {
            this.siteLanguagePattern = Array.from(languagesFound)[0]; // Folosește prima limbă găsită
            console.log(`[LanguageDetector] Site uses language in URL. Detected languages: ${Array.from(languagesFound).join(', ')}`);
            console.log(`[LanguageDetector] Selected primary language: ${this.siteLanguagePattern}`);
        } else {
            this.siteLanguagePattern = null;
            console.log(`[LanguageDetector] Site does NOT use language in URL structure`);
        }

        return {
            usesLanguageInUrl,
            detectedLanguages: Array.from(languagesFound),
            primaryLanguage: this.siteLanguagePattern
        };
    }

    /**
     * Generează URL-ul corect pentru o pagină bazat pe pattern-ul detectat
     */
    generateCorrectUrl(baseUrl, path) {
        try {
            const urlObj = new URL(baseUrl);
            
            if (this.siteLanguagePattern) {
                // Site-ul folosește limba în URL - adaugă limba
                const cleanPath = path.startsWith('/') ? path.substring(1) : path;
                urlObj.pathname = `/${this.siteLanguagePattern}/${cleanPath}`;
            } else {
                // Site-ul NU folosește limba în URL
                urlObj.pathname = path.startsWith('/') ? path : `/${path}`;
            }
            
            return urlObj.href;
        } catch (error) {
            return null;
        }
    }

    /**
     * Generează variante de domeniu (cu și fără www)
     */
    generateDomainVariants(baseUrl) {
        try {
            const urlObj = new URL(baseUrl);
            const variants = [];
            
            // Varianta originală
            variants.push(baseUrl);
            
            // Dacă are www, adaugă varianta fără www
            if (urlObj.hostname.startsWith('www.')) {
                const nonWwwUrl = baseUrl.replace('://www.', '://');
                variants.push(nonWwwUrl);
            } else {
                // Dacă nu are www, adaugă varianta cu www
                const wwwUrl = baseUrl.replace('://', '://www.');
                variants.push(wwwUrl);
            }
            
            return variants;
        } catch (error) {
            return [baseUrl];
        }
    }

    /**
     * Generează variante de URL pentru testare (cu și fără limba + cu și fără www)
     * ÎNTOTDEAUNA include variante cu limbile comune (ro, en, ru)
     */
    generateUrlVariants(baseUrl, path) {
        const variants = [];
        const domainVariants = this.generateDomainVariants(baseUrl);
        const commonLanguagesToTry = ['ro', 'en', 'ru']; // Limbile pe care le testăm întotdeauna
        
        try {
            // Pentru fiecare variantă de domeniu
            domainVariants.forEach(domainUrl => {
                const urlObj = new URL(domainUrl);
                
                // Varianta 1: fără limbă (testăm ultima pentru a da prioritate limbii)
                urlObj.pathname = path.startsWith('/') ? path : `/${path}`;
                variants.push({
                    url: urlObj.href,
                    type: 'no-language',
                    description: `URL without language code (${urlObj.hostname})`,
                    priority: 3 // Cea mai mică prioritate
                });

                // Variante 2-4: cu limbile comune (testăm ÎNTOTDEAUNA)
                commonLanguagesToTry.forEach(lang => {
                    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
                    const langPath = `/${lang}/${cleanPath}`;
                    urlObj.pathname = langPath;
                    
                    // Dacă avem deja o limba detectată, dă-i prioritate maximă
                    let priority;
                    if (this.siteLanguagePattern === lang) {
                        priority = 0; // Prioritate maximă pentru limba detectată
                    } else if (lang === 'ro') {
                        priority = 1; // Română default priority
                    } else {
                        priority = 2; // en/ru priority
                    }
                    
                    variants.push({
                        url: urlObj.href,
                        type: 'with-language',
                        description: `URL with language: ${lang} (${urlObj.hostname})`,
                        language: lang,
                        priority: priority
                    });
                });
            });

        } catch (error) {
            console.warn(`[LanguageDetector] Error generating variants for ${baseUrl}${path}:`, error.message);
        }
        
        // Sortează variantele după prioritate (mai mică = mai importante)
        variants.sort((a, b) => (a.priority || 99) - (b.priority || 99));
        
        return variants;
    }

    /**
     * Reset detector pentru un nou site
     */
    reset() {
        this.detectedLanguages.clear();
        this.siteLanguagePattern = null;
    }
}

module.exports = LanguageDetector;