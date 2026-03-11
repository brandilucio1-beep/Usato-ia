const Database = require('../models/db');
const logger = require('../utils/logger');
const { fetchWithRetry, resolveRegion, normalizeCondition, sleep } = require('./utils');

// Wallapop has a public API that returns JSON
const API_BASE = 'https://api.wallapop.com/api/v3';

async function scrapeWallapop() {
  const logEntry = Database.createScrapeLog('wallapop');
  const logId = logEntry.lastInsertRowid;
  let totalFound = 0, totalNew = 0, totalUpdated = 0;

  try {
    logger.info('🔍 Starting Wallapop scrape...');
    
    const phoneModels = Database.getAllPhones();
    
    for (const phone of phoneModels) {
      try {
        const results = await scrapeModelFromWallapop(phone);
        totalFound += results.found;
        totalNew += results.new;
        totalUpdated += results.updated;
        
        logger.info(`  📱 ${phone.full_name}: ${results.found} found, ${results.new} new`);
      } catch (err) {
        logger.warn(`  ⚠️ Error scraping ${phone.full_name} from Wallapop: ${err.message}`);
      }
      
      await sleep(2000 + Math.random() * 2500);
    }
    
    Database.deactivateOldListings('wallapop', 72);
    
    Database.updateScrapeLog(logId, {
      status: 'completed', listings_found: totalFound,
      listings_new: totalNew, listings_updated: totalUpdated, error_message: null
    });
    
    logger.info(`✅ Wallapop scrape complete: ${totalFound} found, ${totalNew} new`);
    return { found: totalFound, new: totalNew, updated: totalUpdated };
    
  } catch (err) {
    logger.error(`❌ Wallapop scrape failed: ${err.message}`);
    Database.updateScrapeLog(logId, {
      status: 'failed', listings_found: totalFound,
      listings_new: totalNew, listings_updated: totalUpdated, error_message: err.message
    });
    throw err;
  }
}

async function scrapeModelFromWallapop(phone) {
  let found = 0, newCount = 0, updated = 0;
  const searchTerms = phone.model.replace(/[()\/]/g, ' ').trim();
  
  try {
    // Wallapop search API - category 16000 = Electronics/Phones
    // Latitude/longitude for Italy center (Rome area)
    const url = `${API_BASE}/general/search?keywords=${encodeURIComponent(searchTerms)}&category_ids=16000&latitude=41.9028&longitude=12.4964&country_code=IT&order_by=newest&items_count=40`;
    
    const response = await fetchWithRetry(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'it-IT,it;q=0.9',
        'Origin': 'https://it.wallapop.com',
        'Referer': 'https://it.wallapop.com/',
        'DeviceOS': '0',  // Web
      }
    });
    
    const data = response.data;
    const items = data.search_objects || data.items || [];
    
    found = items.length;
    
    for (const item of items) {
      try {
        const price = item.price?.amount || item.sale_price?.amount || parseFloat(item.price) || null;
        if (!price || price < 10 || price > 5000) continue;
        
        const location = item.location?.city || item.user?.location?.city || '';
        const region = resolveRegion(location);
        
        // Wallapop condition mapping
        let condition = null;
        const wallaCondition = item.condition || item.extra_info?.condition || '';
        if (wallaCondition) {
          const condMap = {
            'new': 'come_nuovo', 'as_new': 'come_nuovo', 'as_good_as_new': 'come_nuovo',
            'good': 'buone', 'fair': 'accettabili', 'has_given_it_all': 'da_riparare',
          };
          condition = condMap[wallaCondition.toLowerCase()] || normalizeCondition(wallaCondition);
        }
        
        const result = Database.upsertListing({
          phone_model_id: phone.id,
          source: 'wallapop',
          external_id: `wallapop_${item.id}`,
          title: item.title || item.name || '',
          price,
          condition,
          description: item.description || null,
          location_city: location,
          location_region: region,
          location_province: null,
          url: `https://it.wallapop.com/item/${item.web_slug || item.id}`,
          image_url: item.images?.[0]?.medium || item.images?.[0]?.original || item.main_image?.medium || null,
          seller_type: item.seller_type === 'professional' ? 'negozio' : 'privato',
          is_negotiable: item.flags?.negotiable || false,
          listing_date: item.creation_date || item.modified_date || null,
          raw_data: item,
        });
        
        if (result.changes > 0) newCount++;
        else updated++;
      } catch (err) {
        logger.debug(`Error saving Wallapop item: ${err.message}`);
      }
    }
    
  } catch (err) {
    logger.debug(`Wallapop search error for ${phone.model}: ${err.message}`);
  }
  
  return { found, new: newCount, updated };
}

module.exports = { scrapeWallapop };
