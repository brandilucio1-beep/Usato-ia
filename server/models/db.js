const { db } = require('./migrate');

const Database = {
  // ─── Phone Models ───────────────────────────────────────────────────────
  getAllPhones() {
    return db.prepare(`
      SELECT pm.*,
        (SELECT COUNT(*) FROM listings l WHERE l.phone_model_id = pm.id AND l.is_active = 1) as active_listings,
        (SELECT AVG(l.price) FROM listings l WHERE l.phone_model_id = pm.id AND l.is_active = 1) as current_avg_price,
        (SELECT MIN(l.price) FROM listings l WHERE l.phone_model_id = pm.id AND l.is_active = 1) as current_min_price,
        (SELECT MAX(l.price) FROM listings l WHERE l.phone_model_id = pm.id AND l.is_active = 1) as current_max_price
      FROM phone_models pm
      ORDER BY pm.brand, pm.model
    `).all();
  },

  getPhoneById(id) {
    return db.prepare(`
      SELECT pm.*,
        (SELECT COUNT(*) FROM listings l WHERE l.phone_model_id = pm.id AND l.is_active = 1) as active_listings,
        (SELECT AVG(l.price) FROM listings l WHERE l.phone_model_id = pm.id AND l.is_active = 1) as current_avg_price,
        (SELECT MIN(l.price) FROM listings l WHERE l.phone_model_id = pm.id AND l.is_active = 1) as current_min_price,
        (SELECT MAX(l.price) FROM listings l WHERE l.phone_model_id = pm.id AND l.is_active = 1) as current_max_price
      FROM phone_models pm WHERE pm.id = ?
    `).get(id);
  },

  searchPhones(query) {
    return db.prepare(`
      SELECT pm.*,
        (SELECT COUNT(*) FROM listings l WHERE l.phone_model_id = pm.id AND l.is_active = 1) as active_listings,
        (SELECT AVG(l.price) FROM listings l WHERE l.phone_model_id = pm.id AND l.is_active = 1) as current_avg_price
      FROM phone_models pm
      WHERE pm.full_name LIKE ? OR pm.brand LIKE ? OR pm.model LIKE ?
      ORDER BY active_listings DESC
    `).all(`%${query}%`, `%${query}%`, `%${query}%`);
  },

  // ─── Listings ───────────────────────────────────────────────────────────
  upsertListing(listing) {
    return db.prepare(`
      INSERT INTO listings (phone_model_id, source, external_id, title, price, condition,
        description, location_city, location_region, location_province, url, image_url,
        seller_type, is_negotiable, listing_date, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source, external_id) DO UPDATE SET
        price = excluded.price,
        is_active = 1,
        scraped_at = CURRENT_TIMESTAMP
    `).run(
      listing.phone_model_id, listing.source, listing.external_id,
      listing.title, listing.price, listing.condition,
      listing.description, listing.location_city, listing.location_region,
      listing.location_province, listing.url, listing.image_url,
      listing.seller_type, listing.is_negotiable ? 1 : 0,
      listing.listing_date, JSON.stringify(listing.raw_data || {})
    );
  },

  getListingsForPhone(phoneId, { limit = 50, offset = 0, source, region, condition } = {}) {
    let where = 'WHERE l.phone_model_id = ? AND l.is_active = 1';
    const params = [phoneId];
    if (source) { where += ' AND l.source = ?'; params.push(source); }
    if (region) { where += ' AND l.location_region = ?'; params.push(region); }
    if (condition) { where += ' AND l.condition = ?'; params.push(condition); }
    params.push(limit, offset);
    return db.prepare(`SELECT l.* FROM listings l ${where} ORDER BY l.scraped_at DESC LIMIT ? OFFSET ?`).all(...params);
  },

  // ─── Price Snapshots ────────────────────────────────────────────────────
  createSnapshot(phoneId) {
    const listings = db.prepare(
      'SELECT * FROM listings WHERE phone_model_id = ? AND is_active = 1'
    ).all(phoneId);

    if (listings.length === 0) return null;

    const prices = listings.map(l => l.price).sort((a, b) => a - b);
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    const median = prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)];

    const byCondition = {};
    const byRegion = {};
    const bySource = {};
    const pricesByRegion = {};
    const pricesByCondition = {};

    for (const l of listings) {
      if (l.condition) byCondition[l.condition] = (byCondition[l.condition] || 0) + 1;
      if (l.location_region) {
        byRegion[l.location_region] = (byRegion[l.location_region] || 0) + 1;
        if (!pricesByRegion[l.location_region]) pricesByRegion[l.location_region] = [];
        pricesByRegion[l.location_region].push(l.price);
      }
      bySource[l.source] = (bySource[l.source] || 0) + 1;
      if (l.condition) {
        if (!pricesByCondition[l.condition]) pricesByCondition[l.condition] = [];
        pricesByCondition[l.condition].push(l.price);
      }
    }

    // Average prices by region/condition
    const avgPricesByRegion = {};
    for (const [r, pp] of Object.entries(pricesByRegion)) {
      avgPricesByRegion[r] = Math.round(pp.reduce((s, p) => s + p, 0) / pp.length);
    }
    const avgPricesByCondition = {};
    for (const [c, pp] of Object.entries(pricesByCondition)) {
      avgPricesByCondition[c] = Math.round(pp.reduce((s, p) => s + p, 0) / pp.length);
    }

    return db.prepare(`
      INSERT INTO price_snapshots (phone_model_id, avg_price, median_price, min_price, max_price,
        total_listings, listings_by_condition, listings_by_region, listings_by_source,
        prices_by_region, prices_by_condition)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      phoneId, Math.round(avg), Math.round(median), prices[0], prices[prices.length - 1],
      listings.length, JSON.stringify(byCondition), JSON.stringify(byRegion),
      JSON.stringify(bySource), JSON.stringify(avgPricesByRegion), JSON.stringify(avgPricesByCondition)
    );
  },

  getSnapshots(phoneId, days = 180) {
    return db.prepare(`
      SELECT * FROM price_snapshots
      WHERE phone_model_id = ? AND snapshot_date >= datetime('now', ?)
      ORDER BY snapshot_date ASC
    `).all(phoneId, `-${days} days`);
  },

  getLatestSnapshot(phoneId) {
    return db.prepare(`
      SELECT * FROM price_snapshots WHERE phone_model_id = ?
      ORDER BY snapshot_date DESC LIMIT 1
    `).get(phoneId);
  },

  // ─── Regional Stats ─────────────────────────────────────────────────────
  getRegionalStats() {
    return db.prepare(`
      SELECT location_region as region,
        COUNT(*) as total_listings,
        ROUND(AVG(price)) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM listings
      WHERE is_active = 1 AND location_region IS NOT NULL
      GROUP BY location_region
      ORDER BY total_listings DESC
    `).all();
  },

  getRegionalStatsForPhone(phoneId) {
    return db.prepare(`
      SELECT location_region as region,
        COUNT(*) as total_listings,
        ROUND(AVG(price)) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM listings
      WHERE phone_model_id = ? AND is_active = 1 AND location_region IS NOT NULL
      GROUP BY location_region
      ORDER BY total_listings DESC
    `).all(phoneId);
  },

  // ─── Favorites ──────────────────────────────────────────────────────────
  getFavorites(userId = 'default') {
    return db.prepare(`
      SELECT pm.*,
        (SELECT COUNT(*) FROM listings l WHERE l.phone_model_id = pm.id AND l.is_active = 1) as active_listings,
        (SELECT AVG(l.price) FROM listings l WHERE l.phone_model_id = pm.id AND l.is_active = 1) as current_avg_price,
        f.created_at as favorited_at
      FROM favorites f
      JOIN phone_models pm ON f.phone_model_id = pm.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).all(userId);
  },

  addFavorite(phoneId, userId = 'default') {
    return db.prepare('INSERT OR IGNORE INTO favorites (user_id, phone_model_id) VALUES (?, ?)').run(userId, phoneId);
  },

  removeFavorite(phoneId, userId = 'default') {
    return db.prepare('DELETE FROM favorites WHERE user_id = ? AND phone_model_id = ?').run(userId, phoneId);
  },

  isFavorite(phoneId, userId = 'default') {
    return !!db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND phone_model_id = ?').get(userId, phoneId);
  },

  // ─── Trends ─────────────────────────────────────────────────────────────
  getTopTrends(limit = 10) {
    // Phones with biggest price change in last 30 days
    return db.prepare(`
      SELECT pm.*, 
        newest.avg_price as current_price,
        oldest.avg_price as old_price,
        ROUND(((newest.avg_price - oldest.avg_price) / oldest.avg_price) * 100, 1) as price_change_pct,
        newest.total_listings
      FROM phone_models pm
      JOIN (
        SELECT phone_model_id, avg_price, total_listings,
          ROW_NUMBER() OVER (PARTITION BY phone_model_id ORDER BY snapshot_date DESC) as rn
        FROM price_snapshots
      ) newest ON newest.phone_model_id = pm.id AND newest.rn = 1
      JOIN (
        SELECT phone_model_id, avg_price,
          ROW_NUMBER() OVER (PARTITION BY phone_model_id ORDER BY snapshot_date ASC) as rn
        FROM price_snapshots WHERE snapshot_date >= datetime('now', '-30 days')
      ) oldest ON oldest.phone_model_id = pm.id AND oldest.rn = 1
      WHERE oldest.avg_price > 0
      ORDER BY ABS(price_change_pct) DESC
      LIMIT ?
    `).all(limit);
  },

  getMostPopular(limit = 10) {
    return db.prepare(`
      SELECT pm.*,
        COUNT(l.id) as active_listings,
        ROUND(AVG(l.price)) as current_avg_price
      FROM phone_models pm
      JOIN listings l ON l.phone_model_id = pm.id AND l.is_active = 1
      GROUP BY pm.id
      ORDER BY active_listings DESC
      LIMIT ?
    `).all(limit);
  },

  // ─── Scrape Logs ────────────────────────────────────────────────────────
  createScrapeLog(source) {
    return db.prepare('INSERT INTO scrape_logs (source) VALUES (?)').run(source);
  },

  updateScrapeLog(id, data) {
    return db.prepare(`
      UPDATE scrape_logs SET finished_at = CURRENT_TIMESTAMP, status = ?, 
        listings_found = ?, listings_new = ?, listings_updated = ?, error_message = ?
      WHERE id = ?
    `).run(data.status, data.listings_found, data.listings_new, data.listings_updated, data.error_message, id);
  },

  getLastScrapeTime() {
    return db.prepare("SELECT MAX(finished_at) as last_scrape FROM scrape_logs WHERE status = 'completed'").get();
  },

  // ─── Model matching ─────────────────────────────────────────────────────
  findPhoneModel(title) {
    // Try to match a listing title to a known phone model
    const normalized = title.toLowerCase().trim();
    const allModels = db.prepare('SELECT * FROM phone_models').all();

    let bestMatch = null;
    let bestScore = 0;

    for (const model of allModels) {
      const modelLower = model.model.toLowerCase();
      const brandLower = model.brand.toLowerCase();

      // Check if brand and model keywords appear in title
      const brandMatch = normalized.includes(brandLower) || 
        (brandLower === 'apple' && normalized.includes('iphone'));
      
      if (!brandMatch) continue;

      // Score based on how many model words match
      const modelWords = modelLower.split(/[\s\-\/]+/);
      let score = 0;
      for (const word of modelWords) {
        if (word.length > 1 && normalized.includes(word)) score++;
      }

      // Bonus for exact model match
      if (normalized.includes(modelLower)) score += 5;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = model;
      }
    }

    return bestScore >= 2 ? bestMatch : null;
  },

  // Mark old listings as inactive
  deactivateOldListings(source, hoursOld = 72) {
    return db.prepare(`
      UPDATE listings SET is_active = 0 
      WHERE source = ? AND scraped_at < datetime('now', ?)
    `).run(source, `-${hoursOld} hours`);
  }
};

module.exports = Database;
