const getCvModel = require("../../models/Cv");
const { connectDB, getConnection } = require("../../config/db");

describe("Cv model", () => {
  beforeAll(async () => {
    if (!getConnection() || getConnection().readyState !== 1) {
      await connectDB();
    }
  }, 15000);

  afterEach(async () => {
    const Cv = await getCvModel();
    await Cv.deleteMany({});
  });

  it("crée un document CV avec des champs par défaut", async () => {
    const Cv = await getCvModel();
    const cv = await Cv.create({
      imageWebpFr: "https://example.com/fr.webp",
      pdfFr: "https://example.com/fr.pdf",
    });
    expect(cv.imageWebpFr).toBe("https://example.com/fr.webp");
    expect(cv.pdfFr).toBe("https://example.com/fr.pdf");
    expect(cv.imageWebpEn).toBe("");
    expect(cv.pdfEn).toBe("");
  });

  it("findOne retourne le CV existant", async () => {
    const Cv = await getCvModel();
    await Cv.create({
      imageWebpFr: "url-fr",
      imageWebpEn: "url-en",
      pdfFr: "pdf-fr",
      pdfEn: "pdf-en",
    });
    const found = await Cv.findOne().lean();
    expect(found).not.toBeNull();
    expect(found.imageWebpFr).toBe("url-fr");
    expect(found.pdfEn).toBe("pdf-en");
  });
});