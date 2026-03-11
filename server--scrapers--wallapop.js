const axios = require('axios');
const Database = require('../models/db');
const logger = require('../utils/logger');
const { resolveRegion, normalizeCondition, sleep } = require('./utils');

const APIFY_BASE = 'https://api.apify.com/v2';

async function scrapeWallapop() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) { logger.warn('No APIFY_API_TOKEN - skipping Wallapop'); return { found: 0, new: 0, updated: 0 }; }

  const logEntry = Database.createScrapeLog('wallapop');
  const logId = logEntry.lastInsertRowid;
  let totalFound = 0, totalNew = 0;

  try {
    logger.info('Starting Wallapop scrape via Apify...');
    const phoneModels = Database.getAllPhones();
    const queries = ['iPhone', 'Samsung Galaxy', 'Xiaomi', 'smartphone'];

    for (const q of queries) {
      try {
        const url = 'https://it.wallapop.com/app/search?keywords=' + encodeURIComponent(q) + '&category_ids=16000&latitude=41.9028&longitude=12.4964';
        logger.info('  Wallapop: ' + q);

        const runResp = await axios.post(
          APIFY_BASE + '/acts/apify~web-scraper/runs?token=' + token,
          {
            startUrls: [{ url }],
            pageFunction: `async function pageFunction(context) {
              const { page } = context;
              await page.waitForTimeout(4000);
              const data = await page.evaluate(() => {
                const items = [];
                document.querySelectorAll('[class*="ItemCard"], [class*="item-card"], a[href*="/item/"]').forEach(el => {
                  const title = el.querySelector('[class*="title"], [class*="Title"], h2, span')?.textContent?.trim() || '';
                  const priceText = el.querySelector('[class*="price"], [class*="Price"]')?.textContent?.trim() || '';
                  const priceMatch = priceText.match(/([\\d.,]+)/);
                  const price = priceMatch ? parseFloat(priceMatch[1].replace('.','').replace(',','.')) : 0;
                  const href = el.href || el.querySelector('a')?.href || '';
                  if (title && price > 20 && price < 5000) {
                    items.push({ title, price, url: href, location: '' });
                  }
                });
                return items;
              });
              return data;
            }`,
            maxRequestsPerCrawl: 1,
            proxyConfiguration: { useApifyProxy: true, apifyProxyCountry: 'IT' },
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        );

        const runId = runResp.data?.data?.id;
        const datasetId = runResp.data?.data?.defaultDatasetId;
        if (!runId) continue;

        let status = 'RUNNING';
        for (let i = 0; i < 30 && status === 'RUNNING'; i++) {
          await sleep(5000);
          const sr = await axios.get(APIFY_BASE + '/actor-runs/' + runId + '?token=' + token, { timeout: 10000 });
          status = sr.data?.data?.status || 'FAILED';
        }
        if (status !== 'SUCCEEDED') continue;

        const dataResp = await axios.get(APIFY_BASE + '/datasets/' + datasetId + '/items?token=' + token + '&limit=200', { timeout: 15000 });
        const items = (dataResp.data || []).flat();

        for (const item of items) {
          if (!item.title || !item.price) continue;
          const phone = matchToPhone(item.title, phoneModels);
          if (!phone) continue;

          Database.upsertListing({
            phone_model_id: phone.id, source: 'wallapop',
            external_id: 'wallapop_' + ((item.url || '').match(/(\d{6,})/)?.[1] || Math.random().toString(36).slice(2)),
            title: item.title, price: item.price, condition: normalizeCondition(item.title),
            description: null, location_city: item.location || '', location_region: resolveRegion(item.location || ''),
            location_province: null, url: item.url || '', image_url: null,
            seller_type: 'privato', is_negotiable: false, listing_date: null, raw_data: item,
          });
          totalFound++; totalNew++;
        }
        logger.info('    ' + items.length + ' results');
      } catch (err) { logger.warn('  Wallapop error: ' + err.message); }
    }

    Database.deactivateOldListings('wallapop', 72);
    Database.updateScrapeLog(logId, { status: 'completed', listings_found: totalFound, listings_new: totalNew, listings_updated: 0, error_message: null });
    logger.info('Wallapop complete: ' + totalFound + ' found');
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

module.exports = { scrapeWallapop };
