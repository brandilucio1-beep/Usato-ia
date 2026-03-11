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
  logger.info('🚀 Starting full scrape cycle...');
  logger.info(`📅 ${new Date().toISOString()}`);
  logger.info('═══════════════════════════════════════════');

  // Ensure DB is ready
  migrate();

  const results = { subito: null, kijiji: null, wallapop: null, facebook: null };

  // Run scrapers sequentially to be respectful
  try {
    results.subito = await scrapeSubito();
  } catch (err) {
    logger.error(`Subito scrape failed: ${err.message}`);
  }

  try {
    results.kijiji = await scrapeKijiji();
  } catch (err) {
    logger.error(`Kijiji scrape failed: ${err.message}`);
  }

  try {
    results.wallapop = await scrapeWallapop();
  } catch (err) {
    logger.error(`Wallapop scrape failed: ${err.message}`);
  }

  try {
    results.facebook = await scrapeFacebook();
  } catch (err) {
    logger.error(`Facebook scrape failed: ${err.message}`);
  }

  // Create price snapshots for all phones that have listings
  logger.info('📊 Creating price snapshots...');
  const phones = Database.getAllPhones();
  let snapshotCount = 0;
  for (const phone of phones) {
    try {
      const snap = Database.createSnapshot(phone.id);
      if (snap) snapshotCount++;
    } catch (err) {
      logger.debug(`Snapshot error for ${phone.full_name}: ${err.message}`);
    }
  }
  logger.info(`📊 Created ${snapshotCount} price snapshots`);

  // Summary
  const totalFound = Object.values(results).reduce((s, r) => s + (r?.found || 0), 0);
  const totalNew = Object.values(results).reduce((s, r) => s + (r?.new || 0), 0);

  logger.info('═══════════════════════════════════════════');
  logger.info(`✅ Scrape cycle complete!`);
  logger.info(`   Total found: ${totalFound}`);
  logger.info(`   New listings: ${totalNew}`);
  logger.info(`   Snapshots created: ${snapshotCount}`);
  logger.info('═══════════════════════════════════════════');

  return results;
}

// Run directly
if (require.main === module) {
  scrapeAll().then(() => {
    logger.info('Job finished, exiting.');
    process.exit(0);
  }).catch(err => {
    logger.error(`Job failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { scrapeAll };
