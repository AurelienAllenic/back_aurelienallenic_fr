const Analytics = require('../models/Analytics');
const crypto = require('crypto');
const { connectToDatabase } = require('../utils/mongodb');
const { aggregateDailyStats } = require('../utils/aggregateAnalytics');
const AnalyticsDaily = require('../models/AnalyticsDaily');

exports.trackEvent = async (req, res) => {
  try {
    await connectToDatabase();
    
    console.log('📊 Tracking event received:', req.body);
    
    const { type, path, label, metadata } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Type is required' });
    }

    const salt = process.env.ANALYTICS_SALT || "secret_portfo_123";
    const ip = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.socket.remoteAddress || 
               'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    const visitorId = crypto
      .createHash('sha256')
      .update(ip + userAgent + salt)
      .digest('hex')
      .substring(0, 16);

    const newEvent = new Analytics({
      visitorId,
      type,
      path: path || '/',
      label: label || null,
      metadata: metadata || {}
    });

    await newEvent.save();
    
    console.log('✅ Event saved successfully');
    res.status(200).json({ status: 'ok' });
    
  } catch (error) {
    console.error('❌ Analytics error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    await connectToDatabase();
    
    const { type, limit = 100 } = req.query;
    const filter = type ? { type } : {};
    
    const events = await Analytics
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const stats = await Analytics.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          uniqueVisitors: { $addToSet: '$visitorId' }
        }
      },
      {
        $project: {
          type: '$_id',
          count: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' }
        }
      }
    ]);

    const topClicks = await Analytics.aggregate([
      { $match: { type: 'CLICK' } },
      {
        $group: {
          _id: '$label',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({ events, stats, topClicks });
    
  } catch (error) {
    console.error('❌ Get analytics error:', error.message);
    res.status(500).json({ error: error.message });
  }
};


exports.aggregateDaily = async (req, res) => {
  try {
    const { date } = req.body; // Format: "2026-02-03" (optionnel)
    
    const targetDate = date ? new Date(date) : null;
    const result = await aggregateDailyStats(targetDate);
    
    res.json({ 
      success: true, 
      result 
    });
  } catch (error) {
    console.error('❌ Aggregate error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getDailyStats = async (req, res) => {
  try {
    await connectToDatabase();
    
    const { startDate, endDate, limit = 30 } = req.query;
    
    const filter = {};
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }
    
    const stats = await AnalyticsDaily
      .find(filter)
      .sort({ date: -1 })
      .limit(parseInt(limit));
    
    res.json(stats);
  } catch (error) {
    console.error('❌ Get daily stats error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.cronAggregateDaily = async (req, res) => {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('❌ CRON_SECRET not configured');
      return res.status(500).json({ error: 'Cron not configured' });
    }

    // Le secret est passé en query param par Vercel
    if (req.query.secret !== cronSecret) {
      console.error('❌ Invalid cron secret');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('✅ Cron triggered successfully at', new Date().toISOString());

    await connectToDatabase();

    const targetDate = req.query.date || null;
    const result = await aggregateDailyStats(targetDate);

    console.log('✅ Aggregation result:', result);

    res.status(200).json({
      success: true,
      result,
      message: 'Cron aggregation completed'
    });
  } catch (error) {
    console.error('❌ Cron aggregate error:', error);
    res.status(500).json({ 
      error: 'Aggregation failed', 
      details: error.message 
    });
  }
};
