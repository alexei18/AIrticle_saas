const { google } = require('googleapis');
const { GoogleAnalyticsConnection, GoogleAnalyticsData, Website } = require('../models');
const { Op } = require('sequelize');

const SYNC_COOLDOWN_MINUTES = 10; // Nu sincronizăm mai des de 10 minute

class GoogleAnalyticsService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    this.analyticsData = google.analyticsdata({ version: 'v1beta', auth: this.oauth2Client });
  }

  getAuthUrl(websiteId) {
    const scopes = [
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/analytics'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: String(websiteId),
    });
  }

  async exchangeCodeForTokens(code, websiteId) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        console.warn(`[GA Service] WARNING: Did not receive a refresh token for websiteId ${websiteId}.`);
      }
      
      const expiresAt = new Date(tokens.expiry_date);

      await GoogleAnalyticsConnection.upsert({
        websiteId,
        accessToken: tokens.access_token,
        ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
        tokenExpiresAt: expiresAt,
        isActive: true,
      });

      return tokens;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error.response?.data || error.message);
      throw new Error('Failed to connect to Google Analytics. Could not exchange code for tokens.');
    }
  }
  
  // fetchAnalyticsData a fost modificat pentru a include logica de cooldown
  async fetchAnalyticsData(websiteId, startDate = '30daysAgo', endDate = 'today') {
    try {
        const connection = await this.getConnection(websiteId);
        if (!connection) { // Verificare suplimentară
          console.warn(`[GA Service] Sincronizare sărită: Nicio conexiune GA pentru websiteId ${websiteId}`);
          return false;
        }

        // NOU: Logica de Cooldown
        if (connection.lastSyncAt) {
            const minutesSinceLastSync = (new Date() - new Date(connection.lastSyncAt)) / 1000 / 60;
            if (minutesSinceLastSync < SYNC_COOLDOWN_MINUTES) {
                console.log(`[GA Service] Sincronizare sărită pentru websiteId ${websiteId}. Ultima sincronizare a fost acum ${minutesSinceLastSync.toFixed(1)} minute. Cooldown este de ${SYNC_COOLDOWN_MINUTES} minute.`);
                return true; // Returnăm succes, dar nu facem nimic
            }
        }
        
        console.log(`[GA Service] Începere sincronizare date GA pentru websiteId ${websiteId}...`);

        const [mainMetrics, topPages, trafficSources, deviceBreakdown] = await Promise.all([
            this.fetchMainMetrics(connection.gaPropertyId, startDate, endDate),
            this.fetchTopPages(connection.gaPropertyId, startDate, endDate),
            this.fetchTrafficSources(connection.gaPropertyId, startDate, endDate),
            this.fetchDeviceBreakdown(connection.gaPropertyId, startDate, endDate)
        ]);
        
        if (mainMetrics && mainMetrics.rows) {
            for (const row of mainMetrics.rows) {
                const date = this.formatDate(row.dimensionValues[0].value);
                const metrics = row.metricValues;
                await GoogleAnalyticsData.upsert({
                    websiteId, date,
                    sessions: parseInt(metrics[0].value) || 0,
                    users: parseInt(metrics[1].value) || 0,
                    pageViews: parseInt(metrics[2].value) || 0,
                    bounceRate: parseFloat(metrics[3].value) * 100 || 0,
                    avgSessionDuration: parseInt(metrics[4].value) || 0,
                });
            }
        }
        
        const latestRecord = await GoogleAnalyticsData.findOne({ where: { websiteId }, order: [['date', 'DESC']] });

        if (latestRecord) {
            await latestRecord.update({
                topPages: topPages,
                trafficSources: trafficSources,
                deviceBreakdown: deviceBreakdown,
            });
        }
        
        await connection.update({ lastSyncAt: new Date() });
        console.log(`[GA Service] ✅ Sincronizare GA finalizată pentru websiteId ${websiteId}.`);
        return true;
    } catch (error) {
        console.error('Error fetching analytics data:', error.response?.data?.error || error.message);
        throw new Error(`Failed to fetch analytics data: ${error.message}`);
    }
  }

  // Restul funcțiilor din serviciu (getConnection, fetchMainMetrics, etc.) rămân neschimbate
  async getConnection(websiteId) {
    const connection = await GoogleAnalyticsConnection.findOne({
      where: { websiteId, isActive: true }
    });
    if (!connection || !connection.gaPropertyId) return null;
  
    if (new Date() >= new Date(connection.tokenExpiresAt)) {
      await this.refreshToken(connection);
      await connection.reload();
    }
  
    this.oauth2Client.setCredentials({
      access_token: connection.accessToken,
      refresh_token: connection.refreshToken
    });

    return connection;
  }
  
  async refreshToken(connection) {
    try {
      this.oauth2Client.setCredentials({ refresh_token: connection.refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      const expiresAt = new Date(credentials.expiry_date);
      await connection.update({ accessToken: credentials.access_token, tokenExpiresAt: expiresAt });
      return credentials.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      await connection.update({ isActive: false });
      throw new Error('Failed to refresh Google Analytics token. Please reconnect.');
    }
  }

  async getAccountProperties() {
    const analyticsAdmin = google.analyticsadmin({ version: 'v1beta', auth: this.oauth2Client });
    const { data } = await analyticsAdmin.accountSummaries.list();
    if (!data.accountSummaries) return [];
    return data.accountSummaries.flatMap(account => 
      (account.propertySummaries || []).map(prop => ({
        accountId: account.account.replace('accounts/', ''), accountName: account.displayName,
        propertyId: prop.property.replace('properties/', ''), propertyName: prop.displayName,
      }))
    );
  }

  async fetchMainMetrics(propertyId, startDate, endDate) {
      const { data } = await this.analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }],
          metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
          dimensions: [{ name: 'date' }], orderBys: [{ dimension: { dimensionName: 'date' } }]
        }
      });
      return data;
  }
  
  async fetchTopPages(propertyId, startDate, endDate) {
      const { data } = await this.analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }], metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }],
          dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 10
        }
      });
      return data.rows ? data.rows.map(row => ({
          path: row.dimensionValues[0].value, title: row.dimensionValues[1].value,
          pageViews: parseInt(row.metricValues[0].value), sessions: parseInt(row.metricValues[1].value)
      })) : [];
  }
  
  async fetchTrafficSources(propertyId, startDate, endDate) {
      const { data } = await this.analyticsData.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate, endDate }], metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
        }
      });
      return data.rows ? data.rows.map(row => ({
          source: row.dimensionValues[0].value,
          sessions: parseInt(row.metricValues[0].value), users: parseInt(row.metricValues[1].value)
      })) : [];
  }

  async fetchDeviceBreakdown(propertyId, startDate, endDate) {
    const { data } = await this.analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }], metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
        dimensions: [{ name: 'deviceCategory' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
      }
    });
    return data.rows ? data.rows.map(row => ({
      device: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value), users: parseInt(row.metricValues[1].value)
    })) : [];
  }
  
  formatDate(dateString) { return `${dateString.substring(0, 4)}-${dateString.substring(4, 6)}-${dateString.substring(6, 8)}`; }
}

module.exports = new GoogleAnalyticsService();