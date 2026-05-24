const { connectDB } = require('../config/db');

async function getModelConnection() {
  const connection = await connectDB();

  if (!connection) {
    throw new Error('Connexion MongoDB non disponible');
  }

  if (connection.readyState !== 1) {
    await connection.asPromise();
  }

  if (connection.readyState !== 1) {
    throw new Error('Connexion MongoDB non disponible');
  }

  return connection;
}

module.exports = { getModelConnection };
