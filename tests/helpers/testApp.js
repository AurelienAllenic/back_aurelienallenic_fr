const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const authRoutes = require("../../routes/authRoutes");
const appRoutes = require("../../routes/routes");

require("../../config/passport");

function createTestApp() {
  const app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "test_secret",
      resave: true,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_SECRET_KEY,
        collectionName: "sessions_test",
      }),
      cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 },
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  app.use("/auth", authRoutes);
  app.use("/", appRoutes);
  return app;
}

module.exports = { createTestApp };
