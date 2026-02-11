/**
 * Tests POST /contact. Brevo is mocked: no email is actually sent.
 */
jest.mock("@getbrevo/brevo", () => {
    const mockSend = jest.fn().mockResolvedValue({ body: { messageId: "test-id" } });
    return {
      TransactionalEmailsApi: jest.fn().mockImplementation(() => ({
        setApiKey: jest.fn(),
        sendTransacEmail: mockSend,
      })),
      TransactionalEmailsApiApiKeys: { apiKey: "api-key" },
    };
  });
  
  const request = require("supertest");
  const { createTestApp } = require("../helpers/testApp");
  const getMessageModel = require("../../models/Message");
  const { connectDB, getConnection } = require("../../config/db");
  
  describe("Contact routes", () => {
    beforeAll(async () => {
      if (!getConnection() || getConnection().readyState !== 1) {
        await connectDB();
      }
    }, 15000);
  
    afterEach(async () => {
      const Message = await getMessageModel();
      await Message.deleteMany({});
    });
  
    describe("POST /contact", () => {
      it("retourne 400 si email absent", async () => {
        const res = await request(createTestApp())
          .post("/contact")
          .send({ message: "Mon message" });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatch(/email/i);
      });
  
      it("retourne 400 si message absent", async () => {
        const res = await request(createTestApp())
          .post("/contact")
          .send({ email: "user@example.com" });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatch(/message/i);
      });
  
      it("retourne 400 si format email invalide", async () => {
        const res = await request(createTestApp())
          .post("/contact")
          .send({ email: "pas-un-email", message: "Texte" });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatch(/invalide/i);
      });

      it("retourne 400 si reCAPTCHA configuré mais captchaToken absent", async () => {
        const orig = process.env.RECAPTCHA_SECRET_KEY;
        process.env.RECAPTCHA_SECRET_KEY = "test-secret";
        const res = await request(createTestApp())
          .post("/contact")
          .send({ email: "a@b.com", message: "Message" });
        process.env.RECAPTCHA_SECRET_KEY = orig;
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toMatch(/sécurité|requise|cookies/i);
      });

      it("retourne 200 et message de succès sans envoyer vraiment sur Brevo", async () => {
        const res = await request(createTestApp())
          .post("/contact")
          .send({
            email: "contact@test.com",
            message: "Message de test pour le formulaire",
          });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/envoyé avec succès/i);
      });
  
      it("après succès, enregistre le message en BDD (send: true) après un court délai", async () => {
        await request(createTestApp())
          .post("/contact")
          .send({
            email: "saved@test.com",
            message: "À sauvegarder",
          });
        await new Promise((r) => setTimeout(r, 800));
        const Message = await getMessageModel();
        const docs = await Message.find({}).lean();
        expect(docs.length).toBeGreaterThanOrEqual(1);
        const last = docs.find((d) => d.email && String(d.email).length > 0) || docs[0];
        expect(last.send).toBe(true);
      });
    });
  });
