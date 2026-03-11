const Database = require('../models/db');
const logger = require('../utils/logger');
const { resolveRegion, normalizeCondition, extractPrice, sleep, getRandomUserAgent } = require('./utils');

// Facebook Marketplace requires a headless browser due to JS rendering
// NOTE: FB Marketplace scraping is the most fragile - may need frequent selector updates

let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch {
  logger.warn('⚠️ Puppeteer not installed - Facebook Marketplace scraping disabled');
}

async function scrapeFacebook() {
  if (!puppeteer) {
    logger.warn('⚠️ Skipping Facebook Marketplace - Puppeteer not available');
    return { found: 0, new: 0, updated: 0 };
  }

  const logEntry = Database.createScrapeLog('facebook');
  const logId = logEntry.lastInsertRowid;
  let totalFound = 0, totalNew = 0, totalUpdated = 0;
  let browser;

  try {
    logger.info('🔍 Starting Facebook Marketplace scrape...');
    
    browser = await puppeteer.launch({
      headless: process.env.PUPPETEER_HEADLESS !== 'false' ? 'new' : false,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--lang=it-IT',
      ],
      defaultViewport: { width: 1920, height: 1080 },
    });

    const phoneModels = Database.getAllPhones();
    // Only scrape most popular brands to stay within rate limits
    const priorityBrands = ['Apple', 'Samsung', 'Xiaomi', 'Google', 'OnePlus'];
    const priorityPhones = phoneModels.filter(p => priorityBrands.includes(p.brand));
    
    for (const phone of priorityPhones) {
      try {
        const results = await scrapeModelFromFacebook(browser, phone);
        totalFound += results.found;
        totalNew += results.new;
        totalUpdated += results.updated;
        
        logger.info(`  📱 ${phone.full_name}: ${results.found} found, ${results.new} new`);
      } catch (err) {
        logger.warn(`  ⚠️ Error scraping ${phone.full_name} from Facebook: ${err.message}`);
      }
      
      await sleep(3000 + Math.random() * 4000);
    }
    
    Database.deactivateOldListings('facebook', 72);
    
    Database.updateScrapeLog(logId, {
      status: 'completed', listings_found: totalFound,
      listings_new: totalNew, listings_updated: totalUpdated, error_message: null
    });
    
    logger.info(`✅ Facebook Marketplace scrape complete: ${totalFound} found, ${totalNew} new`);
    
  } catch (err) {
    logger.error(`❌ Facebook Marketplace scrape failed: ${err.message}`);
    Database.updateScrapeLog(logId, {
      status: 'failed', listings_found: totalFound,
      listings_new: totalNew, listings_updated: totalUpdated, error_message: err.message
    });
  } finally {
    if (browser) await browser.close();
  }
  
  return { found: totalFound, new: totalNew, updated: totalUpdated };
}

async function scrapeModelFromFacebook(browser, phone) {
  let found = 0, newCount = 0, updated = 0;
  const searchTerms = phone.model.replace(/[()\/]/g, ' ').trim();
  
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent(getRandomUserAgent());
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'it-IT,it;q=0.9' });
    
    // Facebook Marketplace Italy search
    const url = `https://www.facebook.com/marketplace/italy/search?query=${encodeURIComponent(searchTerms)}&category=electronics`;
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for listings to load
    await sleep(3000);
    
    // Scroll to load more items
    await autoScroll(page);
    
    // Extract listing data from the page
    const listings = await page.evaluate(() => {
      const items = [];
      
      // Facebook Marketplace uses various selectors - try multiple patterns
      const selectors = [
        '[data-testid="marketplace_feed_item"]',
        'div[class*="x9f619"] a[href*="/marketplace/item/"]',
        'a[href*="/marketplace/item/"]',
      ];
      
      let elements = [];
      for (const sel of selectors) {
        elements = document.querySelectorAll(sel);
        if (elements.length > 0) break;
      }
      
      elements.forEach(el => {
        try {
          // Extract from link href or parent
          const link = el.href || el.querySelector('a')?.href || '';
          const idMatch = link.match(/\/item\/(\d+)/);
          if (!idMatch) return;
          
          // Get text content from spans
          const spans = el.querySelectorAll('span');
          let title = '', price = '', location = '';
          
          spans.forEach(span => {
            const text = span.textContent.trim();
            if (text.includes('€') || text.match(/\d+[\.,]?\d*\s*€/)) {
              price = text;
            } else if (text.length > 10 && !title) {
              title = text;
            } else if (text.length > 2 && text.length < 40 && !location && !text.includes('€')) {
              location = text;
            }
          });
          
          // Get image
          const img = el.querySelector('img');
          const imageUrl = img?.src || '';
          
          if (title && idMatch[1]) {
            items.push({
              title,
              price,
              url: `https://www.facebook.com/marketplace/item/${idMatch[1]}/`,
              location,
              imageUrl,
              externalId: idMatch[1],
            });
          }
        } catch {}
      });
      
      return items;
    });
    
    found = listings.length;
    
    for (const listing of listings) {
      try {
        const price = extractPrice(listing.price);
        if (!price || price < 10 || price > 5000) continue;
        
        const region = resolveRegion(listing.location);
        
        const result = Database.upsertListing({
          phone_model_id: phone.id,
          source: 'facebook',
          external_id: `fb_${listing.externalId}`,
          title: listing.title,
          price,
          condition: normalizeCondition(listing.title),
          description: null,
          location_city: listing.location,
          location_region: region,
          location_province: null,
          url: listing.url,
          image_url: listing.imageUrl || null,
          seller_type: 'privato',
          is_negotiable: false,
          listing_date: null,
          raw_data: listing,
        });
        
        if (result.changes > 0) newCount++;
        else updated++;
      } catch (err) {
        logger.debug(`Error saving FB listing: ${err.message}`);
      }
    }
    
  } catch (err) {
    logger.debug(`Facebook page error for ${phone.model}: ${err.message}`);
  } finally {
    await page.close();
  }
  
  return { found, new: newCount, updated };
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= 4000) { clearInterval(timer); resolve(); }
      }, 200);
    });
  });
  await sleep(1000);
}

module.exports = { scrapeFacebook };
