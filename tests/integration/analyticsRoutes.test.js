const request = require("supertest");
const { createTestApp } = require("../helpers/testApp");
const getUserModel = require("../../models/User");
const Analytics = require("../../models/Analytics");
const AnalyticsDaily = require("../../models/AnalyticsDaily");
const AnalyticsMonthly = require("../../models/AnalyticsMonthly");
const AnalyticsYearly = require("../../models/AnalyticsYearly");
const { connectDB, getConnection } = require("../../config/db");
const { connectToDatabase } = require("../../utils/mongodb");


const adminEmail = "admin@analytics.test";

const loginAsAdmin = async () => {
  const User = await getUserModel();
  await User.deleteOne({ email: adminEmail });
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

describe("Analytics routes", () => {
  beforeAll(async () => {
    if (!getConnection() || getConnection().readyState !== 1) await connectDB();
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

 describe("GET /analytics/monthly avec nested dailyStats", () => {
    it("renvoie dailyStats imbriqués quand il y a des données (mois précédent)", async () => {
      const agent = await loginAsAdmin();

      await request(createTestApp()).post("/track").send({ type: "PAGE_VIEW" });
      await request(createTestApp()).post("/track").send({ type: "CLICK", label: "test" });
      await agent.post("/analytics/aggregate"); // daily

      const dailyDoc = await AnalyticsDaily.findOne({ date: { $regex: "^2026-02-" } });
      if (dailyDoc) {
        dailyDoc.date = "2026-01-15";
        await dailyDoc.save();
      }

      const cronRes = await agent.get(
        "/analytics/cron-aggregate-monthly?secret=test-cron-secret&year=2026&month=1"
      );
      expect(cronRes.status).toBe(200);

      const monthlyRes = await agent.get("/analytics/monthly?year=2026");
      expect(monthlyRes.status).toBe(200);

      const month = monthlyRes.body.find(m => m.year === 2026 && m.month === 1);
      expect(month).toBeDefined();
      expect(Array.isArray(month.dailyStats)).toBe(true);
      expect(month.dailyStats.length).toBeGreaterThan(0);

      const sumViews = month.dailyStats.reduce((s, d) => s + (d.pageViews || 0), 0);
      expect(month.pageViews).toBe(sumViews);
    });

    it("supprime AnalyticsDaily après agrégation mensuelle", async () => {
      const agent = await loginAsAdmin();

      await request(createTestApp()).post("/track").send({ type: "PAGE_VIEW" });
      await agent.post("/analytics/aggregate");

      const before = await AnalyticsDaily.countDocuments({ date: { $regex: "^2026-02-" } });
      expect(before).toBeGreaterThan(0);

      await agent.get(
        "/analytics/cron-aggregate-monthly?secret=test-cron-secret&year=2026&month=2"
      );

      const after = await AnalyticsDaily.countDocuments({ date: { $regex: "^2026-02-" } });
      expect(after).toBe(0);
    });
  });
});
