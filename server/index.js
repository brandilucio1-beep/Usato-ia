require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

const { migrate } = require('./models/migrate');
const apiRoutes = require('./routes/api');
const { scrapeAll } = require('./jobs/scrapeAll');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Ensure directories exist ─────────────────────────────────────────────────
['data', 'logs'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ─── Database setup ───────────────────────────────────────────────────────────
migrate();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL || true 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  message: { error: 'Troppe richieste, riprova tra qualche minuto' },
});
app.use('/api', limiter);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Serve React frontend in production ───────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '../client/dist');
  if (fs.existsSync(clientBuild)) {
    app.use(express.static(clientBuild));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuild, 'index.html'));
    });
  }
}

// ─── Cron: Scrape every N hours ───────────────────────────────────────────────
const interval = parseInt(process.env.SCRAPE_INTERVAL_HOURS) || 6;
const cronExpr = `0 */${interval} * * *`; // Every N hours at minute 0

cron.schedule(cronExpr, async () => {
  logger.info(`⏰ Scheduled scrape triggered (every ${interval}h)`);
  try {
    await scrapeAll();
  } catch (err) {
    logger.error(`Scheduled scrape error: ${err.message}`);
  }
});

logger.info(`⏰ Scrape scheduled: ${cronExpr} (every ${interval} hours)`);

// ─── Manual scrape trigger (for admin) ────────────────────────────────────────
app.post('/api/admin/scrape', async (req, res) => {
  // In production, add authentication here
  logger.info('🔧 Manual scrape triggered via API');
  res.json({ message: 'Scrape started', status: 'running' });
  
  try {
    const results = await scrapeAll();
    logger.info('Manual scrape completed');
  } catch (err) {
    logger.error(`Manual scrape error: ${err.message}`);
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 UsatoIA server running on port ${PORT}`);
  logger.info(`📡 API: http://localhost:${PORT}/api`);
  logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Run initial scrape on startup if database is empty
  const Database = require('./models/db');
  const lastScrape = Database.getLastScrapeTime();
  if (!lastScrape?.last_scrape) {
    logger.info('📦 No previous scrape found - starting initial data collection...');
    logger.info('   This will run in the background. The app is usable immediately.');
    scrapeAll().catch(err => logger.error(`Initial scrape error: ${err.message}`));
  }
});
