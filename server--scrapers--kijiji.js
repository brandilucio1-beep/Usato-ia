const axios = require('axios');
const Database = require('../models/db');
const logger = require('../utils/logger');
const { resolveRegion, normalizeCondition, sleep } = require('./utils');

const APIFY_BASE = 'https://api.apify.com/v2';

async function scrapeKijiji() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) { logger.warn('No APIFY_API_TOKEN - skipping Kijiji'); return { found: 0, new: 0, updated: 0 }; }

  const logEntry = Database.createScrapeLog('kijiji');
  const logId = logEntry.lastInsertRowid;
  let totalFound = 0, totalNew = 0;

  try {
    logger.info('Starting Kijiji scrape via Apify...');
    const phoneModels = Database.getAllPhones();
    const queries = ['iPhone usato', 'Samsung Galaxy usato', 'Xiaomi usato', 'smartphone usato'];

    for (const q of queries) {
      try {
        const url = 'https://www.kijiji.it/annunci/telefoni-cellulari/?q=' + encodeURIComponent(q);
        logger.info('  Kijiji: ' + q);

        const runResp = await axios.post(
          APIFY_BASE + '/acts/apify~cheerio-scraper/runs?token=' + token,
          {
            startUrls: [{ url }],
            pageFunction: `async function pageFunction(context) {
              const { $, request } = context;
              const results = [];
              $('script[type="application/ld+json"]').each((i, el) => {
                try {
                  const json = JSON.parse($(el).html());
                  const items = Array.isArray(json) ? json : (json.itemListElement || []);
                  for (const entry of items) {
                    const item = entry.item || entry;
                    if (item.offers && (item.offers.price || item.offers.lowPrice)) {
                      results.push({
                        title: item.name || '',
                        price: parseFloat(item.offers.price || item.offers.lowPrice) || 0,
                        url: item.url || '',
                        location: (item.availableAtOrFrom && item.availableAtOrFrom.address) ? (item.availableAtOrFrom.address.addressLocality || '') : '',
                        image: item.image || '',
                      });
                    }
                  }
                } catch(e) {}
              });
              return results;
            }`,
            maxRequestsPerCrawl: 2,
            proxyConfiguration: { useApifyProxy: true, apifyProxyCountry: 'IT' },
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        );

        const runId = runResp.data?.data?.id;
        const datasetId = runResp.data?.data?.defaultDatasetId;
        if (!runId) continue;

        let status = 'RUNNING';
        for (let i = 0; i < 24 && status === 'RUNNING'; i++) {
          await sleep(5000);
          const sr = await axios.get(APIFY_BASE + '/actor-runs/' + runId + '?token=' + token, { timeout: 10000 });
          status = sr.data?.data?.status || 'FAILED';
        }

        if (status !== 'SUCCEEDED') continue;

        const dataResp = await axios.get(APIFY_BASE + '/datasets/' + datasetId + '/items?token=' + token + '&limit=200', { timeout: 15000 });
        const items = (dataResp.data || []).flat();

        for (const item of items) {
          if (!item.title || !item.price || item.price < 20 || item.price > 5000) continue;
          const phone = matchToPhone(item.title, phoneModels);
          if (!phone) continue;

          Database.upsertListing({
            phone_model_id: phone.id, source: 'kijiji',
            external_id: 'kijiji_' + ((item.url || '').match(/(\d{6,})/)?.[1] || Math.random().toString(36).slice(2)),
            title: item.title, price: item.price, condition: normalizeCondition(item.title),
            description: null, location_city: item.location || '', location_region: resolveRegion(item.location || ''),
            location_province: null, url: item.url || '', image_url: item.image || null,
            seller_type: 'privato', is_negotiable: false, listing_date: null, raw_data: item,
          });
          totalFound++; totalNew++;
        }
        logger.info('    ' + items.length + ' results');
      } catch (err) { logger.warn('  Kijiji error: ' + err.message); }
    }

    Database.deactivateOldListings('kijiji', 72);
    Database.updateScrapeLog(logId, { status: 'completed', listings_found: totalFound, listings_new: totalNew, listings_updated: 0, error_message: null });
    logger.info('Kijiji complete: ' + totalFound + ' found');
  } catch (err) {
    Database.updateScrapeLog(logId, { status: 'failed', listings_found: totalFound, listings_new: totalNew, listings_updated: 0, error_message: err.message });
  }
  return { found: totalFound, new: totalNew, updated: 0 };
}

function matchToPhone(title, phoneModels) {
  if (!title) return null;
  const n = title.toLowerCase();
  let best = null, bestS = 0;
  for (const m of phoneModels) {
    const ml = m.model.toLowerCase(), bl = m.brand.toLowerCase();
    const bm = n.includes(bl) || (bl === 'apple' && n.includes('iphone')) || (bl === 'xiaomi' && (n.includes('xiaomi') || n.includes('redmi') || n.includes('poco')));
    if (!bm) continue;
    let s = 0;
    for (const w of ml.split(/[\s\-\/\+]+/).filter(w => w.length > 1)) { if (n.includes(w)) s++; }
    if (n.includes(ml)) s += 5;
    if (s > bestS) { bestS = s; best = m; }
  }
  return bestS >= 2 ? best : null;
}

module.exports = { scrapeKijiji };
