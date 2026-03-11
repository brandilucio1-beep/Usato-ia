const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const DB_PATH = process.env.DATABASE_PATH || './data/usato-ia.db';
const dbDir = path.dirname(path.resolve(__dirname, '..', DB_PATH));
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(path.resolve(__dirname, '..', DB_PATH));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS phone_models (id INTEGER PRIMARY KEY AUTOINCREMENT, brand TEXT NOT NULL, model TEXT NOT NULL, full_name TEXT NOT NULL, year_released INTEGER, msrp_eur REAL, category TEXT DEFAULT 'smartphone', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(brand, model));
    CREATE TABLE IF NOT EXISTS listings (id INTEGER PRIMARY KEY AUTOINCREMENT, phone_model_id INTEGER, source TEXT NOT NULL, external_id TEXT, title TEXT NOT NULL, price REAL NOT NULL, currency TEXT DEFAULT 'EUR', condition TEXT, description TEXT, location_city TEXT, location_region TEXT, location_province TEXT, url TEXT, image_url TEXT, seller_type TEXT, is_negotiable INTEGER DEFAULT 0, scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP, listing_date DATETIME, is_active INTEGER DEFAULT 1, raw_data TEXT, FOREIGN KEY (phone_model_id) REFERENCES phone_models(id), UNIQUE(source, external_id));
    CREATE TABLE IF NOT EXISTS price_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, phone_model_id INTEGER NOT NULL, snapshot_date DATETIME DEFAULT CURRENT_TIMESTAMP, avg_price REAL, median_price REAL, min_price REAL, max_price REAL, total_listings INTEGER, listings_by_condition TEXT, listings_by_region TEXT, listings_by_source TEXT, prices_by_region TEXT, prices_by_condition TEXT, FOREIGN KEY (phone_model_id) REFERENCES phone_models(id));
    CREATE TABLE IF NOT EXISTS favorites (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT DEFAULT 'default', phone_model_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (phone_model_id) REFERENCES phone_models(id), UNIQUE(user_id, phone_model_id));
    CREATE TABLE IF NOT EXISTS scrape_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, started_at DATETIME DEFAULT CURRENT_TIMESTAMP, finished_at DATETIME, status TEXT DEFAULT 'running', listings_found INTEGER DEFAULT 0, listings_new INTEGER DEFAULT 0, listings_updated INTEGER DEFAULT 0, error_message TEXT);
    CREATE INDEX IF NOT EXISTS idx_listings_phone ON listings(phone_model_id);
    CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source);
    CREATE INDEX IF NOT EXISTS idx_listings_region ON listings(location_region);
    CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(is_active);
    CREATE INDEX IF NOT EXISTS idx_snapshots_phone ON price_snapshots(phone_model_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_date ON price_snapshots(snapshot_date);
  `);
  seedPhoneModels();
}
function seedPhoneModels() {
  const models = [
    // ═══════════════════════════════════════
    // APPLE — iPhone
    // ═══════════════════════════════════════
    // 2025-2026
    {b:'Apple',m:'iPhone 17 Pro Max',y:2025,p:1399},
    {b:'Apple',m:'iPhone 17 Pro',y:2025,p:1239},
    {b:'Apple',m:'iPhone Air',y:2025,p:1129},
    {b:'Apple',m:'iPhone 17',y:2025,p:899},
    {b:'Apple',m:'iPhone 17e',y:2026,p:679},
    {b:'Apple',m:'iPhone 16e',y:2025,p:679},
    // 2024
    {b:'Apple',m:'iPhone 16 Pro Max',y:2024,p:1489},
    {b:'Apple',m:'iPhone 16 Pro',y:2024,p:1239},
    {b:'Apple',m:'iPhone 16 Plus',y:2024,p:1109},
    {b:'Apple',m:'iPhone 16',y:2024,p:979},
    // 2023
    {b:'Apple',m:'iPhone 15 Pro Max',y:2023,p:1489},
    {b:'Apple',m:'iPhone 15 Pro',y:2023,p:1239},
    {b:'Apple',m:'iPhone 15 Plus',y:2023,p:1109},
    {b:'Apple',m:'iPhone 15',y:2023,p:979},
    // 2022
    {b:'Apple',m:'iPhone 14 Pro Max',y:2022,p:1489},
    {b:'Apple',m:'iPhone 14 Pro',y:2022,p:1289},
    {b:'Apple',m:'iPhone 14 Plus',y:2022,p:1109},
    {b:'Apple',m:'iPhone 14',y:2022,p:979},
    // 2021
    {b:'Apple',m:'iPhone 13 Pro Max',y:2021,p:1389},
    {b:'Apple',m:'iPhone 13 Pro',y:2021,p:1189},
    {b:'Apple',m:'iPhone 13',y:2021,p:939},
    {b:'Apple',m:'iPhone 13 Mini',y:2021,p:839},
    // 2020
    {b:'Apple',m:'iPhone 12 Pro Max',y:2020,p:1289},
    {b:'Apple',m:'iPhone 12 Pro',y:2020,p:1189},
    {b:'Apple',m:'iPhone 12',y:2020,p:939},
    {b:'Apple',m:'iPhone 12 Mini',y:2020,p:839},
    // 2019 e precedenti
    {b:'Apple',m:'iPhone 11 Pro Max',y:2019,p:1289},
    {b:'Apple',m:'iPhone 11 Pro',y:2019,p:1189},
    {b:'Apple',m:'iPhone 11',y:2019,p:839},
    {b:'Apple',m:'iPhone SE 2022',y:2022,p:529},
    {b:'Apple',m:'iPhone SE 2020',y:2020,p:499},
    {b:'Apple',m:'iPhone XS Max',y:2018,p:1289},
    {b:'Apple',m:'iPhone XS',y:2018,p:1189},
    {b:'Apple',m:'iPhone XR',y:2018,p:889},
    {b:'Apple',m:'iPhone X',y:2017,p:1189},
    {b:'Apple',m:'iPhone 8 Plus',y:2017,p:889},
    {b:'Apple',m:'iPhone 8',y:2017,p:789},

    // ═══════════════════════════════════════
    // SAMSUNG — Galaxy S
    // ═══════════════════════════════════════
    // 2026
    {b:'Samsung',m:'Galaxy S26 Ultra',y:2026,p:1599},
    {b:'Samsung',m:'Galaxy S26+',y:2026,p:1279},
    {b:'Samsung',m:'Galaxy S26',y:2026,p:999},
    // 2025
    {b:'Samsung',m:'Galaxy S25 Ultra',y:2025,p:1459},
    {b:'Samsung',m:'Galaxy S25+',y:2025,p:1189},
    {b:'Samsung',m:'Galaxy S25',y:2025,p:929},
    {b:'Samsung',m:'Galaxy S25 Edge',y:2025,p:1299},
    {b:'Samsung',m:'Galaxy S25 FE',y:2025,p:749},
    // 2024
    {b:'Samsung',m:'Galaxy S24 Ultra',y:2024,p:1499},
    {b:'Samsung',m:'Galaxy S24+',y:2024,p:1179},
    {b:'Samsung',m:'Galaxy S24',y:2024,p:929},
    {b:'Samsung',m:'Galaxy S24 FE',y:2024,p:749},
    // 2023
    {b:'Samsung',m:'Galaxy S23 Ultra',y:2023,p:1419},
    {b:'Samsung',m:'Galaxy S23+',y:2023,p:1109},
    {b:'Samsung',m:'Galaxy S23',y:2023,p:879},
    {b:'Samsung',m:'Galaxy S23 FE',y:2023,p:699},
    // 2022
    {b:'Samsung',m:'Galaxy S22 Ultra',y:2022,p:1279},
    {b:'Samsung',m:'Galaxy S22+',y:2022,p:1079},
    {b:'Samsung',m:'Galaxy S22',y:2022,p:879},
    // 2021
    {b:'Samsung',m:'Galaxy S21 Ultra',y:2021,p:1279},
    {b:'Samsung',m:'Galaxy S21+',y:2021,p:1079},
    {b:'Samsung',m:'Galaxy S21',y:2021,p:879},
    {b:'Samsung',m:'Galaxy S21 FE',y:2022,p:769},
    {b:'Samsung',m:'Galaxy S20 Ultra',y:2020,p:1349},
    {b:'Samsung',m:'Galaxy S20+',y:2020,p:1099},
    {b:'Samsung',m:'Galaxy S20',y:2020,p:929},
    // Galaxy Z
    {b:'Samsung',m:'Galaxy Z Fold6',y:2024,p:1999},
    {b:'Samsung',m:'Galaxy Z Fold5',y:2023,p:1949},
    {b:'Samsung',m:'Galaxy Z Fold4',y:2022,p:1879},
    {b:'Samsung',m:'Galaxy Z Flip6',y:2024,p:1279},
    {b:'Samsung',m:'Galaxy Z Flip5',y:2023,p:1199},
    {b:'Samsung',m:'Galaxy Z Flip4',y:2022,p:1099},
    // Galaxy A
    {b:'Samsung',m:'Galaxy A56',y:2025,p:479},
    {b:'Samsung',m:'Galaxy A55',y:2024,p:479},
    {b:'Samsung',m:'Galaxy A54',y:2023,p:449},
    {b:'Samsung',m:'Galaxy A36',y:2025,p:349},
    {b:'Samsung',m:'Galaxy A35',y:2024,p:349},
    {b:'Samsung',m:'Galaxy A34',y:2023,p:349},
    {b:'Samsung',m:'Galaxy A26',y:2025,p:249},
    {b:'Samsung',m:'Galaxy A25',y:2024,p:249},
    {b:'Samsung',m:'Galaxy A16',y:2024,p:199},
    {b:'Samsung',m:'Galaxy A15',y:2024,p:179},
    {b:'Samsung',m:'Galaxy A14',y:2023,p:199},
    // Note
    {b:'Samsung',m:'Galaxy Note 20 Ultra',y:2020,p:1329},

    // ═══════════════════════════════════════
    // XIAOMI
    // ═══════════════════════════════════════
    {b:'Xiaomi',m:'Xiaomi 15 Ultra',y:2025,p:1499},
    {b:'Xiaomi',m:'Xiaomi 15 Pro',y:2025,p:1099},
    {b:'Xiaomi',m:'Xiaomi 15',y:2025,p:899},
    {b:'Xiaomi',m:'Xiaomi 14 Ultra',y:2024,p:1499},
    {b:'Xiaomi',m:'Xiaomi 14 Pro',y:2024,p:999},
    {b:'Xiaomi',m:'Xiaomi 14',y:2024,p:899},
    {b:'Xiaomi',m:'Xiaomi 13 Ultra',y:2023,p:1499},
    {b:'Xiaomi',m:'Xiaomi 13 Pro',y:2023,p:1299},
    {b:'Xiaomi',m:'Xiaomi 13',y:2023,p:899},
    {b:'Xiaomi',m:'Xiaomi 12 Pro',y:2022,p:999},
    {b:'Xiaomi',m:'Xiaomi 12',y:2022,p:799},
    // Redmi Note
    {b:'Xiaomi',m:'Redmi Note 14 Pro+',y:2025,p:469},
    {b:'Xiaomi',m:'Redmi Note 14 Pro',y:2025,p:369},
    {b:'Xiaomi',m:'Redmi Note 14',y:2025,p:249},
    {b:'Xiaomi',m:'Redmi Note 13 Pro+',y:2024,p:449},
    {b:'Xiaomi',m:'Redmi Note 13 Pro',y:2024,p:349},
    {b:'Xiaomi',m:'Redmi Note 13',y:2024,p:249},
    {b:'Xiaomi',m:'Redmi Note 12 Pro+',y:2023,p:399},
    {b:'Xiaomi',m:'Redmi Note 12 Pro',y:2023,p:329},
    // POCO
    {b:'Xiaomi',m:'POCO F6 Pro',y:2024,p:549},
    {b:'Xiaomi',m:'POCO F6',y:2024,p:399},
    {b:'Xiaomi',m:'POCO F5 Pro',y:2023,p:499},
    {b:'Xiaomi',m:'POCO F5',y:2023,p:399},
    {b:'Xiaomi',m:'POCO X6 Pro',y:2024,p:349},
    {b:'Xiaomi',m:'POCO X5 Pro',y:2023,p:349},
    // Xiaomi Mix
    {b:'Xiaomi',m:'Xiaomi Mix Fold 4',y:2024,p:1799},
    {b:'Xiaomi',m:'Xiaomi Mix Flip',y:2024,p:1299},

    // ═══════════════════════════════════════
    // GOOGLE PIXEL
    // ═══════════════════════════════════════
    // 2025
    {b:'Google',m:'Pixel 10 Pro XL',y:2025,p:1299},
    {b:'Google',m:'Pixel 10 Pro',y:2025,p:1099},
    {b:'Google',m:'Pixel 10',y:2025,p:899},
    {b:'Google',m:'Pixel 10 Pro Fold',y:2025,p:1899},
    {b:'Google',m:'Pixel 10a',y:2026,p:509},
    // 2024
    {b:'Google',m:'Pixel 9 Pro XL',y:2024,p:1179},
    {b:'Google',m:'Pixel 9 Pro',y:2024,p:1099},
    {b:'Google',m:'Pixel 9',y:2024,p:899},
    {b:'Google',m:'Pixel 9a',y:2025,p:509},
    // 2023
    {b:'Google',m:'Pixel 8 Pro',y:2023,p:1099},
    {b:'Google',m:'Pixel 8',y:2023,p:799},
    {b:'Google',m:'Pixel 8a',y:2024,p:509},
    // 2022
    {b:'Google',m:'Pixel 7 Pro',y:2022,p:899},
    {b:'Google',m:'Pixel 7a',y:2023,p:509},
    {b:'Google',m:'Pixel 7',y:2022,p:649},

    // ═══════════════════════════════════════
    // ONEPLUS
    // ═══════════════════════════════════════
    {b:'OnePlus',m:'OnePlus 13',y:2025,p:969},
    {b:'OnePlus',m:'OnePlus 13R',y:2025,p:599},
    {b:'OnePlus',m:'OnePlus 12',y:2024,p:899},
    {b:'OnePlus',m:'OnePlus 12R',y:2024,p:549},
    {b:'OnePlus',m:'OnePlus 11',y:2023,p:849},
    {b:'OnePlus',m:'OnePlus Nord 4',y:2024,p:399},
    {b:'OnePlus',m:'OnePlus Nord 3',y:2023,p:399},
    {b:'OnePlus',m:'OnePlus Nord CE 4',y:2024,p:349},
    {b:'OnePlus',m:'OnePlus Open',y:2023,p:1799},

    // ═══════════════════════════════════════
    // OPPO
    // ═══════════════════════════════════════
    {b:'OPPO',m:'Find X8 Pro',y:2024,p:1199},
    {b:'OPPO',m:'Find X8',y:2024,p:899},
    {b:'OPPO',m:'Find X7 Ultra',y:2024,p:1299},
    {b:'OPPO',m:'Find X6 Pro',y:2023,p:1299},
    {b:'OPPO',m:'Find N3 Flip',y:2023,p:1099},
    {b:'OPPO',m:'Reno 12 Pro',y:2024,p:549},
    {b:'OPPO',m:'Reno 12',y:2024,p:449},
    {b:'OPPO',m:'Reno 11 Pro',y:2024,p:499},
    {b:'OPPO',m:'A80',y:2024,p:279},

    // ═══════════════════════════════════════
    // HUAWEI
    // ═══════════════════════════════════════
    {b:'Huawei',m:'Pura 70 Ultra',y:2024,p:1499},
    {b:'Huawei',m:'Pura 70 Pro',y:2024,p:1199},
    {b:'Huawei',m:'Pura 70',y:2024,p:899},
    {b:'Huawei',m:'P60 Pro',y:2023,p:1199},
    {b:'Huawei',m:'Mate 60 Pro',y:2023,p:1199},
    {b:'Huawei',m:'Mate X6',y:2024,p:1999},
    {b:'Huawei',m:'Nova 13 Pro',y:2024,p:549},

    // ═══════════════════════════════════════
    // HONOR
    // ═══════════════════════════════════════
    {b:'Honor',m:'Magic7 Pro',y:2025,p:1199},
    {b:'Honor',m:'Magic7 Lite',y:2025,p:349},
    {b:'Honor',m:'Magic6 Pro',y:2024,p:1199},
    {b:'Honor',m:'Magic V3',y:2024,p:1999},
    {b:'Honor',m:'Honor 200 Pro',y:2024,p:599},
    {b:'Honor',m:'Honor 200',y:2024,p:449},
    {b:'Honor',m:'Honor 90',y:2023,p:449},

    // ═══════════════════════════════════════
    // MOTOROLA
    // ═══════════════════════════════════════
    {b:'Motorola',m:'Edge 50 Ultra',y:2024,p:999},
    {b:'Motorola',m:'Edge 50 Pro',y:2024,p:699},
    {b:'Motorola',m:'Edge 50 Fusion',y:2024,p:399},
    {b:'Motorola',m:'Edge 40 Pro',y:2023,p:899},
    {b:'Motorola',m:'Razr 50 Ultra',y:2024,p:1199},
    {b:'Motorola',m:'Razr 50',y:2024,p:899},
    {b:'Motorola',m:'Razr 40 Ultra',y:2023,p:1199},
    {b:'Motorola',m:'Moto G85',y:2024,p:299},
    {b:'Motorola',m:'Moto G84',y:2023,p:269},
    {b:'Motorola',m:'Moto G54',y:2023,p:229},

    // ═══════════════════════════════════════
    // SONY
    // ═══════════════════════════════════════
    {b:'Sony',m:'Xperia 1 VI',y:2024,p:1399},
    {b:'Sony',m:'Xperia 1 V',y:2023,p:1399},
    {b:'Sony',m:'Xperia 5 V',y:2023,p:999},
    {b:'Sony',m:'Xperia 10 VI',y:2024,p:399},
    {b:'Sony',m:'Xperia 10 V',y:2023,p:399},

    // ═══════════════════════════════════════
    // NOTHING
    // ═══════════════════════════════════════
    {b:'Nothing',m:'Phone (2a) Plus',y:2024,p:399},
    {b:'Nothing',m:'Phone (2a)',y:2024,p:349},
    {b:'Nothing',m:'Phone (2)',y:2023,p:599},
    {b:'Nothing',m:'Phone (1)',y:2022,p:469},
    {b:'Nothing',m:'CMF Phone 1',y:2024,p:239},

    // ═══════════════════════════════════════
    // ASUS
    // ═══════════════════════════════════════
    {b:'Asus',m:'ROG Phone 9 Pro',y:2025,p:1299},
    {b:'Asus',m:'ROG Phone 9',y:2025,p:999},
    {b:'Asus',m:'ROG Phone 8 Pro',y:2024,p:1199},
    {b:'Asus',m:'Zenfone 11 Ultra',y:2024,p:899},
    {b:'Asus',m:'Zenfone 10',y:2023,p:799},

    // ═══════════════════════════════════════
    // REALME
    // ═══════════════════════════════════════
    {b:'Realme',m:'GT 7 Pro',y:2024,p:699},
    {b:'Realme',m:'GT 6',y:2024,p:549},
    {b:'Realme',m:'GT 5 Pro',y:2024,p:599},
    {b:'Realme',m:'Realme 13 Pro+',y:2024,p:449},
    {b:'Realme',m:'Realme 13 Pro',y:2024,p:379},
    {b:'Realme',m:'Realme 12 Pro+',y:2024,p:449},
    {b:'Realme',m:'Realme 12 Pro',y:2024,p:379},
    {b:'Realme',m:'Realme 11 Pro+',y:2023,p:449},
    {b:'Realme',m:'Realme C67',y:2024,p:179},
    {b:'Realme',m:'Realme Narzo 70 Pro',y:2024,p:249},

    // ═══════════════════════════════════════
    // VIVO
    // ═══════════════════════════════════════
    {b:'vivo',m:'X200 Pro',y:2024,p:1299},
    {b:'vivo',m:'X200',y:2024,p:899},
    {b:'vivo',m:'X100 Pro',y:2024,p:1199},
    {b:'vivo',m:'X100',y:2024,p:799},
    {b:'vivo',m:'V40 Pro',y:2024,p:599},
    {b:'vivo',m:'V40',y:2024,p:449},
    {b:'vivo',m:'V30 Pro',y:2024,p:549},
    {b:'vivo',m:'Y100',y:2024,p:249},

    // ═══════════════════════════════════════
    // NOKIA
    // ═══════════════════════════════════════
    {b:'Nokia',m:'Nokia G60',y:2022,p:319},
    {b:'Nokia',m:'Nokia G42',y:2023,p:199},
    {b:'Nokia',m:'Nokia X30',y:2022,p:449},

    // ═══════════════════════════════════════
    // TECNO
    // ═══════════════════════════════════════
    {b:'Tecno',m:'Phantom V Fold2',y:2024,p:1099},
    {b:'Tecno',m:'Phantom V Flip',y:2023,p:599},
    {b:'Tecno',m:'Camon 30 Pro',y:2024,p:349},
    {b:'Tecno',m:'Spark 20 Pro+',y:2024,p:199},

    // ═══════════════════════════════════════
    // FAIRPHONE
    // ═══════════════════════════════════════
    {b:'Fairphone',m:'Fairphone 5',y:2023,p:699},
    {b:'Fairphone',m:'Fairphone 4',y:2021,p:579},

    // ═══════════════════════════════════════
    // TCL
    // ═══════════════════════════════════════
    {b:'TCL',m:'TCL 50 Pro',y:2024,p:299},
    {b:'TCL',m:'TCL 40 NxtPaper',y:2024,p:249},

    // ═══════════════════════════════════════
    // ZTE / NUBIA
    // ═══════════════════════════════════════
    {b:'ZTE',m:'Nubia Z70 Ultra',y:2025,p:799},
    {b:'ZTE',m:'Nubia Z60 Ultra',y:2024,p:749},
    {b:'ZTE',m:'Nubia Red Magic 10 Pro',y:2025,p:699},
  ];

  const insert = db.prepare('INSERT OR IGNORE INTO phone_models (brand, model, full_name, year_released, msrp_eur) VALUES (?, ?, ?, ?, ?)');
  const tx = db.transaction(() => { for (const m of models) insert.run(m.b, m.m, m.b+' '+m.m, m.y, m.p); });
  tx();
}
module.exports = { db, migrate };
if (require.main === module) migrate();

