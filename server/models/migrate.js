const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const DB_PATH = process.env.DATABASE_PATH || './data/usato-ia.db';
const dbDir = path.dirname(path.resolve(__dirname, '..', DB_PATH));

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.resolve(__dirname, '..', DB_PATH));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function migrate() {
  console.log('🔧 Running database migrations...');

  db.exec(`
    -- Phone models reference table
    CREATE TABLE IF NOT EXISTS phone_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      full_name TEXT NOT NULL,
      year_released INTEGER,
      msrp_eur REAL,
      category TEXT DEFAULT 'smartphone',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(brand, model)
    );

    -- Individual listings scraped from marketplaces
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_model_id INTEGER,
      source TEXT NOT NULL,            -- 'subito', 'facebook', 'kijiji', 'wallapop'
      external_id TEXT,                -- ID from source platform
      title TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      condition TEXT,                  -- 'come_nuovo', 'ottime', 'buone', 'accettabili', 'da_riparare'
      description TEXT,
      location_city TEXT,
      location_region TEXT,
      location_province TEXT,
      url TEXT,
      image_url TEXT,
      seller_type TEXT,                -- 'privato', 'negozio'
      is_negotiable INTEGER DEFAULT 0,
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      listing_date DATETIME,
      is_active INTEGER DEFAULT 1,
      raw_data TEXT,                   -- JSON blob of original scraped data
      FOREIGN KEY (phone_model_id) REFERENCES phone_models(id),
      UNIQUE(source, external_id)
    );

    -- Price snapshots aggregated every 6 hours
    CREATE TABLE IF NOT EXISTS price_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_model_id INTEGER NOT NULL,
      snapshot_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      avg_price REAL,
      median_price REAL,
      min_price REAL,
      max_price REAL,
      total_listings INTEGER,
      listings_by_condition TEXT,      -- JSON: {"come_nuovo": 10, "ottime": 20, ...}
      listings_by_region TEXT,         -- JSON: {"Lombardia": 30, "Lazio": 25, ...}
      listings_by_source TEXT,         -- JSON: {"subito": 50, "facebook": 30, ...}
      prices_by_region TEXT,           -- JSON: {"Lombardia": 450, "Lazio": 430, ...}
      prices_by_condition TEXT,        -- JSON: {"come_nuovo": 500, "ottime": 450, ...}
      FOREIGN KEY (phone_model_id) REFERENCES phone_models(id)
    );

    -- User favorites (stored server-side for persistence)
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT DEFAULT 'default',  -- For multi-user support later
      phone_model_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (phone_model_id) REFERENCES phone_models(id),
      UNIQUE(user_id, phone_model_id)
    );

    -- Scrape job logs
    CREATE TABLE IF NOT EXISTS scrape_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME,
      status TEXT DEFAULT 'running',   -- 'running', 'completed', 'failed'
      listings_found INTEGER DEFAULT 0,
      listings_new INTEGER DEFAULT 0,
      listings_updated INTEGER DEFAULT 0,
      error_message TEXT
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_listings_phone ON listings(phone_model_id);
    CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source);
    CREATE INDEX IF NOT EXISTS idx_listings_region ON listings(location_region);
    CREATE INDEX IF NOT EXISTS idx_listings_scraped ON listings(scraped_at);
    CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price);
    CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(is_active);
    CREATE INDEX IF NOT EXISTS idx_snapshots_phone ON price_snapshots(phone_model_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_date ON price_snapshots(snapshot_date);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
  `);

  // Seed phone models if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM phone_models').get();
  if (count.c === 0) {
    console.log('📱 Seeding phone models...');
    seedPhoneModels();
  }

  console.log('✅ Database migration complete');
}

function seedPhoneModels() {
  const models = [
    // Apple
    { brand: 'Apple', model: 'iPhone 16 Pro Max', year: 2024, msrp: 1489 },
    { brand: 'Apple', model: 'iPhone 16 Pro', year: 2024, msrp: 1239 },
    { brand: 'Apple', model: 'iPhone 16 Plus', year: 2024, msrp: 1109 },
    { brand: 'Apple', model: 'iPhone 16', year: 2024, msrp: 979 },
    { brand: 'Apple', model: 'iPhone 15 Pro Max', year: 2023, msrp: 1489 },
    { brand: 'Apple', model: 'iPhone 15 Pro', year: 2023, msrp: 1239 },
    { brand: 'Apple', model: 'iPhone 15 Plus', year: 2023, msrp: 1109 },
    { brand: 'Apple', model: 'iPhone 15', year: 2023, msrp: 979 },
    { brand: 'Apple', model: 'iPhone 14 Pro Max', year: 2022, msrp: 1489 },
    { brand: 'Apple', model: 'iPhone 14 Pro', year: 2022, msrp: 1289 },
    { brand: 'Apple', model: 'iPhone 14 Plus', year: 2022, msrp: 1109 },
    { brand: 'Apple', model: 'iPhone 14', year: 2022, msrp: 979 },
    { brand: 'Apple', model: 'iPhone 13 Pro Max', year: 2021, msrp: 1389 },
    { brand: 'Apple', model: 'iPhone 13 Pro', year: 2021, msrp: 1189 },
    { brand: 'Apple', model: 'iPhone 13', year: 2021, msrp: 939 },
    { brand: 'Apple', model: 'iPhone 13 Mini', year: 2021, msrp: 839 },
    { brand: 'Apple', model: 'iPhone 12 Pro Max', year: 2020, msrp: 1289 },
    { brand: 'Apple', model: 'iPhone 12 Pro', year: 2020, msrp: 1189 },
    { brand: 'Apple', model: 'iPhone 12', year: 2020, msrp: 939 },
    { brand: 'Apple', model: 'iPhone 12 Mini', year: 2020, msrp: 839 },
    { brand: 'Apple', model: 'iPhone 11 Pro Max', year: 2019, msrp: 1289 },
    { brand: 'Apple', model: 'iPhone 11 Pro', year: 2019, msrp: 1189 },
    { brand: 'Apple', model: 'iPhone 11', year: 2019, msrp: 839 },
    { brand: 'Apple', model: 'iPhone SE 2022', year: 2022, msrp: 529 },
    { brand: 'Apple', model: 'iPhone SE 2020', year: 2020, msrp: 499 },
    { brand: 'Apple', model: 'iPhone XS Max', year: 2018, msrp: 1289 },
    { brand: 'Apple', model: 'iPhone XS', year: 2018, msrp: 1189 },
    { brand: 'Apple', model: 'iPhone XR', year: 2018, msrp: 889 },
    { brand: 'Apple', model: 'iPhone X', year: 2017, msrp: 1189 },
    { brand: 'Apple', model: 'iPhone 8 Plus', year: 2017, msrp: 889 },
    { brand: 'Apple', model: 'iPhone 8', year: 2017, msrp: 789 },
    // Samsung
    { brand: 'Samsung', model: 'Galaxy S24 Ultra', year: 2024, msrp: 1499 },
    { brand: 'Samsung', model: 'Galaxy S24+', year: 2024, msrp: 1179 },
    { brand: 'Samsung', model: 'Galaxy S24', year: 2024, msrp: 929 },
    { brand: 'Samsung', model: 'Galaxy S23 Ultra', year: 2023, msrp: 1419 },
    { brand: 'Samsung', model: 'Galaxy S23+', year: 2023, msrp: 1109 },
    { brand: 'Samsung', model: 'Galaxy S23', year: 2023, msrp: 879 },
    { brand: 'Samsung', model: 'Galaxy S22 Ultra', year: 2022, msrp: 1279 },
    { brand: 'Samsung', model: 'Galaxy S22+', year: 2022, msrp: 1079 },
    { brand: 'Samsung', model: 'Galaxy S22', year: 2022, msrp: 879 },
    { brand: 'Samsung', model: 'Galaxy S21 Ultra', year: 2021, msrp: 1279 },
    { brand: 'Samsung', model: 'Galaxy S21', year: 2021, msrp: 879 },
    { brand: 'Samsung', model: 'Galaxy Z Fold5', year: 2023, msrp: 1949 },
    { brand: 'Samsung', model: 'Galaxy Z Fold4', year: 2022, msrp: 1879 },
    { brand: 'Samsung', model: 'Galaxy Z Flip5', year: 2023, msrp: 1199 },
    { brand: 'Samsung', model: 'Galaxy Z Flip4', year: 2022, msrp: 1099 },
    { brand: 'Samsung', model: 'Galaxy A54', year: 2023, msrp: 449 },
    { brand: 'Samsung', model: 'Galaxy A34', year: 2023, msrp: 349 },
    { brand: 'Samsung', model: 'Galaxy A14', year: 2023, msrp: 199 },
    { brand: 'Samsung', model: 'Galaxy Note 20 Ultra', year: 2020, msrp: 1329 },
    // Xiaomi
    { brand: 'Xiaomi', model: 'Xiaomi 14 Ultra', year: 2024, msrp: 1499 },
    { brand: 'Xiaomi', model: 'Xiaomi 14 Pro', year: 2024, msrp: 999 },
    { brand: 'Xiaomi', model: 'Xiaomi 14', year: 2024, msrp: 899 },
    { brand: 'Xiaomi', model: 'Xiaomi 13 Ultra', year: 2023, msrp: 1499 },
    { brand: 'Xiaomi', model: 'Xiaomi 13 Pro', year: 2023, msrp: 1299 },
    { brand: 'Xiaomi', model: 'Xiaomi 13', year: 2023, msrp: 899 },
    { brand: 'Xiaomi', model: 'Redmi Note 13 Pro+', year: 2024, msrp: 449 },
    { brand: 'Xiaomi', model: 'Redmi Note 13 Pro', year: 2024, msrp: 349 },
    { brand: 'Xiaomi', model: 'Redmi Note 12 Pro+', year: 2023, msrp: 399 },
    { brand: 'Xiaomi', model: 'Redmi Note 12 Pro', year: 2023, msrp: 329 },
    { brand: 'Xiaomi', model: 'POCO F5 Pro', year: 2023, msrp: 499 },
    { brand: 'Xiaomi', model: 'POCO F5', year: 2023, msrp: 399 },
    { brand: 'Xiaomi', model: 'POCO X5 Pro', year: 2023, msrp: 349 },
    // Google
    { brand: 'Google', model: 'Pixel 9 Pro XL', year: 2024, msrp: 1179 },
    { brand: 'Google', model: 'Pixel 9 Pro', year: 2024, msrp: 1099 },
    { brand: 'Google', model: 'Pixel 9', year: 2024, msrp: 899 },
    { brand: 'Google', model: 'Pixel 8 Pro', year: 2023, msrp: 1099 },
    { brand: 'Google', model: 'Pixel 8', year: 2023, msrp: 799 },
    { brand: 'Google', model: 'Pixel 7 Pro', year: 2022, msrp: 899 },
    { brand: 'Google', model: 'Pixel 7a', year: 2023, msrp: 509 },
    // OnePlus
    { brand: 'OnePlus', model: 'OnePlus 12', year: 2024, msrp: 899 },
    { brand: 'OnePlus', model: 'OnePlus 11', year: 2023, msrp: 849 },
    { brand: 'OnePlus', model: 'OnePlus Nord 3', year: 2023, msrp: 399 },
    // Others
    { brand: 'OPPO', model: 'Find X6 Pro', year: 2023, msrp: 1299 },
    { brand: 'OPPO', model: 'Reno 10 Pro+', year: 2023, msrp: 799 },
    { brand: 'Huawei', model: 'P60 Pro', year: 2023, msrp: 1199 },
    { brand: 'Huawei', model: 'Mate 60 Pro', year: 2023, msrp: 1199 },
    { brand: 'Honor', model: 'Magic6 Pro', year: 2024, msrp: 1199 },
    { brand: 'Honor', model: 'Honor 90', year: 2023, msrp: 449 },
    { brand: 'Motorola', model: 'Edge 40 Pro', year: 2023, msrp: 899 },
    { brand: 'Motorola', model: 'Razr 40 Ultra', year: 2023, msrp: 1199 },
    { brand: 'Sony', model: 'Xperia 1 V', year: 2023, msrp: 1399 },
    { brand: 'Sony', model: 'Xperia 5 V', year: 2023, msrp: 999 },
    { brand: 'Nothing', model: 'Phone (2)', year: 2023, msrp: 599 },
    { brand: 'Nothing', model: 'Phone (1)', year: 2022, msrp: 469 },
    { brand: 'Asus', model: 'ROG Phone 8 Pro', year: 2024, msrp: 1199 },
    { brand: 'Asus', model: 'Zenfone 11 Ultra', year: 2024, msrp: 899 },
    { brand: 'Realme', model: 'GT 5 Pro', year: 2024, msrp: 599 },
    { brand: 'Realme', model: 'Realme 12 Pro+', year: 2024, msrp: 449 },
    { brand: 'Nokia', model: 'Nokia G60', year: 2022, msrp: 319 },
  ];

  const insert = db.prepare(`
    INSERT OR IGNORE INTO phone_models (brand, model, full_name, year_released, msrp_eur)
    VALUES (?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const m of models) {
      insert.run(m.brand, m.model, `${m.brand} ${m.model}`, m.year, m.msrp);
    }
  });
  tx();
  console.log(`📱 Seeded ${models.length} phone models`);
}

module.exports = { db, migrate };

// Run directly
if (require.main === module) {
  migrate();
}
