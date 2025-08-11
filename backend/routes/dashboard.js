const express = require('express');
const { Op, Sequelize } = require('sequelize'); // Am adăugat și Sequelize pentru funcții de agregare
const { 
  User, Website, Keyword, Analysis, Activity, GoogleAnalyticsData,
  Backlink, ContentGap, UserProfile, NotificationSettings,
  Article // MODIFICAT: Am adăugat modelul lipsă
} = require('../models');
const { authenticateToken: auth } = require('../middleware/auth');
const GoogleAnalyticsService = require('../services/googleAnalyticsService');

const router = express.Router();
router.use(auth);

// Endpoint-ul pentru Dashboard Overview
router.get('/overview', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const websites = await Website.findAll({
      where: { userId },
      include: [
          { model: Keyword, as: 'keywords', attributes: ['id', 'currentPosition'] },
          { model: Analysis, as: 'analyses', attributes: ['created_at'], order: [['created_at', 'DESC']], limit: 1 },
          { model: Article, as: 'articles', attributes: ['id'] }
      ]
    });

    const totalWebsites = websites.length;
    let totalKeywords = 0;
    let totalArticles = 0;
    const allKeywords = [];

    websites.forEach(w => {
        totalKeywords += w.keywords?.length || 0;
        totalArticles += w.articles?.length || 0;
        if(w.keywords) allKeywords.push(...w.keywords);
    });

    const recentActivities = await Activity.findAll({
      where: { userId },
      order: [['created_at', 'DESC']],
      limit: 5
    });

    const keywordsWithPosition = allKeywords.filter(k => k.currentPosition > 0);
    const avgPosition = keywordsWithPosition.length > 0 
      ? keywordsWithPosition.reduce((sum, k) => sum + (k.currentPosition || 0), 0) / keywordsWithPosition.length
      : 0;

    const positionDistribution = {
      top3: keywordsWithPosition.filter(k => k.currentPosition <= 3).length,
      top10: keywordsWithPosition.filter(k => k.currentPosition > 3 && k.currentPosition <= 10).length,
      beyond10: keywordsWithPosition.filter(k => k.currentPosition > 10).length,
    };

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const websiteIds = websites.map(w => w.id);
    let monthlyTraffic = 0;
    if (websiteIds.length > 0) {
        const trafficResult = await GoogleAnalyticsData.findOne({
            where: { 
                websiteId: { [Op.in]: websiteIds }, 
                date: { [Op.gte]: startDate } 
            },
            attributes: [[Sequelize.fn('SUM', Sequelize.col('sessions')), 'totalSessions']]
        });
        monthlyTraffic = trafficResult?.getDataValue('totalSessions') || 0;
    }


    res.json({
      success: true,
      data: {
        stats: {
            totalWebsites,
            totalKeywords,
            totalArticles,
            monthlyTraffic: parseInt(monthlyTraffic, 10),
        },
        keywordPerformance: {
            avgPosition: parseFloat(avgPosition.toFixed(1)),
            distribution: positionDistribution,
        },
        recentActivities,
        websites: websites.map(w => ({
          id: w.id,
          name: w.name,
          domain: w.domain,
          crawlStatus: w.crawlStatus,
          lastCrawledAt: w.analyses?.[0]?.created_at || null
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Endpoint Analytics
router.get('/analytics', auth, async (req, res) => {
  try {
    const { dateRange = '30', websiteId } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange));

    const websiteFilter = { userId: req.user.id };
    if (websiteId && websiteId !== 'all') {
      websiteFilter.id = websiteId;
    }
    
    const userWebsites = await Website.findAll({ where: websiteFilter, attributes: ['id'] });
    const websiteIds = userWebsites.map(w => w.id);

    if (websiteIds.length === 0) {
      return res.json({ success: true, data: null });
    }

    await Promise.all(
      websiteIds.map(id => GoogleAnalyticsService.fetchAnalyticsData(id, `${dateRange}daysAgo`, 'today'))
    );
    
    const [keywords, analyticsData, backlinksCount, contentGaps] = await Promise.all([
        Keyword.findAll({ where: { websiteId: { [Op.in]: websiteIds } } }),
        GoogleAnalyticsData.findAll({ where: { websiteId: { [Op.in]: websiteIds }, date: { [Op.gte]: startDate } }, order: [['date', 'ASC']] }),
        Backlink.count({ where: { websiteId: { [Op.in]: websiteIds } } }),
        ContentGap.findAll({ where: { websiteId: { [Op.in]: websiteIds } }, order: [['opportunity_score', 'DESC']], limit: 5 })
    ]);

    const responseData = {
        totalKeywords: 0, avgPosition: 0,
        positionDistribution: { top3: 0, top10: 0, top50: 0, beyond50: 0 },
        totalTraffic: 0, totalUsers: 0, trafficTrend: [],
        deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
        backlinksCount: 0, topContentGaps: []
    };

    if (keywords.length > 0) {
        responseData.totalKeywords = keywords.length;
        const keywordsWithPosition = keywords.filter(k => k.currentPosition > 0);
        responseData.avgPosition = keywordsWithPosition.length > 0 ? parseFloat((keywordsWithPosition.reduce((sum, k) => sum + k.currentPosition, 0) / keywordsWithPosition.length).toFixed(1)) : 0;
        responseData.positionDistribution = {
            top3: keywords.filter(k => k.currentPosition > 0 && k.currentPosition <= 3).length,
            top10: keywords.filter(k => k.currentPosition > 3 && k.currentPosition <= 10).length,
            top50: keywords.filter(k => k.currentPosition > 10 && k.currentPosition <= 50).length,
            beyond50: keywords.filter(k => k.currentPosition > 50).length
        };
    }

    if (analyticsData.length > 0) {
        const trafficTrend = {};
        analyticsData.forEach(day => {
            responseData.totalTraffic += day.sessions || 0;
            responseData.totalUsers += day.users || 0;
            const date = day.date;
            if (!trafficTrend[date]) trafficTrend[date] = { organic: 0, users: 0 };
            trafficTrend[date].organic += day.sessions || 0;
            trafficTrend[date].users += day.users || 0;
            if (day.deviceBreakdown && Array.isArray(day.deviceBreakdown)) {
                day.deviceBreakdown.forEach(device => {
                    if (device && device.device) {
                        const category = device.device.toLowerCase();
                        if (responseData.deviceBreakdown.hasOwnProperty(category)) {
                            responseData.deviceBreakdown[category] += device.sessions || 0;
                        }
                    }
                });
            }
        });
        responseData.trafficTrend = Object.entries(trafficTrend).map(([date, values]) => ({
            date: new Date(date).toLocaleDateString('ro-RO', { month: 'short', day: 'numeric' }),
            organic: values.organic, users: values.users
        }));
        const totalDeviceSessions = Object.values(responseData.deviceBreakdown).reduce((sum, val) => sum + val, 0);
        if (totalDeviceSessions > 0) {
            responseData.deviceBreakdown.desktop = Math.round((responseData.deviceBreakdown.desktop / totalDeviceSessions) * 100);
            responseData.deviceBreakdown.mobile = Math.round((responseData.deviceBreakdown.mobile / totalDeviceSessions) * 100);
            responseData.deviceBreakdown.tablet = Math.round((responseData.deviceBreakdown.tablet / totalDeviceSessions) * 100);
        }
    }
    
    responseData.backlinksCount = backlinksCount || 0;
    responseData.topContentGaps = contentGaps.map(g => ({ keyword: g.keyword, opportunityScore: g.opportunityScore })) || [];
    
    const hasAnyData = responseData.totalKeywords > 0 || responseData.totalTraffic > 0 || responseData.backlinksCount > 0;
    
    res.json({
      success: true,
      data: hasAnyData ? responseData : null
    });

  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/profile', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: ['profile', 'notificationSettings']
    });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName } = req.body;
    await User.update({ firstName, lastName }, { where: { id: userId } });
    const [profile] = await UserProfile.findOrCreate({ where: { userId } });
    await profile.update(req.body);
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/notifications', async (req, res) => {
  try {
    const [settings] = await NotificationSettings.findOrCreate({ where: { userId: req.user.id } });
    await settings.update(req.body);
    res.json({ success: true, message: 'Notification settings updated successfully' });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/activities', async (req, res) => {
    try {
      const { filter = 'all', timeRange = 'all', limit = 20, offset = 0 } = req.query;
      const whereClause = { userId: req.user.id };
      
      if (filter !== 'all') {
        whereClause.category = filter;
      }
      
      if (timeRange !== 'all') {
        const days = { today: 1, week: 7, month: 30 }[timeRange];
        if(days) {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            whereClause.created_at = { [Op.gte]: startDate };
        }
      }
  
      const { count, rows: activities } = await Activity.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      const stats = {
          total: await Activity.count({ where: { userId: req.user.id } }),
          high: await Activity.count({ where: { userId: req.user.id, priority: 'high' } }),
          seo: await Activity.count({ where: { userId: req.user.id, category: 'seo' } }),
          alerts: await Activity.count({ where: { userId: req.user.id, category: 'alert' } }),
      };
  
      res.json({ 
        success: true, 
        data: { 
          activities, 
          stats,
          pagination: {
              total: count,
              limit: parseInt(limit),
              offset: parseInt(offset),
              hasMore: count > (parseInt(offset) + activities.length)
          }
        } 
    });
    } catch (error) {
      console.error('Error fetching activities:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

module.exports = router;