const getUserModel = require("../models/User");
const { connectDB } = require("../config/db");
const bcrypt = require("bcryptjs");

// --- CONNEXION EMAIL/PASSWORD ---
exports.login = async (req, res) => {
  const { email, password } = req.body;

  console.log("🔐 [Login] Tentative de connexion:", {
    email: email,
    emailNormalized: email?.toLowerCase().trim(),
    hasPassword: !!password,
  });

  try {
    await connectDB();
    const User = await getUserModel();

    const emailNormalized = email.toLowerCase().trim();
    const user = await User.findOne({
      email: emailNormalized,
    });

    console.log("🔍 [Login] Recherche utilisateur:", {
      emailRecherche: emailNormalized,
      userTrouve: !!user,
      userId: user?._id,
      userEmail: user?.email,
      userAuthMethod: user?.authMethod,
      hasPassword: !!user?.password,
    });

    if (!user) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    if (!user.password) {
      console.log("❌ [Login] User trouvé mais pas de password");
      return res.status(401).json({ error: "Ce compte utilise la connexion Google." });
    }

    if (user.authMethod === "google" && user.password) {
      console.log("🔄 [Login] Mise à jour authMethod de \"google\" à \"email\"");
      user.authMethod = "email";
      await user.save();
    }

    const passwordTrimmed = password.trim();
    const valid = await bcrypt.compare(passwordTrimmed, user.password);
    console.log("🔐 [Login] Vérification mot de passe:", {
      valid: valid,
      passwordLength: passwordTrimmed.length,
    });

    if (!valid) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    req.session.userId = user._id;
    req.session.userEmail = user.email;
    req.session.userName = user.name || user.email;
    req.session.userPicture = user.picture;

    console.log("🔐 [Login] Session créée:", {
      userId: req.session.userId,
      email: req.session.userEmail,
      sessionID: req.sessionID,
    });

    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("❌ Erreur lors de la sauvegarde de la session :", err);
          return reject(err);
        }
        console.log("✅ [Login] Session sauvegardée");
        resolve();
      });
    });

    const setCookieHeader = res.getHeader("Set-Cookie");
    console.log("🍪 [Login] Set-Cookie header:", setCookieHeader || "AUCUN");

    res.status(200).json({
      message: "Connexion réussie.",
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la connexion :", error);
    res.status(500).json({ message: "Erreur serveur lors de la connexion." });
  }
};

// --- CALLBACK OAUTH GOOGLE ---
exports.googleCallback = async (req, res) => {
  try {
    console.log("🔵 [Google OAuth] Callback reçu");
    const profile = req.user;

    console.log("🔵 [Google OAuth] Profile:", {
      hasProfile: !!profile,
      hasEmails: !!profile?.emails,
      email: profile?.emails?.[0]?.value,
      googleId: profile?.id,
    });

    if (!profile || !profile.emails || !profile.emails[0]) {
      console.log("❌ [Google OAuth] Pas d'email dans le profile");
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5173"}/login?error=no_email`
      );
    }

    await connectDB();
    const User = await getUserModel();

    const email = profile.emails[0].value.toLowerCase().trim();
    const googleId = profile.id;
    const name = profile.displayName || profile.name?.givenName || email;
    const picture =
      profile.photos && profile.photos[0] ? profile.photos[0].value : null;

    console.log("🔵 [Google OAuth] Recherche utilisateur:", {
      email: email,
      googleId: googleId,
    });

    let user = await User.findOne({
      $or: [{ email: email }, { googleId: googleId }],
    });

    console.log("🔵 [Google OAuth] Résultat recherche:", {
      userTrouve: !!user,
      userId: user?._id,
      userEmail: user?.email,
      userGoogleId: user?.googleId,
      userAuthMethod: user?.authMethod,
    });

    if (!user) {
      console.log(
        `❌ [Google OAuth] Tentative de connexion Google avec un compte inexistant: ${email}`
      );
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}/login?error=account_not_found`);
    }

    let updated = false;
    if (!user.googleId && googleId) {
      user.googleId = googleId;
      updated = true;
    }
    if (!user.password && user.authMethod !== "google") {
      user.authMethod = "google";
      updated = true;
    }
    if (!user.name && name) {
      user.name = name;
      updated = true;
    }
    if (!user.picture && picture) {
      user.picture = picture;
      updated = true;
    }

    if (updated) {
      console.log("🔄 [Google OAuth] Mise à jour utilisateur");
      await user.save();
    }

    req.session.userId = user._id;
    req.session.userEmail = user.email;
    req.session.userName = user.name || user.email;
    req.session.userPicture = user.picture;

    console.log("🔐 [Google OAuth] Session créée:", {
      userId: req.session.userId,
      email: req.session.userEmail,
      sessionID: req.sessionID,
    });

    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error("❌ [Google OAuth] Erreur lors de la sauvegarde de la session :", err);
          return reject(err);
        }
        console.log("✅ [Google OAuth] Session sauvegardée");
        resolve();
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectUrl = `${frontendUrl}/dashboard?success=logged_in`;
    console.log("🔄 [Google OAuth] Redirection vers:", redirectUrl);
    console.log("🍪 [Google OAuth] Session ID à envoyer:", req.sessionID);

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("❌ [Google OAuth] Erreur lors du callback Google :", error);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/login?error=server_error`);
  }
};

// --- DÉCONNEXION ---
exports.logout = (req, res) => {
  if (req.session) {
    delete req.session.userId;
    delete req.session.userEmail;
    delete req.session.userName;
    delete req.session.userPicture;
  }

  req.session.save((err) => {
    if (err) {
      console.error("Erreur lors de la déconnexion :", err);
      return res.status(500).json({ message: "Erreur lors de la déconnexion." });
    }

    res.status(200).json({ message: "Déconnexion réussie." });
  });
};

// --- VÉRIFICATION DE SESSION ---
exports.checkSession = (req, res) => {
  console.log("🔍 [Check] Vérification session:", {
    hasSession: !!req.session,
    sessionID: req.sessionID,
    userId: req.session?.userId,
    site: req.session?.site,
    cookies: req.headers.cookie || "AUCUN COOKIE",
    origin: req.headers.origin,
  });

  if (req.session && req.session.userId) {
    console.log("✅ [Check] Session valide");
    return res.status(200).json({
      isAuthenticated: true,
      user: {
        id: req.session.userId,
        email: req.session.userEmail,
        name: req.session.userName,
        picture: req.session.userPicture,
      },
    });
  }

  console.log("❌ [Check] Session invalide ou absente");
  res.status(200).json({ isAuthenticated: false });
};

// --- MIDDLEWARE DE PROTECTION DES ROUTES ---
exports.requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Non authentifié." });
  }
  next();
};

// --- MIDDLEWARE ADMIN ---
exports.requireAdmin = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Non authentifié." });
    }

    await connectDB();
    const User = await getUserModel();
    const user = await User.findById(req.session.userId);

    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Accès refusé. Admin requis." });
    }

    next();
  } catch (error) {
    console.error("Erreur dans requireAdmin:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// --- CRÉATION DE COMPTE (ADMIN UNIQUEMENT) ---
exports.createUser = async (req, res) => {
  const { email, password, name, authMethod, role } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ error: "Email requis." });
    }

    if (authMethod === "email" && !password) {
      return res
        .status(400)
        .json({ error: "Mot de passe requis pour l'authentification email." });
    }

    if (!authMethod || !["email", "google"].includes(authMethod)) {
      return res.status(400).json({ error: "authMethod doit être 'email' ou 'google'." });
    }

    await connectDB();
    const User = await getUserModel();

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(400).json({ error: "Un compte avec cet email existe déjà." });
    }

    const newUser = new User({
      email: email.toLowerCase().trim(),
      password: authMethod === "email" ? password : undefined,
      name: name || undefined,
      authMethod: authMethod,
      role: role || "user",
    });

    await newUser.save();

    res.status(201).json({
      message: "Compte créé avec succès.",
      user: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        authMethod: newUser.authMethod,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la création du compte :", error);
    res.status(500).json({
      message: "Erreur serveur lors de la création du compte.",
    });
  }
};