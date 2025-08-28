require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const { testConnection } = require('./config/database'); 
const authRoutes = require('./routes/auth');
const websiteRoutes = require('./routes/websites');
const keywordRoutes = require('./routes/keywords');
const articleRoutes = require('./routes/articles');
const analysisRoutes = require('./routes/analysis');
const googleAnalyticsRoutes = require('./routes/googleAnalytics');
const aiAnalyticsRoutes = require('./routes/aiAnalytics');
const dashboardRoutes = require('./routes/dashboard');
const seoRoutes = require('./routes/seo');
const aiSuggestionsRoutes = require('./routes/aiSuggestions'); // Adăugat
const { queue: analysisQueue } = require('./services/analysisQueue');
const KeywordService = require('./services/keywordService');
const RankTrackingService = require('./services/rankTrackingService');
const GoogleTrendsService = require('./services/googleTrendsService'); // NOU

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api', limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


app.get('/health', (req, res) => res.json({ status: 'OK' }));
app.get('/', (req, res) => res.json({ message: 'Welcome to the API!' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/keywords', keywordRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/google-analytics', googleAnalyticsRoutes);
app.use('/api/ai-analytics', aiAnalyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/ai-suggestions', aiSuggestionsRoutes); // Adăugat

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const startServer = async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`---`);
      console.log(`🚀 Server running successfully on port ${PORT}`);
      console.log(`📝 Analysis queue is ready and listening for jobs...`);
      console.log(`---`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

analysisQueue.on('completed', (job, result) => {
  console.log(`[Queue] ✅ Job ${job.id} of type ${job.name} completed successfully.`);
});

analysisQueue.on('failed', (job, err) => {
  console.error(`[Queue] ❌ Job ${job.id} of type ${job.name} failed with error:`, err.message);
});

// Cron Job pentru îmbogățirea keyword-urilor
cron.schedule('*/2 * * * *', () => {
  KeywordService.runEnrichmentJob();
});
console.log('🕒 Keyword enrichment cron job scheduled to run every 2 minutes.');

// NOU: Cron Job pentru Rank Tracking (rulează zilnic la 3:00 AM)
cron.schedule('0 3 * * *', () => {
  RankTrackingService.runTrackingJob();
});
console.log('🕒 Daily rank tracking job scheduled to run at 3:00 AM.');

// NOU: Cron Job pentru Google Trends (rulează zilnic la 2:00 AM)
cron.schedule('0 2 * * *', () => {
  GoogleTrendsService.runDailyTrendUpdate();
});
console.log('🕒 Daily Google Trends update job scheduled to run at 2:00 AM.');


startServer();