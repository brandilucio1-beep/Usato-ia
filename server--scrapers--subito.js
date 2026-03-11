const axios = require('axios');
const Database = require('../models/db');
const logger = require('../utils/logger');
const { resolveRegion, normalizeCondition, sleep } = require('./utils');

const APIFY_BASE = 'https://api.apify.com/v2';

async function scrapeSubito() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) { logger.warn('No APIFY_API_TOKEN - skipping Subito'); return { found: 0, new: 0, updated: 0 }; }

  const logEntry = Database.createScrapeLog('subito');
  const logId = logEntry.lastInsertRowid;
  let totalFound = 0, totalNew = 0, totalUpdated = 0;

  try {
    logger.info('Starting Subito.it scrape via Apify...');
    const phoneModels = Database.getAllPhones();
    const queries = [
      'iPhone 17','iPhone Air','iPhone 16','iPhone 15','iPhone 14','iPhone 13','iPhone 12','iPhone 11','iPhone SE','iPhone X',
      'Samsung Galaxy S25','Samsung Galaxy S24','Samsung Galaxy S23','Samsung Galaxy S22','Samsung Galaxy S21',
      'Samsung Galaxy Z Fold','Samsung Galaxy Z Flip','Samsung Galaxy A',
      'Xiaomi 15','Xiaomi 14','Xiaomi 13','Redmi Note','POCO',
      'Google Pixel','OnePlus','Huawei','Honor','OPPO','Motorola','Nothing Phone','Sony Xperia',
    ];

    for (const q of queries) {
      try {
        const url = 'https://www.subito.it/annunci-italia/vendita/telefonia/?q=' + encodeURIComponent(q);
        logger.info('  Searching: ' + q);

        // Run Apify actor
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
                  const items = json.itemListElement || json['@graph'] || [];
                  for (const entry of items) {
                    const item = entry.item || entry;
                    if (item.name && item.offers) {
                      results.push({
                        title: item.name || '',
                        price: parseFloat(item.offers.price || item.offers.lowPrice) || 0,
                        url: item.url || '',
                        location: (item.availableAtOrFrom && item.availableAtOrFrom.address) ? (item.availableAtOrFrom.address.addressLocality || '') : '',
                        region: (item.availableAtOrFrom && item.availableAtOrFrom.address) ? (item.availableAtOrFrom.address.addressRegion || '') : '',
                        image: item.image || '',
                        description: item.description || '',
                      });
                    }
                  }
                } catch(e) {}
              });
              // Fallback: parse visible HTML
              if (results.length === 0) {
                $('[class*="items"] a[href*="/annunci"], [class*="card"] a[href*=".htm"]').each((i, el) => {
                  const href = $(el).attr('href') || '';
                  const title = $(el).find('[class*="title"], [class*="Title"], h2, h3').first().text().trim() || $(el).attr('title') || '';
                  const priceText = $(el).find('[class*="price"], [class*="Price"]').first().text().trim();
                  const priceMatch = priceText.match(/([\\d.,]+)/);
                  const price = priceMatch ? parseFloat(priceMatch[1].replace('.','').replace(',','.')) : 0;
                  const loc = $(el).find('[class*="town"], [class*="city"], [class*="location"]').first().text().trim();
                  if (title && price > 20 && price < 5000) {
                    results.push({ title, price, url: href.startsWith('http') ? href : 'https://www.subito.it' + href, location: loc });
                  }
                });
              }
              return results;
            }`,
            maxRequestsPerCrawl: 3,
            proxyConfiguration: { useApifyProxy: true, apifyProxyCountry: 'IT' },
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        );

        const runId = runResp.data?.data?.id;
        const datasetId = runResp.data?.data?.defaultDatasetId;
        if (!runId) { logger.warn('  No run ID for ' + q); continue; }

        // Wait for completion
        let status = 'RUNNING';
        for (let i = 0; i < 30 && status === 'RUNNING'; i++) {
          await sleep(5000);
          const sr = await axios.get(APIFY_BASE + '/actor-runs/' + runId + '?token=' + token, { timeout: 10000 });
          status = sr.data?.data?.status || 'FAILED';
        }

        if (status !== 'SUCCEEDED') { logger.warn('  Run ' + status + ' for ' + q); continue; }

        // Get results
        const dataResp = await axios.get(
          APIFY_BASE + '/datasets/' + datasetId + '/items?token=' + token + '&limit=200',
          { timeout: 15000 }
        );

        const items = (dataResp.data || []).flat();
        let matched = 0;

        for (const item of items) {
          if (!item.title || !item.price || item.price < 20 || item.price > 5000) continue;
          const phone = matchToPhone(item.title, phoneModels);
          if (!phone) continue;

          const region = resolveRegion(item.region || item.location || '');
          const idMatch = (item.url || '').match(/(\d{6,})/);

          const result = Database.upsertListing({
            phone_model_id: phone.id,
            source: 'subito',
            external_id: 'subito_' + (idMatch ? idMatch[1] : Math.random().toString(36).slice(2)),
            title: item.title,
            price: item.price,
            condition: normalizeCondition(item.title),
            description: item.description || null,
            location_city: item.location || '',
            location_region: region,
            location_province: null,
            url: item.url || '',
            image_url: item.image || null,
            seller_type: 'privato',
            is_negotiable: item.title.toLowerCase().includes('trattabil'),
            listing_date: null,
            raw_data: item,
          });

          totalFound++;
          matched++;
          if (result.changes > 0) totalNew++;
          else totalUpdated++;
        }

        logger.info('    ' + items.length + ' results, ' + matched + ' matched');
      } catch (err) {
        logger.warn('  Error for "' + q + '": ' + err.message);
      }
    }

    Database.deactivateOldListings('subito', 72);
    Database.updateScrapeLog(logId, { status: 'completed', listings_found: totalFound, listings_new: totalNew, listings_updated: totalUpdated, error_message: null });
    logger.info('Subito.it complete: ' + totalFound + ' found, ' + totalNew + ' new');
  } catch (err) {
    logger.error('Subito.it failed: ' + err.message);
    Database.updateScrapeLog(logId, { status: 'failed', listings_found: totalFound, listings_new: totalNew, listings_updated: totalUpdated, error_message: err.message });
  }
  return { found: totalFound, new: totalNew, updated: totalUpdated };
}

function matchToPhone(title, phoneModels) {
  if (!title) return null;
  const n = title.toLowerCase().trim();
  let best = null, bestS = 0;
  for (const m of phoneModels) {
    const ml = m.model.toLowerCase(), bl = m.brand.toLowerCase();
    const bm = n.includes(bl) || (bl === 'apple' && n.includes('iphone')) ||
      (bl === 'xiaomi' && (n.includes('xiaomi') || n.includes('redmi') || n.includes('poco')));
    if (!bm) continue;
    const words = ml.split(/[\s\-\/\+]+/).filter(w => w.length > 1);
    let s = 0;
    for (const w of words) { if (n.includes(w)) s++; }
    if (n.includes(ml)) s += 5;
    if (ml.includes('pro max') && n.includes('pro max')) s += 3;
    else if (ml.includes('pro') && n.includes('pro') && !ml.includes('pro max')) s += 2;
    if (ml.includes('ultra') && n.includes('ultra')) s += 3;
    if (ml.includes('air') && n.includes('air')) s += 3;
    if (s > bestS) { bestS = s; best = m; }
  }
  return bestS >= 2 ? best : null;
}

module.exports = { scrapeSubito };
