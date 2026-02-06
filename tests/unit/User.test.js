const getUserModel = require("../../models/User");
const { connectDB, getConnection } = require("../../config/db");

describe("User model", () => {
  beforeAll(async () => {
    if (!getConnection() || getConnection().readyState !== 1) {
      await connectDB();
    }
  }, 15000);

  afterEach(async () => {
    const User = await getUserModel();
    await User.deleteMany({});
  });

  it("hash le password au save", async () => {
    const User = await getUserModel();
    const user = new User({
      email: "test@example.com",
      password: "plain123",
      authMethod: "email",
    });
    await user.save();
    expect(user.password).not.toBe("plain123");
    expect(user.password).toMatch(/^\$2[aby]/);
  });

  it("comparePassword retourne true pour le bon mot de passe", async () => {
    const User = await getUserModel();
    const user = new User({
      email: "compare@example.com",
      password: "secret",
      authMethod: "email",
    });
    await user.save();
    const ok = await user.comparePassword("secret");
    expect(ok).toBe(true);
  });

  it("comparePassword retourne false pour un mauvais mot de passe", async () => {
    const User = await getUserModel();
    const user = new User({
      email: "wrong@example.com",
      password: "good",
      authMethod: "email",
    });
    await user.save();
    const ok = await user.comparePassword("bad");
    expect(ok).toBe(false);
  });

  it("exige un email", async () => {
    const User = await getUserModel();
    const user = new User({ password: "x", authMethod: "email" });
    await expect(user.save()).rejects.toThrow();
  });

  it("exige authMethod email ou google", async () => {
    const User = await getUserModel();
    const user = new User({
      email: "a@b.com",
      authMethod: "invalid",
    });
    await expect(user.save()).rejects.toThrow();
  });

  it("normalise l'email en lowercase", async () => {
    const User = await getUserModel();
    const user = new User({
      email: "UPPER@EXAMPLE.COM",
      password: "x",
      authMethod: "email",
    });
    await user.save();
    expect(user.email).toBe("upper@example.com");
  });
});