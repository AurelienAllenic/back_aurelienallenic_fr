const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
require("dotenv").config();

const { connectDB } = require("./config/db");
const corsConfig = require("./config/corsConfig");
const limiter = require("./config/rateLimiter");

const authRoutes = require("./routes/authRoutes");
const appRoutes = require("./routes/routes");

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

app.set("trust proxy", 1);
app.use(corsConfig);
app.use(bodyParser.json({ limit: "15mb" }));
app.use(bodyParser.urlencoded({ limit: "15mb", extended: true }));
app.use((req, res, next) => {
  if (req.method === "OPTIONS") return next();
  return limiter(req, res, next);
});

app.use(
  session({
    name: "session.sid",
    secret: process.env.SESSION_SECRET || "secret_key",
    resave: true,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_SECRET_KEY,
      collectionName: "sessions",
    }),
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24,
      path: "/",
    },
  })
);

require("./config/passport");
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  res.status(200).json("Backend");
});

app.use("/auth", authRoutes);
app.use("/", appRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

module.exports = app;
