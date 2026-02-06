/**
 * Ferme les connexions MongoDB et arrête le Memory Server pour que Jest puisse quitter proprement.
 */
module.exports = async () => {
  try {
    const mongoose = require("mongoose");
    const path = require("path");
    const { getConnection } = require(path.join(__dirname, "..", "config", "db"));

    const conn = getConnection();
    if (conn && conn.readyState !== 0) {
      await conn.close();
    }

    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  } catch (_) {
    // Ignorer si déjà fermé ou module non chargé
  }

  try {
    if (global.__MONGO_INSTANCE__) {
      await global.__MONGO_INSTANCE__.stop();
    }
  } catch (_) {
    // Ignorer si déjà arrêté
  }
};
