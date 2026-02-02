const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Trop de tentatives de connexion. Veuillez réessayer plus tard.',
  statusCode: 429,
  validate: false,
});

module.exports = { loginLimiter };
