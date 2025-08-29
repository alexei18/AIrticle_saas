# 🚀 Setup Rapid - AIrticle SaaS Platform

## Pași pentru pornire rapidă:

### 1. 📋 Prerequisites
- XAMPP (Apache + MySQL)
- Node.js (v18+)
- npm sau yarn

### 2. 🗄️ Database Setup
1. Pornește XAMPP (Apache + MySQL)
2. Accesează phpMyAdmin: `http://localhost/phpmyadmin`
3. Importă fișierul: `database/semrush_saas.sql`

### 3. 🔧 Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

Editează `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=semrush_saas
DB_USER=root
DB_PASSWORD=
JWT_SECRET=your-super-secret-jwt-key-here-change-this
```

Pornește backend:
```bash
npm run dev
```
✅ Backend live: http://localhost:5000

### 4. 🎨 Frontend Setup
```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Editează `.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

Pornește frontend:
```bash
npm run dev
```
✅ Frontend live: http://localhost:3000

## 🎯 Conturi de test

### Demo Account:
- Email: `demo@semrush-saas.com`
- Parolă: `demo123`

### Pentru a crea cont nou:
1. Accesează: http://localhost:3000/register
2. Completează formularul
3. Primești 14 zile trial gratuit

## 🛠️ Funcționalități implementate:

### ✅ Pagini complete:
- Landing page responsive
- Login/Register cu validări
- Dashboard cu analytics
- Website management 
- Keyword research AI
- Article generation AI
- Settings complete

### ✅ API Backend:
- 28+ endpoints REST
- Authentication JWT
- Database MySQL cu Sequelize
- AI integration (OpenAI + Claude)
- Website crawler
- Keyword research engine

### ✅ AI Features:
- Content generation cu GPT-4/Claude
- Keyword research inteligent
- SEO optimization automată
- Website analysis completă

## 🐛 Troubleshooting

### Erori comune:

**1. MySQL Connection Error:**
- Verifică că XAMPP MySQL rulează
- Verifică credențialele în .env

**2. CORS Errors:**
- Verifică că backend rulează pe port 5000
- Verifică API_BASE_URL în frontend .env.local

**3. Module not found errors:**
```bash
# În frontend
npm install @mantine/form @mantine/spotlight
```

**4. Database errors:**
- Re-importă database/semrush_saas.sql
- Verifică că baza de date 'semrush_saas' există

### API Keys pentru AI (opțional):
Pentru production, adaugă în backend .env:
```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## 🚀 Deploy în producție:

### Quick deploy:
1. Configurează baza de date pentru producție
2. Actualizează variabilele de mediu
3. Build frontend: `npm run build`
4. Deploy pe server (Vercel, Netlify, AWS, etc.)

### Features gata pentru producție:
- ✅ Security implementată
- ✅ Error handling complet
- ✅ Performance optimizată
- ✅ Responsive design
- ✅ Plan limits enforcement
- ✅ Usage tracking

## 📞 Support

Pentru probleme de setup sau întrebări:
1. Verifică acest fișier SETUP.md
2. Verifică README.md pentru detalii complete
3. Verifică logs-urile în console pentru erori

---

**🎉 Platformă gata de lansare cu toate funcționalitățile implementate!**




Acum toate paginile care au scorul 42 si sunt multe au eroare 404 daca
  oricum se extrage continutul de pe ea. Erroarea este din cauza ca la noi
  analiza nu alege o liba pentru intreg websiteul ar trebui linkurile sa fie       
  asa https://www.bravin.io/ro/about nu https://www.bravin.io/about websiteul      
  e configurat astfel in cit url sa contina limba, eu vreau ca la analiza
  paginilor sa se aleaga o limba si sa ramina consisten nu sa excluda limba        
  din website complet spre exemplu nu vreau sa se intimple asta ca sa anlizeze     
    https://www.bravin.io/ru/about , https://www.bravin.io/ro/about si
  https://www.bravin.io/en/about nu are rost dar daca se vede ca structura
  url-ului este cu /ro, ru, sau /en sau orice alta limba sa se alaeaga una si      
  sa se mearga cu ea inainte fara a exclude complet limba din url la multe
  websiteurii aceasta e necesara in url astfel nu merge. Facem asa daca se
  cauata url fara limba si este eroare 404 la citeva paginii se reanalizeaza       
  siteul cu limba deja in url. Pentru a acoperii ambele cazurii cind este
  necesar limba in url si cind nu e. Acum scrie totul ce trebuie sa faci in        
  history.md si dupa completarea fiecarui punct trecel ca terminat. Pentru a       
  avea un istoric in caz de inrerupere si repornire pentru a nu pierde datele.    