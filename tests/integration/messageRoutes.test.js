const request = require("supertest");
const { createTestApp } = require("../helpers/testApp");
const getUserModel = require("../../models/User");
const getMessageModel = require("../../models/Message");
const { connectDB, getConnection } = require("../../config/db");

describe("Message routes", () => {
  beforeAll(async () => {
    if (!getConnection() || getConnection().readyState !== 1) {
      await connectDB();
    }
  }, 15000);

  afterEach(async () => {
    const Message = await getMessageModel();
    await Message.deleteMany({});
    const User = await getUserModel();
    await User.deleteMany({
      email: { $in: ["admin@messages.test"] },
    });
  });

  const loginAsAdmin = async () => {
    const User = await getUserModel();
    await User.create({
      email: "admin@messages.test",
      password: "admin",
      authMethod: "email",
      role: "admin",
    });
    const agent = request.agent(createTestApp());
    await agent
      .post("/auth/login")
      .send({ email: "admin@messages.test", password: "admin" });
    return agent;
  };

  describe("GET /messages", () => {
    it("retourne 401 sans authentification", async () => {
      const res = await request(createTestApp()).get("/messages");
      expect(res.status).toBe(401);
    });

    it("retourne 200 et une liste vide quand aucun message", async () => {
      const agent = await loginAsAdmin();
      const res = await agent.get("/messages");
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/liste des messages/i);
      expect(res.body.data).toEqual([]);
    });

    it("retourne 200 et la liste des messages déchiffrés", async () => {
      const Message = await getMessageModel();
      await Message.create({
        email: "contact@test.com",
        message: "Mon message de test",
      });
      const agent = await loginAsAdmin();
      const res = await agent.get("/messages");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].email).toBe("contact@test.com");
      expect(res.body.data[0].message).toBe("Mon message de test");
    });
  });

  describe("GET /messages/:id", () => {
    it("retourne 401 sans authentification", async () => {
      const Message = await getMessageModel();
      const doc = await Message.create({
        email: "a@b.com",
        message: "Contenu",
      });
      const res = await request(createTestApp()).get(`/messages/${doc._id}`);
      expect(res.status).toBe(401);
    });

    it("retourne 400 pour un ID invalide", async () => {
      const agent = await loginAsAdmin();
      const res = await agent.get("/messages/invalid-id");
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalide/i);
    });

    it("retourne 404 quand le message n'existe pas", async () => {
      const agent = await loginAsAdmin();
      const { ObjectId } = require("mongoose").Types;
      const id = new ObjectId();
      const res = await agent.get(`/messages/${id}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/non trouvé/i);
    });

    it("retourne 200 et le message quand il existe", async () => {
      const Message = await getMessageModel();
      const doc = await Message.create({
        email: "one@test.com",
        message: "Un seul message",
      });
      const agent = await loginAsAdmin();
      const res = await agent.get(`/messages/${doc._id}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/trouvé/i);
      expect(res.body.data.email).toBe("one@test.com");
      expect(res.body.data.message).toBe("Un seul message");
    });
  });

  describe("DELETE /messages/:id", () => {
    it("retourne 401 sans authentification", async () => {
      const Message = await getMessageModel();
      const doc = await Message.create({
        email: "x@y.com",
        message: "À supprimer",
      });
      const res = await request(createTestApp()).delete(`/messages/${doc._id}`);
      expect(res.status).toBe(401);
    });

    it("retourne 400 pour un ID invalide", async () => {
      const agent = await loginAsAdmin();
      const res = await agent.delete("/messages/not-an-id");
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalide/i);
    });

    it("retourne 404 quand le message n'existe pas", async () => {
      const agent = await loginAsAdmin();
      const { ObjectId } = require("mongoose").Types;
      const id = new ObjectId();
      const res = await agent.delete(`/messages/${id}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/non trouvé/i);
    });

    it("retourne 200 et supprime le message quand il existe", async () => {
      const Message = await getMessageModel();
      const doc = await Message.create({
        email: "del@test.com",
        message: "À effacer",
      });
      const agent = await loginAsAdmin();
      const res = await agent.delete(`/messages/${doc._id}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/supprimé/i);
      const found = await Message.findById(doc._id);
      expect(found).toBeNull();
    });
  });
});