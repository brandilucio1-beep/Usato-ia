const cheerio = require('cheerio');
const Database = require('../models/db');
const logger = require('../utils/logger');
const { fetchWithRetry, resolveRegion, normalizeCondition, extractPrice, sleep } = require('./utils');

const BASE_URL = 'https://www.kijiji.it';

async function scrapeKijiji() {
  const logEntry = Database.createScrapeLog('kijiji');
  const logId = logEntry.lastInsertRowid;
  let totalFound = 0, totalNew = 0, totalUpdated = 0;

  try {
    logger.info('🔍 Starting Kijiji.it scrape...');
    
    const phoneModels = Database.getAllPhones();
    
    for (const phone of phoneModels) {
      try {
        const results = await scrapeModelFromKijiji(phone);
        totalFound += results.found;
        totalNew += results.new;
        totalUpdated += results.updated;
        
        logger.info(`  📱 ${phone.full_name}: ${results.found} found, ${results.new} new`);
      } catch (err) {
        logger.warn(`  ⚠️ Error scraping ${phone.full_name} from Kijiji: ${err.message}`);
      }
      
      await sleep(2000 + Math.random() * 2000);
    }
    
    Database.deactivateOldListings('kijiji', 72);
    
    Database.updateScrapeLog(logId, {
      status: 'completed', listings_found: totalFound,
      listings_new: totalNew, listings_updated: totalUpdated, error_message: null
    });
    
    logger.info(`✅ Kijiji.it scrape complete: ${totalFound} found, ${totalNew} new`);
    return { found: totalFound, new: totalNew, updated: totalUpdated };
    
  } catch (err) {
    logger.error(`❌ Kijiji.it scrape failed: ${err.message}`);
    Database.updateScrapeLog(logId, {
      status: 'failed', listings_found: totalFound,
      listings_new: totalNew, listings_updated: totalUpdated, error_message: err.message
    });
    throw err;
  }
}

async function scrapeModelFromKijiji(phone) {
  let found = 0, newCount = 0, updated = 0;
  const maxPages = parseInt(process.env.MAX_PAGES_PER_SOURCE) || 5;
  const searchTerms = phone.model.replace(/[()\/]/g, ' ').trim();
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      // Kijiji search URL pattern
      const url = `${BASE_URL}/annunci/telefoni-cellulari/?q=${encodeURIComponent(searchTerms)}&p=${page}`;
      
      const response = await fetchWithRetry(url);
      const $ = cheerio.load(response.data);
      
      const listings = [];
      
      // Kijiji listing containers
      $('[class*="Listing"], [class*="listing-card"], .ads-list-item, [data-testid*="listing"]').each((_, el) => {
        const $el = $(el);
        
        const title = $el.find('[class*="title"], h3, h2, [class*="Title"]').first().text().trim();
        const priceText = $el.find('[class*="price"], [class*="Price"]').first().text().trim();
        const price = extractPrice(priceText);
        
        const link = $el.find('a[href*="/annunci"]').first().attr('href') || $el.find('a').first().attr('href') || '';
        const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
        
        const location = $el.find('[class*="location"], [class*="city"], [class*="Location"]').first().text().trim();
        const imageUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
        
        const idMatch = fullUrl.match(/(\d{6,})/);
        const externalId = idMatch ? idMatch[1] : null;
        
        if (title && price && externalId) {
          listings.push({ title, price, url: fullUrl, location, imageUrl, externalId });
        }
      });

      // Try JSON-LD
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).html());
          if (Array.isArray(json)) {
            for (const item of json) {
              if (item['@type'] === 'Product' || item['@type'] === 'Offer') {
                const p = item.offers?.price || item.price;
                const listing = {
                  title: item.name || '',
                  price: parseFloat(p) || null,
                  url: item.url || '',
                  location: item.availableAtOrFrom?.address?.addressLocality || '',
                  imageUrl: item.image || '',
                  externalId: item.url?.match(/(\d{6,})/)?.[1] || null,
                };
                if (listing.title && listing.price && listing.externalId) listings.push(listing);
              }
            }
          }
        } catch {}
      });

      const seen = new Set();
      const uniqueListings = listings.filter(l => {
        if (seen.has(l.externalId)) return false;
        seen.add(l.externalId);
        return true;
      });

      found += uniqueListings.length;
      
      for (const listing of uniqueListings) {
        try {
          const region = resolveRegion(listing.location);
          const cityMatch = listing.location.match(/^([^,]+)/);
          
          const result = Database.upsertListing({
            phone_model_id: phone.id,
            source: 'kijiji',
            external_id: `kijiji_${listing.externalId}`,
            title: listing.title,
            price: listing.price,
            condition: normalizeCondition(listing.title),
            description: null,
            location_city: cityMatch ? cityMatch[1].trim() : '',
            location_region: region,
            location_province: null,
            url: listing.url,
            image_url: listing.imageUrl || null,
            seller_type: 'privato',
            is_negotiable: listing.title.toLowerCase().includes('trattabil'),
            listing_date: null,
            raw_data: listing,
          });
          
          if (result.changes > 0) newCount++;
          else updated++;
        } catch (err) {
          logger.debug(`Error saving Kijiji listing: ${err.message}`);
        }
      }
      
      if (uniqueListings.length === 0) break;
      await sleep(1500 + Math.random() * 1500);
      
    } catch (err) {
      logger.debug(`Kijiji page ${page} error: ${err.message}`);
      break;
    }
  }
  
  return { found, new: newCount, updated };
}

module.exports = { scrapeKijiji };
