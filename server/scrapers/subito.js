const cheerio = require('cheerio');
const Database = require('../models/db');
const logger = require('../utils/logger');
const { fetchWithRetry, resolveRegion, normalizeCondition, extractPrice, sleep } = require('./utils');

const BASE_URL = 'https://www.subito.it';
const SEARCH_URL = `${BASE_URL}/annunci-italia/vendita/telefonia/`;

// Subito.it has a well-structured search with query params
// We search for each phone model separately for better matching

async function scrapeSubito() {
  const logEntry = Database.createScrapeLog('subito');
  const logId = logEntry.lastInsertRowid;
  let totalFound = 0, totalNew = 0, totalUpdated = 0;

  try {
    logger.info('🔍 Starting Subito.it scrape...');
    
    const phoneModels = Database.getAllPhones();
    
    for (const phone of phoneModels) {
      try {
        const results = await scrapeModelFromSubito(phone);
        totalFound += results.found;
        totalNew += results.new;
        totalUpdated += results.updated;
        
        logger.info(`  📱 ${phone.full_name}: ${results.found} found, ${results.new} new`);
      } catch (err) {
        logger.warn(`  ⚠️ Error scraping ${phone.full_name} from Subito: ${err.message}`);
      }
      
      // Respectful delay between models
      await sleep(1500 + Math.random() * 2000);
    }
    
    // Deactivate old listings
    Database.deactivateOldListings('subito', 72);
    
    Database.updateScrapeLog(logId, {
      status: 'completed', listings_found: totalFound,
      listings_new: totalNew, listings_updated: totalUpdated, error_message: null
    });
    
    logger.info(`✅ Subito.it scrape complete: ${totalFound} found, ${totalNew} new, ${totalUpdated} updated`);
    return { found: totalFound, new: totalNew, updated: totalUpdated };
    
  } catch (err) {
    logger.error(`❌ Subito.it scrape failed: ${err.message}`);
    Database.updateScrapeLog(logId, {
      status: 'failed', listings_found: totalFound,
      listings_new: totalNew, listings_updated: totalUpdated, error_message: err.message
    });
    throw err;
  }
}

async function scrapeModelFromSubito(phone) {
  let found = 0, newCount = 0, updated = 0;
  const maxPages = parseInt(process.env.MAX_PAGES_PER_SOURCE) || 5;
  
  // Build search query - use model name as keyword
  const searchTerms = phone.model.replace(/[()\/]/g, ' ').trim();
  
  for (let page = 1; page <= maxPages; page++) {
    try {
      // Subito.it search URL pattern
      const url = `${SEARCH_URL}?q=${encodeURIComponent(searchTerms)}&o=${page}`;
      
      const response = await fetchWithRetry(url);
      const $ = cheerio.load(response.data);
      
      // Subito.it listing items - adapt selectors to actual structure
      // The site uses various class patterns, we look for common listing containers
      const listings = [];
      
      // Primary selector: SmallCard or BigCard containers
      $('[class*="SmallCard"], [class*="ItemCard"], [class*="item-card"], .items__item, [data-testid="ad-item"]').each((_, el) => {
        const $el = $(el);
        
        const title = $el.find('[class*="title"], h2, [class*="Title"]').first().text().trim() ||
                       $el.find('a').first().attr('title') || '';
        
        const priceText = $el.find('[class*="price"], [class*="Price"]').first().text().trim();
        const price = extractPrice(priceText);
        
        const link = $el.find('a[href*="/annunci"]').first().attr('href') ||
                     $el.find('a').first().attr('href') || '';
        const fullUrl = link.startsWith('http') ? link : `${BASE_URL}${link}`;
        
        const location = $el.find('[class*="town"], [class*="location"], [class*="city"], [class*="Town"]').first().text().trim();
        
        const imageUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
        
        // Extract external ID from URL
        const idMatch = fullUrl.match(/(\d{8,})/);
        const externalId = idMatch ? idMatch[1] : null;
        
        if (title && price && externalId) {
          listings.push({ title, price, url: fullUrl, location, imageUrl, externalId });
        }
      });

      // Also try JSON-LD or inline scripts for structured data
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).html());
          if (json['@type'] === 'ItemList' && json.itemListElement) {
            for (const item of json.itemListElement) {
              if (item.item && item.item.offers) {
                const listing = {
                  title: item.item.name || '',
                  price: parseFloat(item.item.offers.price) || null,
                  url: item.item.url || '',
                  location: item.item.availableAtOrFrom?.address?.addressLocality || '',
                  imageUrl: item.item.image || '',
                  externalId: item.item.url?.match(/(\d{8,})/)?.[1] || null,
                };
                if (listing.title && listing.price && listing.externalId) {
                  listings.push(listing);
                }
              }
            }
          }
        } catch {}
      });

      // Also try the API endpoint that Subito uses internally
      if (listings.length === 0 && page === 1) {
        try {
          const apiUrl = `https://hades.subito.it/v1/search/ads?category=12&type=s&q=${encodeURIComponent(searchTerms)}&sort=datedesc&start=${(page - 1) * 20}&count=20`;
          const apiResp = await fetchWithRetry(apiUrl, {
            headers: {
              'Accept': 'application/json',
              'x-subito-channel': 'www',
            }
          });
          
          if (apiResp.data && apiResp.data.ads) {
            for (const ad of apiResp.data.ads) {
              const adPrice = ad.features?.find(f => f.uri === '/price')?.values?.[0]?.value;
              const adCity = ad.geo?.city?.value || '';
              const adRegion = ad.geo?.region?.value || '';
              const adTown = ad.geo?.town?.value || '';
              
              listings.push({
                title: ad.subject || '',
                price: parseFloat(adPrice) || null,
                url: ad.urls?.default || `${BASE_URL}/${ad.urn}`,
                location: `${adTown || adCity}, ${adRegion}`,
                imageUrl: ad.images?.[0]?.scale?.[4]?.uri || '',
                externalId: String(ad.urn || ad.id || ''),
                description: ad.body || '',
                condition: ad.features?.find(f => f.uri === '/condition')?.values?.[0]?.value || '',
                sellerType: ad.advertiser?.type || 'privato',
              });
            }
          }
        } catch (apiErr) {
          logger.debug(`Subito API fallback failed: ${apiErr.message}`);
        }
      }

      // Deduplicate
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
          const condition = normalizeCondition(listing.condition || '');
          
          // Extract city from location string
          const cityMatch = listing.location.match(/^([^,]+)/);
          const city = cityMatch ? cityMatch[1].trim() : '';
          
          const result = Database.upsertListing({
            phone_model_id: phone.id,
            source: 'subito',
            external_id: `subito_${listing.externalId}`,
            title: listing.title,
            price: listing.price,
            condition,
            description: listing.description || null,
            location_city: city,
            location_region: region,
            location_province: null,
            url: listing.url,
            image_url: listing.imageUrl || null,
            seller_type: listing.sellerType || 'privato',
            is_negotiable: listing.title.toLowerCase().includes('trattabil'),
            listing_date: null,
            raw_data: listing,
          });
          
          if (result.changes > 0) {
            newCount++;
          } else {
            updated++;
          }
        } catch (err) {
          logger.debug(`Error saving listing: ${err.message}`);
        }
      }
      
      // Stop if no results on this page
      if (uniqueListings.length === 0) break;
      
      await sleep(1000 + Math.random() * 1500);
      
    } catch (err) {
      logger.debug(`Error on page ${page}: ${err.message}`);
      break;
    }
  }
  
  return { found, new: newCount, updated };
}

module.exports = { scrapeSubito };
