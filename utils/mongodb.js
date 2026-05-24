const { connectDB } = require('../config/db');

async function connectToDatabase() {
  return connectDB();
}

module.exports = { connectToDatabase };
