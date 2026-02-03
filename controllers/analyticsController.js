const Analytics = require('../models/Analytics');
const crypto = require('crypto');

exports.trackEvent = async (req, res) => {
  try {
    const { type, path, label, metadata } = req.body;

    // --- ANONYMISATION ---
    // On crée un hash unique basé sur l'IP + le User-Agent + le sel
    // On ne stocke JAMAIS l'IP brute.
    const salt = process.env.ANALYTICS_SALT || "secret_portfo_123";
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    const visitorId = crypto
      .createHash('sha256')
      .update(ip + userAgent + salt)
      .digest('hex')
      .substring(0, 16); // On garde 16 caractères pour l'anonymat

    const newEvent = new Analytics({
      visitorId,
      type,
      path,
      label,
      metadata
    });

    await newEvent.save();
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};