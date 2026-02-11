const request = require("supertest");
const { createTestApp } = require("../helpers/testApp");
const getUserModel = require("../../models/User");
const { connectDB, getConnection } = require("../../config/db");

describe("Auth routes", () => {
  beforeAll(async () => {
    if (!getConnection() || getConnection().readyState !== 1) {
      await connectDB();
    }
  }, 15000);

  afterEach(async () => {
    const User = await getUserModel();
    await User.deleteMany({});
  });

  describe("POST /auth/login", () => {
    it("retourne 401 si email inconnu", async () => {
      const res = await request(createTestApp())
        .post("/auth/login")
        .send({ email: "inconnu@test.com", password: "any" });
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it("retourne 401 si mot de passe incorrect", async () => {
      const User = await getUserModel();
      await User.create({
        email: "user@test.com",
        password: "correct",
        authMethod: "email",
      });
      const res = await request(createTestApp())
        .post("/auth/login")
        .send({ email: "user@test.com", password: "wrong" });
      expect(res.status).toBe(401);
    });

    it("retourne 200 et user si credentials valides", async () => {
      const User = await getUserModel();
      await User.create({
        email: "valid@test.com",
        password: "validPass",
        authMethod: "email",
      });
      const res = await request(createTestApp())
        .post("/auth/login")
        .send({ email: "valid@test.com", password: "validPass" });
      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("valid@test.com");
      expect(res.body.message).toMatch(/réussie/i);
    });
  });

  describe("GET /auth/check", () => {
    it("retourne isAuthenticated: false sans session", async () => {
      const res = await request(createTestApp()).get("/auth/check");
      expect(res.status).toBe(200);
      expect(res.body.isAuthenticated).toBe(false);
    });
  });

  describe("POST /auth/logout", () => {
    it("retourne 200", async () => {
      const res = await request(createTestApp()).post("/auth/logout");
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/déconnexion/i);
    });
  });

  describe("POST /auth/create-user", () => {
    it("retourne 401 sans session", async () => {
      const res = await request(createTestApp())
        .post("/auth/create-user")
        .send({
          email: "new@test.com",
          password: "pass",
          authMethod: "email",
        });
      expect(res.status).toBe(401);
    });

    it("retourne 403 si session user non admin", async () => {
      const User = await getUserModel();
      await User.create({
        email: "noadmin@test.com",
        password: "pass",
        authMethod: "email",
        role: "user",
      });
      const agent = request.agent(createTestApp());
      await agent
        .post("/auth/login")
        .send({ email: "noadmin@test.com", password: "pass" });
      const res = await agent
        .post("/auth/create-user")
        .send({
          email: "other@test.com",
          password: "pass",
          authMethod: "email",
        });
      expect(res.status).toBe(403);
    });

    it("retourne 201 si admin crée un user", async () => {
      const User = await getUserModel();
      await User.create({
        email: "admin@test.com",
        password: "adminPass",
        authMethod: "email",
        role: "admin",
      });
      const agent = request.agent(createTestApp());
      await agent
        .post("/auth/login")
        .send({ email: "admin@test.com", password: "adminPass" });
      const res = await agent
        .post("/auth/create-user")
        .send({
          email: "newuser@test.com",
          password: "newpass",
          authMethod: "email",
        });
      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe("newuser@test.com");
      expect(res.body.message).toMatch(/créé/i);
    });
  });
});
