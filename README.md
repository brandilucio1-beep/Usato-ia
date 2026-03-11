# 📱 UsatoIA — Analisi Prezzi Smartphone Usati in Italia

App web fullstack con **scraping reale** dai principali marketplace italiani dell'usato, aggiornamento automatico ogni 6 ore, analisi trend e prezzi consigliati con IA.

## 🔥 Funzionalità

- **Scraping reale** da Subito.it, Facebook Marketplace, Kijiji, Wallapop
- **Aggiornamento automatico** ogni 6 ore (configurabile)
- **85+ modelli** di smartphone monitorati (Apple, Samsung, Xiaomi, Google, OnePlus, ecc.)
- **Preferiti** con confronto rapido
- **Trend di mercato** — prezzi in salita/discesa, più ricercati, miglior mantenimento valore
- **Mappa regionale** — distribuzione annunci e prezzi per tutte le 20 regioni
- **Analisi IA** con Claude — verdetto, consigli acquisto/vendita, rischio
- **Prezzi per condizione** — da "come nuovo" a "da riparare"
- **Solo privati** — nessun sito di ricondizionati

## 🏗️ Architettura

```
usato-ia/
├── server/                  # Backend Node.js + Express
│   ├── index.js             # Server + cron scheduler
│   ├── models/              # SQLite database + migrations
│   ├── scrapers/            # Scraper per ogni fonte
│   │   ├── subito.js        # Subito.it (HTML + API interna)
│   │   ├── kijiji.js        # Kijiji.it (HTML parsing)
│   │   ├── wallapop.js      # Wallapop (API pubblica)
│   │   └── facebook.js      # FB Marketplace (Puppeteer)
│   ├── routes/api.js        # REST API
│   └── jobs/scrapeAll.js    # Job di scraping completo
├── client/                  # Frontend React + Vite
│   └── src/
│       ├── pages/           # Pagine (Cerca, Dettaglio, Preferiti, Trend, Regioni)
│       ├── components/      # Componenti riutilizzabili
│       └── utils/api.js     # Client API
└── .env.example             # Configurazione
```

## 🚀 Setup Rapido (Locale)

### Prerequisiti
- Node.js 18+ 
- npm o yarn

### 1. Clona e installa

```bash
cd usato-ia
cp .env.example .env
npm run setup
```

### 2. Configura `.env`

```env
PORT=3001
NODE_ENV=development
DATABASE_PATH=./data/usato-ia.db
SCRAPE_INTERVAL_HOURS=6

# Opzionale: per analisi IA
ANTHROPIC_API_KEY=sk-ant-...

# Opzionale: per Facebook Marketplace
# Richiede Puppeteer installato
PUPPETEER_HEADLESS=true
```

### 3. Avvia

```bash
# Avvia server + client in parallelo
npm run dev

# Oppure separatamente:
npm run dev:server   # http://localhost:3001
npm run dev:client   # http://localhost:5173
```

### 4. Primo scraping

Il primo scraping parte automaticamente all'avvio. Puoi anche forzarlo:

```bash
# Da terminale
npm run scrape

# O via API
curl -X POST http://localhost:3001/api/admin/scrape
```

## ☁️ Deploy su Railway (Consigliato)

[Railway](https://railway.app) è la soluzione più semplice: supporta Node.js, cron jobs, e ha un piano gratuito.

### 1. Crea account su Railway

Vai su [railway.app](https://railway.app) e registrati con GitHub.

### 2. Deploy

```bash
# Installa Railway CLI
npm install -g @railway/cli

# Login
railway login

# Crea progetto
railway init

# Configura variabili
railway variables set PORT=3001
railway variables set NODE_ENV=production
railway variables set DATABASE_PATH=./data/usato-ia.db
railway variables set SCRAPE_INTERVAL_HOURS=6
railway variables set ANTHROPIC_API_KEY=sk-ant-...

# Deploy
railway up
```

### 3. Alternativa: Render.com

1. Vai su [render.com](https://render.com)
2. "New Web Service" → collega il tuo repo GitHub
3. Build command: `cd client && npm install && npm run build && cd ../server && npm install`
4. Start command: `cd server && node index.js`
5. Aggiungi le variabili d'ambiente

## 📡 API Endpoints

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| GET | `/api/phones` | Lista smartphone (con filtri: search, brand, sort, minPrice, maxPrice) |
| GET | `/api/phones/:id` | Dettaglio smartphone con trend, regioni, annunci |
| GET | `/api/phones/:id/listings` | Annunci attivi per un modello |
| GET | `/api/trends` | Trend di mercato (gainers, losers, popular, best value) |
| GET | `/api/regions` | Statistiche per regione |
| GET | `/api/favorites` | Lista preferiti |
| POST | `/api/favorites/:phoneId` | Aggiungi preferito |
| DELETE | `/api/favorites/:phoneId` | Rimuovi preferito |
| POST | `/api/analyze/:phoneId` | Analisi IA del modello |
| GET | `/api/status` | Stato sistema e ultimo scraping |
| POST | `/api/admin/scrape` | Forza scraping manuale |

## ⚙️ Configurazione Scraping

### Anti-ban
- **Delay tra richieste**: 2-4 secondi (configurabile in `.env`)
- **Rotazione User-Agent**: 5 UA diversi
- **Proxy**: supporto proxy HTTP/HTTPS opzionale
- **Rate limiting**: rispettoso delle piattaforme

### Proxies (Produzione)
Per scraping intensivo in produzione, è consigliato usare un proxy rotante:

```env
PROXY_URL=http://user:pass@proxy.provider.com:port
```

Servizi consigliati: BrightData, Oxylabs, SmartProxy.

### Facebook Marketplace
FB Marketplace richiede Puppeteer (browser headless). Su Railway/Render:

```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

Se non disponibile, lo scraper FB viene semplicemente saltato.

## 🔧 Manutenzione

### Aggiungere nuovi modelli

Modifica `server/models/migrate.js` → funzione `seedPhoneModels()`, poi:

```bash
# Resetta DB e riseed
rm server/data/usato-ia.db
npm run dev:server
```

### Log
I log sono in `server/logs/`:
- `combined.log` — tutti i log
- `error.log` — solo errori

### Database
SQLite, file singolo in `server/data/usato-ia.db`. Backup semplice:

```bash
cp server/data/usato-ia.db server/data/backup-$(date +%Y%m%d).db
```

## 📝 Note Importanti

- **Solo usato privato**: nessun sito di ricondizionati (BackMarket, Swappie, ecc.)
- **Scraping etico**: delay rispettosi, no sovraccarico dei server
- **I prezzi sono indicativi**: basati su medie degli annunci attivi
- **Facebook Marketplace**: il più fragile, i selettori CSS cambiano spesso
- **Subito.it**: la fonte più affidabile, con API interna documentata
- **Wallapop**: API pubblica stabile, ma meno volume in Italia
