const { MongoMemoryServer } = require("mongodb-memory-server");
const path = require("path");

module.exports = async () => {
  // Utiliser les mocks Jest pour que la section "● Console" reste vide
  if (process.env.TEST_VERBOSE !== "1") {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "info").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  }

  if (global.__MONGO_INSTANCE__) return;

  process.env.NODE_ENV = "test";
  process.env.MESSAGE_ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || "test-encryption-key-32-chars-long!!";

  const mongoServer = await MongoMemoryServer.create();
  global.__MONGO_INSTANCE__ = mongoServer;
  process.env.MONGO_SECRET_KEY = mongoServer.getUri();

  const { connectDB } = require(path.join(__dirname, "..", "config", "db"));
  await connectDB();
};