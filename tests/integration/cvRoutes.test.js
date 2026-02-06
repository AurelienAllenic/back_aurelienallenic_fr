jest.mock("../../middlewares/multer", () => ({
    uploadCvFields: (req, res, next) => {
      req.files = {};
      next();
    },
    cloudinary: {},
  }));
  
  const request = require("supertest");
  const { createTestApp } = require("../helpers/testApp");
  const getUserModel = require("../../models/User");
  const getCvModel = require("../../models/Cv");
  const { connectDB, getConnection } = require("../../config/db");
  
  describe("CV routes", () => {
    beforeAll(async () => {
      if (!getConnection() || getConnection().readyState !== 1) {
        await connectDB();
      }
    }, 15000);
  
    afterEach(async () => {
        const Cv = await getCvModel();
        await Cv.deleteMany({});
        const User = await getUserModel();
        await User.deleteMany({
          email: { $in: ["admin@cv.test", "admin@del.test", "admin@del2.test"] },
        });
      });
  
    describe("GET /cv", () => {
      it("retourne 200 et data: null quand aucun CV", async () => {
        const res = await request(createTestApp()).get("/cv");
        expect(res.status).toBe(200);
        expect(res.body.data).toBeNull();
      });
  
      it("retourne 200 et le CV quand il existe", async () => {
        const Cv = await getCvModel();
        await Cv.create({
          imageWebpFr: "https://cdn.example/fr.webp",
          pdfFr: "https://cdn.example/fr.pdf",
        });
        const res = await request(createTestApp()).get("/cv");
        expect(res.status).toBe(200);
        expect(res.body.data).not.toBeNull();
        expect(res.body.data.imageWebpFr).toBe("https://cdn.example/fr.webp");
        expect(res.body.data.pdfFr).toBe("https://cdn.example/fr.pdf");
      });
    });
  
    describe("PUT /cv", () => {
      it("retourne 401 sans session", async () => {
        const res = await request(createTestApp()).put("/cv");
        expect(res.status).toBe(401);
      });
  
      it("retourne 200 et enregistre le CV avec session admin (sans fichiers)", async () => {
        const User = await getUserModel();
        await User.create({
          email: "admin@cv.test",
          password: "admin",
          authMethod: "email",
          role: "admin",
        });
        const agent = request.agent(createTestApp());
        await agent
          .post("/auth/login")
          .send({ email: "admin@cv.test", password: "admin" });
        const res = await agent.put("/cv");
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/enregistré/i);
        expect(res.body.data).toBeDefined();
      });
    });
  
    describe("DELETE /cv", () => {
      it("retourne 401 sans session", async () => {
        const res = await request(createTestApp()).delete("/cv");
        expect(res.status).toBe(401);
      });
  
      it("retourne 404 quand aucun CV", async () => {
        const User = await getUserModel();
        await User.create({
          email: "admin@del.test",
          password: "admin",
          authMethod: "email",
          role: "admin",
        });
        const agent = request.agent(createTestApp());
        await agent
          .post("/auth/login")
          .send({ email: "admin@del.test", password: "admin" });
        const res = await agent.delete("/cv");
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/aucun cv/i);
      });
  
      it("retourne 200 et supprime le CV quand il existe", async () => {
        const Cv = await getCvModel();
        await Cv.create({ pdfFr: "url-pdf" });
        const User = await getUserModel();
        await User.create({
          email: "admin@del2.test",
          password: "admin",
          authMethod: "email",
          role: "admin",
        });
        const agent = request.agent(createTestApp());
        await agent
          .post("/auth/login")
          .send({ email: "admin@del2.test", password: "admin" });
        const res = await agent.delete("/cv");
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/supprimé/i);
        const found = await Cv.findOne();
        expect(found).toBeNull();
      });
    });
  });