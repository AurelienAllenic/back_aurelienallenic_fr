const { getConnection, connectDB } = require("../config/db");
const mongoose = require("mongoose");

const messageSchemaDefinition = {
  email: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  send: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: null,
  },
};

const getMessageModel = async () => {
  let connection = getConnection();

  if (!connection || connection.readyState !== 1) {
    console.log("🔄 [Message] Connexion non prête, tentative de connexion...");
    connection = await connectDB();

    if (connection && connection.readyState === 2) {
      console.log("🔄 [Message] Connexion en cours, attente jusqu'à 6 secondes...");
      await new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 60;

        const checkConnection = setInterval(() => {
          attempts++;
          const state = connection.readyState;

          if (state === 1) {
            console.log("✅ [Message] Connexion établie après attente");
            clearInterval(checkConnection);
            resolve();
          } else if (state === 0 || attempts >= maxAttempts) {
            console.log(
              `⚠️ [Message] Connexion non établie (état: ${state}, tentatives: ${attempts})`
            );
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
      });
    }
  }

  if (connection && connection.readyState === 1) {
    if (connection.models.Message) {
      console.log("📦 [Message] Utilisation du modèle existant");
      return connection.models.Message;
    }
    const schema = new mongoose.Schema(messageSchemaDefinition, {
      timestamps: true,
    });
    console.log("📦 [Message] Création du modèle");
    return connection.model("Message", schema);
  }

  if (connection) {
    console.warn(
      "⚠️ [Message] Connexion existe mais n'est pas prête (readyState:",
      connection.readyState,
      ")"
    );
    console.warn("⚠️ [Message] État de la connexion:", {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    }[connection.readyState] || "unknown");
  } else {
    console.warn("⚠️ [Message] Connexion non disponible après tentative");
  }

  console.error("❌ [Message] Impossible de créer le message : connexion non disponible");
  return null;
};

module.exports = getMessageModel;