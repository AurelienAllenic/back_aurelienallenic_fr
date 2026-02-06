const { MongoMemoryServer } = require("mongodb-memory-server");
const path = require("path");

module.exports = async () => {
  if (global.__MONGO_INSTANCE__) return;

  process.env.NODE_ENV = "test";
  const mongoServer = await MongoMemoryServer.create();
  global.__MONGO_INSTANCE__ = mongoServer;
  process.env.MONGO_SECRET_KEY = mongoServer.getUri();

  const { connectDB } = require(path.join(__dirname, "..", "config", "db"));
  await connectDB();
};