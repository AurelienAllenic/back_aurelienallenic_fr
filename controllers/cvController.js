const getCvModel = require("../models/Cv");
const { connectDB } = require("../config/db");

const pickUrl = (f) => (f && f[0] && (f[0].path || f[0].secure_url)) || "";

exports.getCv = async (req, res) => {
  try {
    await connectDB();
    const Cv = await getCvModel();
    const cv = await Cv.findOne().lean();
    if (!cv) {
      return res.status(200).json({ data: null });
    }
    res.status(200).json({ data: cv });
  } catch (error) {
    console.error("Erreur getCv :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.upsertCv = async (req, res) => {
  try {
    await connectDB();
    const Cv = await getCvModel();
    const files = req.files || {};

    const existing = await Cv.findOne().lean();

    const payload = {
      imageWebpFr: pickUrl(files.imageWebpFr) || existing?.imageWebpFr || "",
      imageWebpEn: pickUrl(files.imageWebpEn) || existing?.imageWebpEn || "",
      pdfFr: pickUrl(files.pdfFr) || existing?.pdfFr || "",
      pdfEn: pickUrl(files.pdfEn) || existing?.pdfEn || "",
    };

    const cv = await Cv.findOneAndUpdate(
      {},
      { $set: payload },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ message: "CV enregistré.", data: cv });
  } catch (error) {
    console.error("Erreur upsertCv :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.deleteCv = async (req, res) => {
  try {
    await connectDB();
    const Cv = await getCvModel();
    const cv = await Cv.findOneAndDelete({});
    if (!cv) {
      return res.status(404).json({ message: "Aucun CV trouvé." });
    }
    res.status(200).json({ message: "CV supprimé." });
  } catch (error) {
    console.error("Erreur deleteCv :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
