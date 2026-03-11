require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { migrate } = require('../models/migrate');
const Database = require('../models/db');
const { scrapeSubito } = require('../scrapers/subito');
const { scrapeKijiji } = require('../scrapers/kijiji');
const { scrapeWallapop } = require('../scrapers/wallapop');
const { scrapeFacebook } = require('../scrapers/facebook');
const logger = require('../utils/logger');

async function scrapeAll() {
  logger.info('═══════════════════════════════════════════');
  logger.info('Starting full scrape cycle via Apify...');
  logger.info('═══════════════════════════════════════════');

  migrate();

  if (!process.env.APIFY_API_TOKEN) {
    logger.error('APIFY_API_TOKEN not set! Add it in Railway Variables.');
    logger.error('Get your token at: https://console.apify.com/account/integrations');
    return {};
  }

  const results = {};

  try { results.subito = await scrapeSubito(); } catch (e) { logger.error('Subito failed: ' + e.message); }
  try { results.kijiji = await scrapeKijiji(); } catch (e) { logger.error('Kijiji failed: ' + e.message); }
  try { results.wallapop = await scrapeWallapop(); } catch (e) { logger.error('Wallapop failed: ' + e.message); }
  try { results.facebook = await scrapeFacebook(); } catch (e) { logger.error('Facebook failed: ' + e.message); }

  // Create price snapshots
  logger.info('Creating price snapshots...');
  const phones = Database.getAllPhones();
  let sc = 0;
  for (const p of phones) {
    try { const s = Database.createSnapshot(p.id); if (s) sc++; } catch (e) {}
  }

  const totalFound = Object.values(results).reduce((s, r) => s + (r?.found || 0), 0);
  const totalNew = Object.values(results).reduce((s, r) => s + (r?.new || 0), 0);

  logger.info('═══════════════════════════════════════════');
  logger.info('Scrape complete! Found: ' + totalFound + ', New: ' + totalNew + ', Snapshots: ' + sc);
  logger.info('═══════════════════════════════════════════');
  return results;
}

if (require.main === module) {
  scrapeAll().then(() => process.exit(0)).catch(() => process.exit(1));
}
module.exports = { scrapeAll };
