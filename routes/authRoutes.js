const express = require("express");
const router = express.Router();
const passport = require("passport");
const authController = require("../controllers/authController");
const { loginLimiter } = require("../middlewares/rateLimiter");

require("../config/passport");

router.post("/login", loginLimiter, authController.login);
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/login?error=oauth_failed`
      : "http://localhost:5173/login?error=oauth_failed",
    session: false,
  }),
  authController.googleCallback
);
router.post("/logout", authController.logout);
router.get("/check", authController.checkSession);
router.post(
  "/create-user",
  authController.requireAuth,
  authController.requireAdmin,
  authController.createUser
);

module.exports = router;
