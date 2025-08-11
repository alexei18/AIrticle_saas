# SEMrush Integration Guide

## Prezentare Generală

Integrarea SEMrush a fost implementată cu succes în sistemul SEO SaaS, oferind capabilități avansate de analiză keywords și performanță domeniilor.

## Funcționalități Implementate

### 🔍 Analiza Keywords cu SEMrush
- Extragere keywords relacionate din SEMrush
- Date reale despre volumul de căutare, dificultate și CPC
- Combinarea datelor Google Suggestions cu datele SEMrush pentru rezultate complete

### 📊 Analiza Domeniilor
- Metrics complete pentru domenii (traffic organic, keywords, concurenți)
- Calculul scorului SEO bazat pe datele reale SEMrush
- Identificarea concurenților principali

### 🎯 Sistema de Scoring Îmbunătățit
- Score global calculat din multiple surse:
  - Analiză tehnică (25%)
  - Analiză conținut (20%) 
  - Analiză SEO (25%)
  - Date SEMrush (30%) - cea mai mare pondere

### 📈 Recomandări Avansate
- Recomandări bazate pe datele reale de performanță
- Strategii pentru creșterea keywords-urilor organice
- Sugestii pentru optimizarea traficului

## Configurare

### 1. Adăugarea API Key-ului SEMrush

Creează/actualizează fișierul `.env` în directorul `backend/`:

```bash
# SEMrush API Configuration
SEMRUSH_API_KEY=your_semrush_api_key_here

# Existing configurations
OPENAI_API_KEY=your_openai_key
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=semrush_saas
```

### 2. Instalarea Dependințelor

```bash
cd backend
npm install csv-parse
```

### 3. Rularea Migrației

```bash
# Rulează migrația pentru coloana semrush_report
npx sequelize-cli db:migrate --config config/config.json
```

Sau manual în MySQL:
```sql
ALTER TABLE analyses ADD COLUMN semrush_report JSON DEFAULT NULL;
```

## Utilizare

### 1. Research Keywords cu SEMrush

```http
POST /api/keywords/research
Content-Type: application/json

{
  "seedKeyword": "marketing digital",
  "websiteId": 1,
  "language": "ro",
  "maxSuggestions": 50,
  "useSEMrush": true
}
```

**Răspuns cu date îmbunătățite:**
```json
{
  "research": {
    "keywords": [
      {
        "keyword": "marketing digital bucuresti",
        "searchVolume": 2400,
        "difficulty": 45.2,
        "cpc": 1.25,
        "competition": 0.67,
        "intentType": "commercial",
        "sources": ["google", "semrush"]
      }
    ],
    "semrushEnhanced": true
  }
}
```

### 2. Analiza Completă Domain cu SEMrush

```http
POST /api/keywords/domain-analysis
Content-Type: application/json

{
  "websiteId": 1,
  "language": "ro"
}
```

**Răspuns:**
```json
{
  "analysis": {
    "domain": "example.com",
    "seoScore": 67,
    "domainMetrics": {
      "organicKeywords": 234,
      "organicTraffic": 5420,
      "organicCost": 12500,
      "rank": 145000
    },
    "competitors": [...],
    "topKeywords": [...],
    "recommendations": [...]
  }
}
```

### 3. Analiza Website cu Integrare SEMrush

```http
POST /api/analysis/trigger
Content-Type: application/json

{
  "websiteId": 1,
  "useSEMrush": true,
  "language": "ro"
}
```

### 4. Keywords Overview Real-time

```http
POST /api/keywords/semrush-overview
Content-Type: application/json

{
  "keywords": ["marketing digital", "seo audit", "optimizare google"],
  "language": "ro"
}
```

### 5. Analiza Concurenților

```http
GET /api/keywords/competitors/1?language=ro
```

## Endpoints Noi Implementate

| Endpoint | Metodă | Descriere |
|----------|--------|-----------|
| `/api/keywords/domain-analysis` | POST | Analiză completă domeniu cu SEMrush |
| `/api/keywords/semrush-overview` | POST | Datele keywords din SEMrush |
| `/api/keywords/competitors/:websiteId` | GET | Analiza concurenților |

## Servicii Noi

### SEMrushService
- **Locație:** `backend/services/semrushService.js`
- **Funcționalități:**
  - Comunicare cu API-ul SEMrush
  - Parsare răspunsuri CSV
  - Calculul scorului SEO
  - Generarea recomandărilor

### Extensii KeywordResearcher
- **Locație:** `backend/services/keywordResearch.js`
- **Funcționalități noi:**
  - `getSEMrushKeywords()` - integrare keywords SEMrush
  - `mergeKeywordData()` - combinarea datelor
  - `getDomainSEOAnalysis()` - analiză completă domeniu

### Extensii WebsiteAnalyzer
- **Locație:** `backend/services/websiteAnalyzer.js`
- **Funcționalități noi:**
  - `performSEMrushAnalysis()` - analiză SEMrush
  - `calculateEnhancedScore()` - scoring îmbunătățit
  - `generateEnhancedRecommendations()` - recomandări avansate

## Modele de Date Actualizate

### Analysis Model
**Câmp nou adăugat:**
- `semrushReport` (JSON) - stochează datele complete SEMrush

## Parametri și Opțiuni

### Limguages Suportate
- `ro` - România (database: 'ro')
- `en` - English (database: 'us')

### Parametri de Configurare
- `useSEMrush` - activează/dezactivează integrarea (default: true)
- `language` - limba pentru analiza SEMrush (default: 'ro')
- `maxSuggestions` - numărul maxim de keywords (default: 50)

## Testare

Pentru a testa integrarea:

1. **Verifică configurația:**
```bash
node -e "console.log(process.env.SEMRUSH_API_KEY ? 'API Key configured' : 'API Key missing')"
```

2. **Test basic cu o cerere:**
```bash
curl -X POST http://localhost:3001/api/keywords/semrush-overview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"keywords": ["marketing digital"], "language": "ro"}'
```

## Monitorizare și Logging

Sistemul loghează:
- `[SEMrushService]` - operațiuni API SEMrush
- `[KeywordResearcher]` - procesele de research keywords
- `[Analyzer]` - analizele website cu SEMrush

## Rate Limits și Costuri

⚠️ **Important:** SEMrush API are costuri pe request. Vezi documentația SEMrush pentru:
- Rate limits per minute/oră
- Costuri per tip de request
- Limite de credite disponibile

## Troubleshooting

### Probleme Comune

1. **"SEMrush API key is not configured"**
   - Verifică că `SEMRUSH_API_KEY` este setat în `.env`

2. **"CSV parsing failed"**
   - Verifică că răspunsul SEMrush este valid
   - Poate indica probleme cu API key-ul

3. **"SEMrush enhancement failed"**
   - Sistemul va continua cu datele Google/AI
   - Verifică logs pentru detalii specifice

### Debug Mode

Pentru mai multe logs, setează în `.env`:
```bash
NODE_ENV=development
DEBUG=semrush:*
```

## Următorii Pași

Funcționalități care ar putea fi adăugate:
- Cache pentru răspunsurile SEMrush
- Monitoring API usage
- Rapoarte comparative în timp
- Export date către dashboard-uri externe