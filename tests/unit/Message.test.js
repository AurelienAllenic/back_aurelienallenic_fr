const getMessageModel = require("../../models/Message");
const { connectDB, getConnection } = require("../../config/db");

describe("Message model", () => {
  beforeAll(async () => {
    if (!getConnection() || getConnection().readyState !== 1) {
      await connectDB();
    }
  }, 15000);

  afterEach(async () => {
    const Message = await getMessageModel();
    await Message.deleteMany({});
  });

  it("crée un message avec email et message", async () => {
    const Message = await getMessageModel();
    const doc = await Message.create({
      email: "user@example.com",
      message: "Contenu du message",
    });
    expect(doc.email).toBe("user@example.com");
    expect(doc.message).toBe("Contenu du message");
    expect(doc.send).toBe(false);
    expect(doc.error).toBeNull();
  });

  it("accepte send et error", async () => {
    const Message = await getMessageModel();
    const doc = await Message.create({
      email: "a@b.com",
      message: "Texte",
      send: true,
      error: "Erreur envoi",
    });
    expect(doc.send).toBe(true);
    expect(doc.error).toBe("Erreur envoi");
  });

  it("find retourne les messages triés par createdAt décroissant", async () => {
    const Message = await getMessageModel();
    await Message.create({ email: "first@test.com", message: "Premier" });
    await Message.create({ email: "second@test.com", message: "Deuxième" });
    const list = await Message.find().sort({ createdAt: -1 });
    expect(list).toHaveLength(2);
    expect(list[0].message).toBe("Deuxième");
    expect(list[1].message).toBe("Premier");
  });
});