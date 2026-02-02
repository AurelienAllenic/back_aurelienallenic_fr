const mongoose = require("mongoose");
const { getConnection, connectDB } = require("../config/db");

const CvSchema = new mongoose.Schema(
  {
    imageWebpFr: { type: String, default: "" },
    imageWebpEn: { type: String, default: "" },
    pdfFr: { type: String, default: "" },
    pdfEn: { type: String, default: "" },
  },
  { timestamps: true }
);

const getCvModel = async () => {
  let connection = getConnection();

  if (!connection || connection.readyState !== 1) {
    connection = await connectDB();

    if (connection && connection.readyState === 2) {
      await new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 60;
        const checkConnection = setInterval(() => {
          attempts++;
          const state = connection.readyState;
          if (state === 1 || state === 0 || attempts >= maxAttempts) {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
      });
    }
  }

  if (!connection || connection.readyState !== 1) {
    throw new Error("Connexion MongoDB non disponible");
  }

  if (connection.models.Cv) {
    return connection.models.Cv;
  }

  return connection.model("Cv", CvSchema);
};

module.exports = getCvModel;