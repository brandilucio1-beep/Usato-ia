const express = require('express');
const router = express.Router();
const Database = require('../models/db');
const logger = require('../utils/logger');

// ─── Phone Models ─────────────────────────────────────────────────────────────
router.get('/phones', (req, res) => {
  try {
    const { search, brand, minPrice, maxPrice, sort, limit = 100, offset = 0 } = req.query;
    
    let phones = search ? Database.searchPhones(search) : Database.getAllPhones();
    
    // Enrich with latest snapshot data
    phones = phones.map(p => {
      const snapshot = Database.getLatestSnapshot(p.id);
      return {
        ...p,
        avg_price: snapshot?.avg_price || p.current_avg_price || null,
        min_price: snapshot?.min_price || p.current_min_price || null,
        max_price: snapshot?.max_price || p.current_max_price || null,
        total_listings: snapshot?.total_listings || p.active_listings || 0,
        listings_by_region: snapshot?.listings_by_region ? JSON.parse(snapshot.listings_by_region) : {},
        listings_by_source: snapshot?.listings_by_source ? JSON.parse(snapshot.listings_by_source) : {},
        listings_by_condition: snapshot?.listings_by_condition ? JSON.parse(snapshot.listings_by_condition) : {},
        prices_by_region: snapshot?.prices_by_region ? JSON.parse(snapshot.prices_by_region) : {},
        prices_by_condition: snapshot?.prices_by_condition ? JSON.parse(snapshot.prices_by_condition) : {},
        last_snapshot: snapshot?.snapshot_date || null,
      };
    });
    
    // Filters
    if (brand) phones = phones.filter(p => p.brand.toLowerCase() === brand.toLowerCase());
    if (minPrice) phones = phones.filter(p => (p.avg_price || 0) >= parseFloat(minPrice));
    if (maxPrice) phones = phones.filter(p => (p.avg_price || Infinity) <= parseFloat(maxPrice));
    
    // Sort
    if (sort === 'price_asc') phones.sort((a, b) => (a.avg_price || 0) - (b.avg_price || 0));
    else if (sort === 'price_desc') phones.sort((a, b) => (b.avg_price || 0) - (a.avg_price || 0));
    else if (sort === 'name') phones.sort((a, b) => a.full_name.localeCompare(b.full_name));
    else phones.sort((a, b) => (b.total_listings || 0) - (a.total_listings || 0)); // default: popularity
    
    const total = phones.length;
    phones = phones.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    
    res.json({ phones, total, offset: parseInt(offset), limit: parseInt(limit) });
  } catch (err) {
    logger.error(`GET /phones error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Single Phone Detail ──────────────────────────────────────────────────────
router.get('/phones/:id', (req, res) => {
  try {
    const phone = Database.getPhoneById(parseInt(req.params.id));
    if (!phone) return res.status(404).json({ error: 'Phone not found' });
    
    const snapshot = Database.getLatestSnapshot(phone.id);
    const snapshots = Database.getSnapshots(phone.id, 180); // 6 months
    const regionalStats = Database.getRegionalStatsForPhone(phone.id);
    const recentListings = Database.getListingsForPhone(phone.id, { limit: 20 });
    
    // Calculate trend
    const trendData = snapshots.map(s => ({
      date: s.snapshot_date,
      avg_price: s.avg_price,
      median_price: s.median_price,
      total_listings: s.total_listings,
    }));
    
    // Suggested prices
    const avgPrice = snapshot?.avg_price || phone.current_avg_price || 0;
    const suggestedBuy = Math.round(avgPrice * 0.88);
    const suggestedSell = Math.round(avgPrice * 1.05);
    
    // Depreciation
    const age = new Date().getFullYear() - (phone.year_released || 2023);
    const valueRetention = avgPrice && phone.msrp_eur 
      ? Math.round((avgPrice / phone.msrp_eur) * 100) 
      : null;
    
    // Demand level
    const listings = snapshot?.total_listings || phone.active_listings || 0;
    const demandLevel = listings > 100 ? 'Alto' : listings > 30 ? 'Medio' : 'Basso';
    
    res.json({
      ...phone,
      avg_price: snapshot?.avg_price || phone.current_avg_price,
      min_price: snapshot?.min_price || phone.current_min_price,
      max_price: snapshot?.max_price || phone.current_max_price,
      total_listings: listings,
      suggested_buy: suggestedBuy,
      suggested_sell: suggestedSell,
      value_retention: valueRetention,
      demand_level: demandLevel,
      depreciation_yearly: phone.msrp_eur ? Math.round(((phone.msrp_eur - avgPrice) / phone.msrp_eur / Math.max(age, 1)) * 100) : null,
      trend_data: trendData,
      regional_stats: regionalStats,
      listings_by_condition: snapshot?.listings_by_condition ? JSON.parse(snapshot.listings_by_condition) : {},
      listings_by_source: snapshot?.listings_by_source ? JSON.parse(snapshot.listings_by_source) : {},
      prices_by_region: snapshot?.prices_by_region ? JSON.parse(snapshot.prices_by_region) : {},
      prices_by_condition: snapshot?.prices_by_condition ? JSON.parse(snapshot.prices_by_condition) : {},
      recent_listings: recentListings,
      last_snapshot: snapshot?.snapshot_date || null,
    });
  } catch (err) {
    logger.error(`GET /phones/:id error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Listings for a Phone ─────────────────────────────────────────────────────
router.get('/phones/:id/listings', (req, res) => {
  try {
    const { source, region, condition, limit = 50, offset = 0 } = req.query;
    const listings = Database.getListingsForPhone(parseInt(req.params.id), {
      source, region, condition, limit: parseInt(limit), offset: parseInt(offset)
    });
    res.json({ listings, total: listings.length });
  } catch (err) {
    logger.error(`GET /phones/:id/listings error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Trends ───────────────────────────────────────────────────────────────────
router.get('/trends', (req, res) => {
  try {
    const topTrends = Database.getTopTrends(15);
    const mostPopular = Database.getMostPopular(15);
    
    // Split trends into gainers and losers
    const gainers = topTrends.filter(t => t.price_change_pct > 0).slice(0, 10);
    const losers = topTrends.filter(t => t.price_change_pct < 0).slice(0, 10);
    
    // Best value retention
    const allPhones = Database.getAllPhones();
    const withRetention = allPhones
      .map(p => {
        const snap = Database.getLatestSnapshot(p.id);
        const avg = snap?.avg_price || p.current_avg_price;
        return {
          ...p,
          avg_price: avg,
          value_retention: avg && p.msrp_eur ? Math.round((avg / p.msrp_eur) * 100) : 0,
        };
      })
      .filter(p => p.value_retention > 0)
      .sort((a, b) => b.value_retention - a.value_retention)
      .slice(0, 15);
    
    res.json({ gainers, losers, most_popular: mostPopular, best_value: withRetention });
  } catch (err) {
    logger.error(`GET /trends error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Regional Stats ───────────────────────────────────────────────────────────
router.get('/regions', (req, res) => {
  try {
    const stats = Database.getRegionalStats();
    res.json({ regions: stats });
  } catch (err) {
    logger.error(`GET /regions error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Favorites ────────────────────────────────────────────────────────────────
router.get('/favorites', (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const favs = Database.getFavorites(userId);
    
    const enriched = favs.map(f => {
      const snap = Database.getLatestSnapshot(f.id);
      return {
        ...f,
        avg_price: snap?.avg_price || f.current_avg_price,
        total_listings: snap?.total_listings || f.active_listings || 0,
      };
    });
    
    res.json({ favorites: enriched });
  } catch (err) {
    logger.error(`GET /favorites error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/favorites/:phoneId', (req, res) => {
  try {
    const userId = req.body.userId || 'default';
    Database.addFavorite(parseInt(req.params.phoneId), userId);
    res.json({ success: true });
  } catch (err) {
    logger.error(`POST /favorites error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/favorites/:phoneId', (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    Database.removeFavorite(parseInt(req.params.phoneId), userId);
    res.json({ success: true });
  } catch (err) {
    logger.error(`DELETE /favorites error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── AI Analysis ──────────────────────────────────────────────────────────────
router.post('/analyze/:phoneId', async (req, res) => {
  try {
    const phone = Database.getPhoneById(parseInt(req.params.phoneId));
    if (!phone) return res.status(404).json({ error: 'Phone not found' });
    
    const snapshot = Database.getLatestSnapshot(phone.id);
    const regionalStats = Database.getRegionalStatsForPhone(phone.id);
    const avgPrice = snapshot?.avg_price || phone.current_avg_price || 0;
    const listings = snapshot?.total_listings || phone.active_listings || 0;
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === 'your_anthropic_api_key_here') {
      // Fallback local analysis without AI
      return res.json(generateLocalAnalysis(phone, snapshot, regionalStats));
    }
    
    const axios = require('axios');
    const topRegion = regionalStats[0]?.region || 'N/A';
    
    const aiResponse = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Sei un esperto analista del mercato smartphone usati in Italia. Analizza questi dati REALI e fornisci consigli.

Smartphone: ${phone.full_name}
Anno: ${phone.year_released}
MSRP: €${phone.msrp_eur}
Prezzo medio usato: €${Math.round(avgPrice)}
Prezzo min: €${snapshot?.min_price || 'N/A'}
Prezzo max: €${snapshot?.max_price || 'N/A'}
Annunci attivi: ${listings}
Regione top: ${topRegion} (${regionalStats[0]?.total_listings || 0} annunci)
Condizioni distribuzione: ${JSON.stringify(snapshot?.listings_by_condition ? JSON.parse(snapshot.listings_by_condition) : {})}

Rispondi SOLO con JSON valido (no markdown, no backtick):
{
  "verdict": "verdetto 1-2 frasi",
  "buyAdvice": "consiglio acquisto",
  "sellAdvice": "consiglio vendita",
  "bestTime": "periodo migliore",
  "priceOutlook": "up/stable/down",
  "riskLevel": "basso/medio/alto",
  "tips": ["tip1", "tip2", "tip3"]
}`
      }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      timeout: 30000,
    });
    
    const text = aiResponse.data.content.map(c => c.text || '').join('');
    const analysis = JSON.parse(text.replace(/```json|```/g, '').trim());
    res.json(analysis);
    
  } catch (err) {
    logger.error(`AI analysis error: ${err.message}`);
    // Fallback
    const phone = Database.getPhoneById(parseInt(req.params.phoneId));
    const snapshot = Database.getLatestSnapshot(parseInt(req.params.phoneId));
    const regionalStats = Database.getRegionalStatsForPhone(parseInt(req.params.phoneId));
    res.json(generateLocalAnalysis(phone, snapshot, regionalStats));
  }
});

function generateLocalAnalysis(phone, snapshot, regionalStats) {
  const avgPrice = snapshot?.avg_price || phone?.current_avg_price || 0;
  const age = new Date().getFullYear() - (phone?.year_released || 2023);
  const isApple = phone?.brand === 'Apple';
  
  return {
    verdict: `Il ${phone?.full_name || 'dispositivo'} mostra un prezzo medio di €${Math.round(avgPrice)} sul mercato dell'usato italiano con ${snapshot?.total_listings || 0} annunci attivi.`,
    buyAdvice: avgPrice < 300 
      ? "Fascia di prezzo accessibile. Verifica batteria e schermo prima dell'acquisto."
      : "Confronta prezzi su tutte le piattaforme. I prezzi migliori si trovano spesso su Subito.it.",
    sellAdvice: `Prezzo consigliato vendita: €${Math.round(avgPrice * 1.05)} - €${Math.round(avgPrice * 1.15)}. Foto di qualità e descrizione dettagliata accelerano la vendita.`,
    bestTime: isApple 
      ? "Vendi 1-2 mesi prima del lancio del nuovo iPhone. Compra 2-3 mesi dopo."
      : "I prezzi Android calano rapidamente. Compra 3-4 mesi dopo l'uscita per il miglior rapporto.",
    priceOutlook: age <= 1 ? "stable" : "down",
    riskLevel: isApple ? "basso" : age > 3 ? "alto" : "medio",
    tips: [
      "Controlla sempre IMEI e stato batteria",
      regionalStats?.[0] ? `${regionalStats[0].region} ha il maggior numero di offerte` : "Cerca in più regioni per trovare il prezzo migliore",
      "Evita annunci senza foto o con prezzo troppo basso"
    ]
  };
}

// ─── System Status ────────────────────────────────────────────────────────────
router.get('/status', (req, res) => {
  try {
    const lastScrape = Database.getLastScrapeTime();
    const phonesCount = Database.getAllPhones().length;
    
    res.json({
      status: 'ok',
      phones_tracked: phonesCount,
      last_scrape: lastScrape?.last_scrape || null,
      scrape_interval_hours: parseInt(process.env.SCRAPE_INTERVAL_HOURS) || 6,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
