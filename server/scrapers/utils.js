const axios = require('axios');
const logger = require('../utils/logger');

const ITALIAN_REGIONS = {
  'lombardia': 'Lombardia', 'lazio': 'Lazio', 'campania': 'Campania',
  'sicilia': 'Sicilia', 'veneto': 'Veneto', 'emilia-romagna': 'Emilia-Romagna',
  'emilia romagna': 'Emilia-Romagna', 'piemonte': 'Piemonte', 'puglia': 'Puglia',
  'toscana': 'Toscana', 'calabria': 'Calabria', 'sardegna': 'Sardegna',
  'liguria': 'Liguria', 'marche': 'Marche', 'abruzzo': 'Abruzzo',
  'friuli-venezia giulia': 'Friuli-Venezia Giulia', 'friuli venezia giulia': 'Friuli-Venezia Giulia',
  'trentino-alto adige': 'Trentino-Alto Adige', 'trentino alto adige': 'Trentino-Alto Adige',
  'umbria': 'Umbria', 'basilicata': 'Basilicata', 'molise': 'Molise',
  'valle d\'aosta': "Valle d'Aosta", 'valle daosta': "Valle d'Aosta",
  // Province -> Region mapping (major cities)
  'milano': 'Lombardia', 'roma': 'Lazio', 'napoli': 'Campania',
  'torino': 'Piemonte', 'palermo': 'Sicilia', 'genova': 'Liguria',
  'bologna': 'Emilia-Romagna', 'firenze': 'Toscana', 'bari': 'Puglia',
  'catania': 'Sicilia', 'venezia': 'Veneto', 'verona': 'Veneto',
  'messina': 'Sicilia', 'padova': 'Veneto', 'trieste': 'Friuli-Venezia Giulia',
  'brescia': 'Lombardia', 'parma': 'Emilia-Romagna', 'modena': 'Emilia-Romagna',
  'reggio calabria': 'Calabria', 'reggio emilia': 'Emilia-Romagna',
  'perugia': 'Umbria', 'cagliari': 'Sardegna', 'taranto': 'Puglia',
  'livorno': 'Toscana', 'prato': 'Toscana', 'foggia': 'Puglia',
  'salerno': 'Campania', 'rimini': 'Emilia-Romagna', 'bergamo': 'Lombardia',
  'ferrara': 'Emilia-Romagna', 'ravenna': 'Emilia-Romagna', 'siracusa': 'Sicilia',
  'sassari': 'Sardegna', 'monza': 'Lombardia', 'pescara': 'Abruzzo',
  'trento': 'Trentino-Alto Adige', 'bolzano': 'Trentino-Alto Adige',
  'ancona': 'Marche', 'lecce': 'Puglia', 'como': 'Lombardia',
  'pesaro': 'Marche', 'udine': 'Friuli-Venezia Giulia', 'arezzo': 'Toscana',
  'vicenza': 'Veneto', 'treviso': 'Veneto', 'novara': 'Piemonte',
  'piacenza': 'Emilia-Romagna', 'catanzaro': 'Calabria', 'cosenza': 'Calabria',
  'varese': 'Lombardia', 'potenza': 'Basilicata', 'campobasso': 'Molise',
  'aosta': "Valle d'Aosta", 'isernia': 'Molise', 'matera': 'Basilicata',
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
];

const CONDITIONS_MAP = {
  'come nuovo': 'come_nuovo', 'nuovo': 'come_nuovo', 'pari al nuovo': 'come_nuovo',
  'ottime condizioni': 'ottime', 'ottimo': 'ottime', 'ottimo stato': 'ottime', 'perfetto': 'ottime',
  'buone condizioni': 'buone', 'buono': 'buone', 'buono stato': 'buone', 'usato': 'buone',
  'condizioni accettabili': 'accettabili', 'accettabile': 'accettabili', 'discreto': 'accettabili',
  'da riparare': 'da_riparare', 'rotto': 'da_riparare', 'difettoso': 'da_riparare', 'non funzionante': 'da_riparare',
};

function resolveRegion(locationStr) {
  if (!locationStr) return null;
  const lower = locationStr.toLowerCase().trim();
  
  // Direct match
  if (ITALIAN_REGIONS[lower]) return ITALIAN_REGIONS[lower];
  
  // Check if any key is contained in the string
  for (const [key, region] of Object.entries(ITALIAN_REGIONS)) {
    if (lower.includes(key)) return region;
  }
  return null;
}

function normalizeCondition(conditionStr) {
  if (!conditionStr) return null;
  const lower = conditionStr.toLowerCase().trim();
  if (CONDITIONS_MAP[lower]) return CONDITIONS_MAP[lower];
  for (const [key, val] of Object.entries(CONDITIONS_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = 3) {
  const delay = parseInt(process.env.REQUEST_DELAY_MS) || 2000;
  
  for (let i = 0; i < retries; i++) {
    try {
      await sleep(delay + Math.random() * 1000);
      
      const config = {
        url,
        method: options.method || 'GET',
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          ...options.headers,
        },
        timeout: 15000,
        maxRedirects: 5,
        ...(process.env.PROXY_URL ? { proxy: false, httpsAgent: new (require('https-proxy-agent'))(process.env.PROXY_URL) } : {}),
      };

      const response = await axios(config);
      return response;
    } catch (err) {
      logger.warn(`Fetch attempt ${i + 1}/${retries} failed for ${url}: ${err.message}`);
      if (i === retries - 1) throw err;
      await sleep(delay * (i + 1));
    }
  }
}

function extractPrice(text) {
  if (!text) return null;
  // Match patterns like €450, 450€, 450,00€, EUR 450, 450 euro
  const patterns = [
    /€\s*([\d.,]+)/,
    /([\d.,]+)\s*€/,
    /EUR\s*([\d.,]+)/i,
    /([\d.,]+)\s*euro/i,
    /([\d.]+),(\d{2})/,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let price = match[1] || match[0];
      price = price.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(price);
      if (num > 10 && num < 5000) return num; // Sanity check for phone prices
    }
  }
  return null;
}

module.exports = {
  resolveRegion,
  normalizeCondition,
  getRandomUserAgent,
  sleep,
  fetchWithRetry,
  extractPrice,
  ITALIAN_REGIONS,
  CONDITIONS_MAP,
};
