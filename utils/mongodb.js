// controllers/analyticsController.js
const Analytics = require('../models/Analytics');
const crypto = require('crypto');
const connectToDatabase = require('../utils/mongodb');

exports.trackEvent = async (req, res) => {
  try {
    // Utilise la connexion cachée de utils/mongodb.js
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