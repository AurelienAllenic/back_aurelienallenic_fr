const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// Construction de l'URL de callback complète pour Google OAuth
const getCallbackURL = () => {
  // Si une URL complète est fournie, l'utiliser
  if (process.env.GOOGLE_CALLBACK_URL) {
    console.log('🔵 [Passport Aurelien] Callback URL depuis env:', process.env.GOOGLE_CALLBACK_URL);
    return process.env.GOOGLE_CALLBACK_URL;
  }
  
  // Sinon, construire l'URL selon l'environnement
  const isProduction = process.env.NODE_ENV === "production";
  const backendUrl = isProduction 
    ? (process.env.BACKEND_URL || "https://back-aurelienallenic-fr.vercel.app")
    : `http://localhost:${process.env.PORT || 3000}`;
  
  const callbackURL = `${backendUrl}/auth/google/callback`;
  console.log('🔵 [Passport Aurelien] Callback URL construite:', callbackURL);
  console.log('🔵 [Passport Aurelien] NODE_ENV:', process.env.NODE_ENV);
  console.log('🔵 [Passport Aurelien] BACKEND_URL:', process.env.BACKEND_URL);
  
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

// Serialization pour Aurelien (on stocke le profil complet)
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;
