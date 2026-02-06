const request = require("supertest");
const { createTestApp } = require("../helpers/testApp");
const getUserModel = require("../../models/User");
const Analytics = require("../../models/Analytics");
const AnalyticsDaily = require("../../models/AnalyticsDaily");
const AnalyticsMonthly = require("../../models/AnalyticsMonthly");
const AnalyticsYearly = require("../../models/AnalyticsYearly");
const { connectDB, getConnection } = require("../../config/db");
const { connectToDatabase } = require("../../utils/mongodb");

describe("Analytics routes", () => {
  const adminEmail = "admin@analytics.test";

  beforeAll(async () => {
    if (!getConnection() || getConnection().readyState !== 1) {
      await connectDB();
    }
    await connectToDatabase();
    process.env.CRON_SECRET = process.env.CRON_SECRET || "test-cron-secret";
  }, 15000);

  afterEach(async () => {
    await Analytics.deleteMany({});
    await AnalyticsDaily.deleteMany({});
    await AnalyticsMonthly.deleteMany({});
    await AnalyticsYearly.deleteMany({});
    const User = await getUserModel();
    await User.deleteMany({ email: adminEmail });
  });

  const loginAsAdmin = async () => {
    const User = await getUserModel();
    await User.create({
      email: adminEmail,
      password: "admin",
      authMethod: "email",
      role: "admin",
    });
    const agent = request.agent(createTestApp());
    await agent.post("/auth/login").send({ email: adminEmail, password: "admin" });
    return agent;
  };

  describe("POST /track", () => {
    it("retourne 400 si type absent", async () => {
      const res = await request(createTestApp()).post("/track").send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/type/i);
    });

    it("retourne 200 et enregistre un événement avec type uniquement", async () => {
      const res = await request(createTestApp())
        .post("/track")
        .send({ type: "PAGE_VIEW" });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      const count = await Analytics.countDocuments({ type: "PAGE_VIEW" });
      expect(count).toBe(1);
    });

    it("retourne 200 avec path, label, metadata", async () => {
      const res = await request(createTestApp())
        .post("/track")
        .send({
          type: "CLICK",
          path: "/cv",
          label: "nav_linkedin",
          metadata: { section: "header" },
        });
      expect(res.status).toBe(200);
      const doc = await Analytics.findOne({ type: "CLICK" }).lean();
      expect(doc).not.toBeNull();
      expect(doc.path).toBe("/cv");
      expect(doc.label).toBe("nav_linkedin");
      expect(doc.metadata).toEqual({ section: "header" });
    });
  });

  describe("POST /analytics/aggregate", () => {
    it("retourne 401 sans authentification", async () => {
      const res = await request(createTestApp()).post("/analytics/aggregate");
      expect(res.status).toBe(401);
    });

    it("retourne 200 avec auth même sans données", async () => {
      const agent = await loginAsAdmin();
      const res = await agent.post("/analytics/aggregate");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result).toBeDefined();
    });

    it("retourne 200 et agrège les événements après track", async () => {
      await request(createTestApp()).post("/track").send({ type: "PAGE_VIEW" });
      const agent = await loginAsAdmin();
      const res = await agent.post("/analytics/aggregate");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result.eventsProcessed).toBe(1);
      const dailyCount = await AnalyticsDaily.countDocuments({});
      expect(dailyCount).toBeGreaterThanOrEqual(1);
      const remaining = await Analytics.countDocuments({});
      expect(remaining).toBe(0);
    });
  });

  describe("GET /analytics/daily", () => {
    it("retourne 401 sans authentification", async () => {
      const res = await request(createTestApp()).get("/analytics/daily");
      expect(res.status).toBe(401);
    });

    it("retourne 200 et un tableau", async () => {
      const agent = await loginAsAdmin();
      const res = await agent.get("/analytics/daily");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("accepte startDate et endDate en query", async () => {
      const agent = await loginAsAdmin();
      const res = await agent.get(
        "/analytics/daily?startDate=2026-01-01&endDate=2026-01-31"
      );
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /analytics/monthly", () => {
    it("retourne 401 sans authentification", async () => {
      const res = await request(createTestApp()).get("/analytics/monthly");
      expect(res.status).toBe(401);
    });

    it("retourne 400 si year absent", async () => {
      const agent = await loginAsAdmin();
      const res = await agent.get("/analytics/monthly");
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/year/i);
    });

    it("retourne 200 avec year", async () => {
      const agent = await loginAsAdmin();
      const res = await agent.get("/analytics/monthly?year=2026");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("retourne 200 avec year et month", async () => {
      const agent = await loginAsAdmin();
      const res = await agent.get("/analytics/monthly?year=2026&month=1");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /analytics/yearly", () => {
    it("retourne 401 sans authentification", async () => {
      const res = await request(createTestApp()).get("/analytics/yearly");
      expect(res.status).toBe(401);
    });

    it("retourne 200 et un tableau", async () => {
      const agent = await loginAsAdmin();
      const res = await agent.get("/analytics/yearly");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it("retourne 200 avec year en query", async () => {
      const agent = await loginAsAdmin();
      const res = await agent.get("/analytics/yearly?year=2025");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /analytics/cron-aggregate", () => {
    it("retourne 500 si CRON_SECRET non configuré", async () => {
      const orig = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;
      const res = await request(createTestApp()).get(
        "/analytics/cron-aggregate?secret=any"
      );
      expect(res.status).toBe(500);
      process.env.CRON_SECRET = orig;
    });

    it("retourne 401 si secret invalide", async () => {
      const res = await request(createTestApp()).get(
        "/analytics/cron-aggregate?secret=wrong"
      );
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/unauthorized/i);
    });

    it("retourne 200 avec secret valide", async () => {
      const res = await request(createTestApp()).get(
        "/analytics/cron-aggregate?secret=test-cron-secret"
      );
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result).toBeDefined();
    });
  });

  describe("GET /analytics/cron-aggregate-monthly", () => {
    it("retourne 401 si secret invalide", async () => {
      const res = await request(createTestApp()).get(
        "/analytics/cron-aggregate-monthly?secret=wrong"
      );
      expect(res.status).toBe(401);
    });

    it("retourne 200 avec secret valide", async () => {
      const res = await request(createTestApp()).get(
        "/analytics/cron-aggregate-monthly?secret=test-cron-secret"
      );
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.scope).toBe("monthly");
      expect(res.body.result).toBeDefined();
    });
  });

  describe("GET /analytics/cron-aggregate-yearly", () => {
    it("retourne 401 si secret invalide", async () => {
      const res = await request(createTestApp()).get(
        "/analytics/cron-aggregate-yearly?secret=wrong"
      );
      expect(res.status).toBe(401);
    });

    it("retourne 200 avec secret valide", async () => {
      const res = await request(createTestApp()).get(
        "/analytics/cron-aggregate-yearly?secret=test-cron-secret"
      );
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.scope).toBe("yearly");
      expect(res.body.result).toBeDefined();
    });
  });
});