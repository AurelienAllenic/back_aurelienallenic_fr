const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;


const getCallbackURL = () => {
  if (process.env.GOOGLE_CALLBACK_URL) {
    return process.env.GOOGLE_CALLBACK_URL;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const backendUrl = isProduction 
    ? (process.env.BACKEND_URL || "https://back-aurelienallenic-fr.vercel.app")
    : `http://localhost:${process.env.PORT || 3000}`;
  
  const callbackURL = `${backendUrl}/auth/google/callback`;
  return callbackURL;
};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: getCallbackURL(),
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          return done(null, profile);
        } catch (error) {
          console.error("Erreur stratégie Google :", error);
          return done(error, null);
        }
      }
    )
  );
} else {
  console.warn("Google OAuth non configuré : GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET manquant.");
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;
