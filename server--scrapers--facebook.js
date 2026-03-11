const logger = require('../utils/logger');

async function scrapeFacebook() {
  // Facebook Marketplace scraping via Apify is unreliable
  // We rely on Subito, Kijiji, and Wallapop for data
  logger.info('Facebook Marketplace: skipped (using other sources via Apify)');
  return { found: 0, new: 0, updated: 0 };
}

module.exports = { scrapeFacebook };
