# Google Gemini API Setup

Google Gemini este acum furnizorul principal pentru generarea de conținut AI. Este **gratuit** pentru majoritatea utilizărilor și oferă performanțe excelente pentru limba română.

## Cum să obții API Key-ul Gemini (Gratuit)

1. **Vizitează Google AI Studio**:
   - Accesează https://makersuite.google.com/app/apikey
   - Sau https://aistudio.google.com/app/apikey

2. **Autentifică-te cu contul Google**:
   - Folosește orice cont Google personal sau de business

3. **Creează API Key-ul**:
   - Click pe "Create API Key"
   - Selectează un proiect Google Cloud (sau creează unul nou - gratuit)
   - Copiază API key-ul generat

4. **Adaugă în .env**:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

## Limite gratuite Gemini

- **15 cereri pe minut**
- **1,500 cereri pe zi**
- **1 milion de token-uri pe lună**

Aceste limite sunt suficiente pentru majoritatea utilizărilor SaaS!

## Alternative AI

### OpenAI GPT (Plătit)
- Necesită card de credit
- ~$0.03 per articol generat
- API Key: https://platform.openai.com/account/api-keys

### Anthropic Claude (Plătit)
- Necesită card de credit
- ~$0.05 per articol generat
- API Key: https://console.anthropic.com/account/keys

## Ordinea de prioritate

Aplicația va încerca furnizerii în următoarea ordine:
1. **Gemini** (gratuit, recomandat)
2. **OpenAI** (plătit)
3. **Claude** (plătit)
4. **Fallback content** (conținut generat local)

## Testare

După configurare, testează generarea unui articol din frontend. Verifică log-urile din backend pentru a confirma ce furnizor este folosit:

```
✅ Using Gemini AI provider
🤖 Article generated successfully with Gemini
```

## Probleme comune

**Error: "API key not found"**
- Verifică că ai adăugat GEMINI_API_KEY în .env
- Restartează serverul backend

**Error: "Quota exceeded"**
- Ai depășit limitele gratuite pentru ziua curentă
- Așteaptă 24h sau configurează un API key de backup

**Error: "Safety settings blocked"**
- Gemini a blocat conținutul din motive de siguranță
- Aplicația va încerca un furnizor alternativ automat