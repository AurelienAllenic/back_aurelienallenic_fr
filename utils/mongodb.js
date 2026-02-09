// utils/mongodb.js
const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  // Si on a déjà une connexion active → on la retourne directement
  if (cached.conn && mongoose.connection.readyState === 1) {
    console.log('♻️ Using cached active MongoDB connection');
    return cached.conn;
  }

  // Si une connexion est en cours → on attend qu'elle finisse
  if (cached.promise) {
    console.log('⏳ Waiting for ongoing MongoDB connection...');
    return cached.promise;
  }

  try {
    console.log('🔌 Connecting to MongoDB...');

    const uri = process.env.MONGO_SECRET_KEY || process.env.MONGODB_URI;

    if (!uri) {
      throw new Error('MONGO_SECRET_KEY or MONGODB_URI environment variable is missing');
    }

    const opts = {
      bufferCommands: false,               // on garde false → fail-fast (bon pour debug)
      maxPoolSize: 5,                      // limite les connexions simultanées
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,                           // force IPv4 (parfois aide sur Vercel)
      // heartbeatFrequencyMS: 10000,      // optionnel : surveille plus souvent
    };

    // On lance la promesse de connexion
    cached.promise = mongoose
      .connect(uri, opts)
      .then((mongooseInstance) => {
        console.log('✅ MongoDB connected successfully');
        cached.conn = mongooseInstance;
        return mongooseInstance;
      })
      .catch((err) => {
        console.error('❌ MongoDB connection failed:', err);
        cached.promise = null; // reset pour permettre un retry
        cached.conn = null;
        throw err;
      });

    cached.conn = await cached.promise;
    return cached.conn;

  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    console.error('❌ MongoDB connection error:', error.message);
    throw error;
  }
}

// Optionnel : hook pour détection de déconnexion (utile en serverless)
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected → resetting cache');
  cached.conn = null;
  cached.promise = null;
});

module.exports = { connectToDatabase };