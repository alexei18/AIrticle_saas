const { DataTypes, Op } = require('sequelize'); // NOU: Am importat Op pentru a fi disponibil global
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
  passwordHash: { type: DataTypes.STRING, allowNull: false, field: 'password_hash' },
  firstName: { type: DataTypes.STRING, allowNull: false, field: 'first_name' },
  lastName: { type: DataTypes.STRING, allowNull: false, field: 'last_name' },
  planType: { type: DataTypes.ENUM('starter', 'professional', 'enterprise'), defaultValue: 'starter', field: 'plan_type' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  emailVerified: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'email_verified' },
  trialEndsAt: { type: DataTypes.DATE, field: 'trial_ends_at' },
  subscriptionEndsAt: { type: DataTypes.DATE, field: 'subscription_ends_at' }
}, { tableName: 'users', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const Website = sequelize.define('Website', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
  domain: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_verified' },
  lastCrawledAt: { type: DataTypes.DATE, field: 'last_crawled_at' },
  crawlStatus: { type: DataTypes.ENUM('pending', 'crawling', 'completed', 'failed'), defaultValue: 'pending', field: 'crawl_status' }
}, { tableName: 'websites', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// MODIFICAT: Adăugăm câmpul enrichmentStatus
const Keyword = sequelize.define('Keyword', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  websiteId: { type: DataTypes.INTEGER, allowNull: false, field: 'website_id' },
  keyword: { type: DataTypes.STRING(500), allowNull: false },
  searchVolume: { type: DataTypes.INTEGER, field: 'search_volume' },
  difficultyScore: { type: DataTypes.DECIMAL(5, 2), field: 'difficulty_score' },
  currentPosition: { type: DataTypes.INTEGER, field: 'current_position' },
  intentType: { type: DataTypes.ENUM('informational', 'commercial', 'transactional', 'navigational'), defaultValue: 'informational', field: 'intent_type' },
  isTracking: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_tracking' },
  enrichmentStatus: { type: DataTypes.ENUM('pending', 'completed', 'failed'), defaultValue: 'pending', field: 'enrichment_status' },
  aiTrendScore: { type: DataTypes.INTEGER, field: 'ai_trend_score' }
}, { tableName: 'keywords', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const Article = sequelize.define('Article', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  websiteId: { type: DataTypes.INTEGER, allowNull: false, field: 'website_id' },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
  title: { type: DataTypes.STRING(500), allowNull: false },
  slug: { type: DataTypes.STRING(500), allowNull: false },
  content: { type: DataTypes.TEXT('long'), allowNull: false },
  metaTitle: { type: DataTypes.STRING, field: 'meta_title' },
  metaDescription: { type: DataTypes.STRING(500), field: 'meta_description' },
  targetKeywords: { type: DataTypes.JSON, field: 'target_keywords' },
  wordCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'word_count' },
  seoScore: { type: DataTypes.DECIMAL(5, 2), field: 'seo_score' },
  status: { type: DataTypes.ENUM('draft', 'published', 'archived'), defaultValue: 'draft' }
}, { tableName: 'articles', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const Analysis = sequelize.define('Analysis', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  websiteId: { type: DataTypes.INTEGER, allowNull: false, field: 'website_id' },
  overallScore: { type: DataTypes.DECIMAL(5, 2), field: 'overall_score' },
  technicalReport: { type: DataTypes.JSON, field: 'technical_report' },
  contentReport: { type: DataTypes.JSON, field: 'content_report' },
  seoReport: { type: DataTypes.JSON, field: 'seo_report' },
  recommendations: { type: DataTypes.JSON }
}, { tableName: 'analyses', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const CrawledPage = sequelize.define('CrawledPage', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  websiteId: { type: DataTypes.INTEGER, allowNull: false, field: 'website_id' },
  url: { type: DataTypes.STRING(2048), allowNull: false },
  title: { type: DataTypes.STRING(500) },
  metaDescription: { type: DataTypes.TEXT, field: 'meta_description' },
  content: { type: DataTypes.TEXT('long') },
  headings: { type: DataTypes.JSON },
  seoScore: { type: DataTypes.DECIMAL(5, 2), field: 'seo_score' },
  issues: { type: DataTypes.JSON },
  suggestions: { type: DataTypes.JSON }, // ADĂUGAT
  aiRecommendations: { type: DataTypes.JSON, field: 'ai_recommendations' }
}, { tableName: 'crawled_pages', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const Activity = sequelize.define('Activity', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
  type: { type: DataTypes.ENUM('keyword_added', 'position_change', 'website_analyzed', 'report_generated', 'setting_changed', 'login', 'upgrade', 'alert'), allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  metadata: { type: DataTypes.JSON },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high'), defaultValue: 'medium' },
  category: { type: DataTypes.ENUM('seo', 'system', 'account', 'alert'), allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_read' }
}, { tableName: 'activities', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const KeywordPosition = sequelize.define('KeywordPosition', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  keywordId: { type: DataTypes.INTEGER, allowNull: false, field: 'keyword_id' },
  position: { type: DataTypes.INTEGER },
  searchVolume: { type: DataTypes.INTEGER, field: 'search_volume' },
  traffic: { type: DataTypes.INTEGER, defaultValue: 0 },
  clickThroughRate: { type: DataTypes.DECIMAL(5, 2), field: 'click_through_rate' },
  recordedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'recorded_at' }
}, { tableName: 'keyword_positions', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const UserProfile = sequelize.define('UserProfile', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'user_id' },
  phone: { type: DataTypes.STRING },
  company: { type: DataTypes.STRING },
  location: { type: DataTypes.STRING },
  bio: { type: DataTypes.TEXT },
  avatar: { type: DataTypes.STRING },
  twoFactorEnabled: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'two_factor_enabled' },
  timezone: { type: DataTypes.STRING, defaultValue: 'Europe/Bucharest' },
  language: { type: DataTypes.STRING, defaultValue: 'ro' }
}, { tableName: 'user_profiles', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const NotificationSettings = sequelize.define('NotificationSettings', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: false, unique: true, field: 'user_id' },
  emailNotifications: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'email_notifications' },
  keywordAlerts: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'keyword_alerts' },
  reportDigest: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'report_digest' },
  securityAlerts: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'security_alerts' }
}, { tableName: 'notification_settings', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const PricingPlan = sequelize.define('PricingPlan', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  monthlyPrice: { type: DataTypes.DECIMAL(8, 2), field: 'monthly_price' },
  yearlyPrice: { type: DataTypes.DECIMAL(8, 2), field: 'yearly_price' },
  description: { type: DataTypes.TEXT },
  features: { type: DataTypes.JSON },
  isPopular: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_popular' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  sortOrder: { type: DataTypes.INTEGER, defaultValue: 0, field: 'sort_order' }
}, { tableName: 'pricing_plans', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const TrafficAnalytics = sequelize.define('TrafficAnalytics', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  websiteId: { type: DataTypes.INTEGER, allowNull: false, field: 'website_id' },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  organicTraffic: { type: DataTypes.INTEGER, defaultValue: 0, field: 'organic_traffic' },
  paidTraffic: { type: DataTypes.INTEGER, defaultValue: 0, field: 'paid_traffic' },
  desktopTraffic: { type: DataTypes.INTEGER, defaultValue: 0, field: 'desktop_traffic' },
  mobileTraffic: { type: DataTypes.INTEGER, defaultValue: 0, field: 'mobile_traffic' },
  tabletTraffic: { type: DataTypes.INTEGER, defaultValue: 0, field: 'tablet_traffic' },
  clickThroughRate: { type: DataTypes.DECIMAL(5, 2), field: 'click_through_rate' }
}, { tableName: 'traffic_analytics', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const GoogleAnalyticsConnection = sequelize.define('GoogleAnalyticsConnection', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  websiteId: { type: DataTypes.INTEGER, allowNull: false, field: 'website_id' },
  gaPropertyId: { type: DataTypes.STRING, field: 'ga_property_id' },
  accessToken: { type: DataTypes.TEXT, field: 'access_token' },
  refreshToken: { type: DataTypes.TEXT, field: 'refresh_token' },
  tokenExpiresAt: { type: DataTypes.DATE, field: 'token_expires_at' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_active' },
  lastSyncAt: { type: DataTypes.DATE, field: 'last_sync_at' }
}, { tableName: 'google_analytics_connections', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const GoogleAnalyticsData = sequelize.define('GoogleAnalyticsData', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  websiteId: { type: DataTypes.INTEGER, allowNull: false, field: 'website_id' },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  sessions: { type: DataTypes.INTEGER, defaultValue: 0 },
  users: { type: DataTypes.INTEGER, defaultValue: 0 },
  pageViews: { type: DataTypes.INTEGER, defaultValue: 0, field: 'page_views' },
  bounceRate: { type: DataTypes.DECIMAL(5, 2), field: 'bounce_rate' },
  avgSessionDuration: { type: DataTypes.INTEGER, field: 'avg_session_duration' },
  topPages: { type: DataTypes.JSON, field: 'top_pages' },
  deviceBreakdown: { type: DataTypes.JSON, field: 'device_breakdown' },
  trafficSources: { type: DataTypes.JSON, field: 'traffic_sources' },
}, { tableName: 'google_analytics_data', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const SerpSnapshot = sequelize.define('SerpSnapshot', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    websiteId: { type: DataTypes.INTEGER, allowNull: false, field: 'website_id' },
    keyword: { type: DataTypes.STRING, allowNull: false },
    totalResults: { type: DataTypes.BIGINT, field: 'total_results' },
    organicResults: { type: DataTypes.JSON, field: 'organic_results' },
    relatedQuestions: { type: DataTypes.JSON, field: 'related_questions' },
    featuredSnippet: { type: DataTypes.JSON, field: 'featured_snippet' },
    knowledgeGraph: { type: DataTypes.JSON, field: 'knowledge_graph' },
}, { tableName: 'serp_snapshots', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const Backlink = sequelize.define('Backlink', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    websiteId: { type: DataTypes.INTEGER, allowNull: false, field: 'website_id' },
    sourceUrl: { type: DataTypes.STRING(2048), allowNull: false, field: 'source_url' },
    sourceDomain: { type: DataTypes.STRING, field: 'source_domain' },
    title: { type: DataTypes.STRING(500) },
    snippet: { type: DataTypes.TEXT },
    discoveredAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'discovered_at' },
}, { tableName: 'backlinks', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const ContentGap = sequelize.define('ContentGap', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    websiteId: { type: DataTypes.INTEGER, allowNull: false, field: 'website_id' },
    keyword: { type: DataTypes.STRING, allowNull: false },
    competitorsRanking: { type: DataTypes.JSON, field: 'competitors_ranking' },
    opportunityScore: { type: DataTypes.INTEGER, field: 'opportunity_score' },
}, { tableName: 'content_gaps', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const KeywordTrend = sequelize.define('KeywordTrend', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  keywordId: { type: DataTypes.INTEGER, allowNull: false, field: 'keyword_id' },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  interestScore: { type: DataTypes.INTEGER, allowNull: false, field: 'interest_score' },
}, { tableName: 'keyword_trends', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

User.hasMany(Website, { foreignKey: 'userId', as: 'websites', onDelete: 'CASCADE' });
Website.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Website.hasMany(Keyword, { foreignKey: 'websiteId', as: 'keywords', onDelete: 'CASCADE' });
Keyword.belongsTo(Website, { foreignKey: 'websiteId', as: 'website' });

Website.hasMany(Article, { foreignKey: 'websiteId', as: 'articles', onDelete: 'CASCADE' });
Article.belongsTo(Website, { foreignKey: 'websiteId', as: 'website' });

User.hasMany(Article, { foreignKey: 'userId', as: 'articles', onDelete: 'CASCADE' });
Article.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Website.hasMany(Analysis, { foreignKey: 'websiteId', as: 'analyses', onDelete: 'CASCADE' });
Analysis.belongsTo(Website, { foreignKey: 'websiteId', as: 'website' });

Website.hasMany(CrawledPage, { foreignKey: 'websiteId', as: 'crawledPages', onDelete: 'CASCADE' });
CrawledPage.belongsTo(Website, { foreignKey: 'websiteId', as: 'website' });

User.hasMany(Activity, { foreignKey: 'userId', as: 'activities', onDelete: 'CASCADE' });
Activity.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Keyword.hasMany(KeywordPosition, { foreignKey: 'keywordId', as: 'positions', onDelete: 'CASCADE' });
KeywordPosition.belongsTo(Keyword, { foreignKey: 'keywordId', as: 'keyword' });

Keyword.hasMany(KeywordTrend, { foreignKey: 'keywordId', as: 'trends', onDelete: 'CASCADE' });
KeywordTrend.belongsTo(Keyword, { foreignKey: 'keywordId', as: 'keyword' });

User.hasOne(UserProfile, { foreignKey: 'userId', as: 'profile', onDelete: 'CASCADE' });
UserProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(NotificationSettings, { foreignKey: 'userId', as: 'notificationSettings', onDelete: 'CASCADE' });
NotificationSettings.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Website.hasMany(TrafficAnalytics, { foreignKey: 'websiteId', as: 'trafficAnalytics', onDelete: 'CASCADE' });
TrafficAnalytics.belongsTo(Website, { foreignKey: 'websiteId', as: 'website' });

Website.hasOne(GoogleAnalyticsConnection, { foreignKey: 'websiteId', as: 'googleAnalyticsConnection', onDelete: 'CASCADE' });
GoogleAnalyticsConnection.belongsTo(Website, { foreignKey: 'websiteId', as: 'website' });

Website.hasMany(GoogleAnalyticsData, { foreignKey: 'websiteId', as: 'googleAnalyticsData', onDelete: 'CASCADE' });
GoogleAnalyticsData.belongsTo(Website, { foreignKey: 'websiteId', as: 'website' });

Website.hasMany(SerpSnapshot, { foreignKey: 'websiteId', as: 'serpSnapshots', onDelete: 'CASCADE' });
SerpSnapshot.belongsTo(Website, { foreignKey: 'websiteId', as: 'website' });

Website.hasMany(Backlink, { foreignKey: 'websiteId', as: 'backlinks', onDelete: 'CASCADE' });
Backlink.belongsTo(Website, { foreignKey: 'websiteId', as: 'website' });

Website.hasMany(ContentGap, { foreignKey: 'websiteId', as: 'contentGaps', onDelete: 'CASCADE' });
ContentGap.belongsTo(Website, { foreignKey: 'websiteId', as: 'website' });

module.exports = {
  sequelize, User, Website, Keyword, Article, Analysis, CrawledPage,
  Activity, KeywordPosition, UserProfile, NotificationSettings, PricingPlan, TrafficAnalytics,
  GoogleAnalyticsConnection, GoogleAnalyticsData,
  SerpSnapshot, Backlink, ContentGap, KeywordTrend,
  Op // NOU: Exportăm Op pentru a fi disponibil
};