const Analytics = require('../models/Analytics');
const crypto = require('crypto');

exports.trackEvent = async (req, res) => {
  try {
    console.log('📊 Tracking event received:', req.body);
    
    const { type, path, label, metadata } = req.body;

    // Validation
    if (!type) {
      console.error('❌ Missing type');
      return res.status(400).json({ error: 'Type is required' });
    }

    const salt = process.env.ANALYTICS_SALT || "secret_portfo_123";
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    console.log('🔍 IP:', ip, 'User-Agent:', userAgent);
    
    const visitorId = crypto
      .createHash('sha256')
      .update(ip + userAgent + salt)
      .digest('hex')
      .substring(0, 16);

    console.log('🆔 Visitor ID generated:', visitorId);

    const newEvent = new Analytics({
      visitorId,
      type,
      path: path || '/',
      label: label || null,
      metadata: metadata || {}
    });

    console.log('💾 Saving event:', newEvent);

    await newEvent.save();
    
    console.log('✅ Event saved successfully');
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('❌ Analytics error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
};