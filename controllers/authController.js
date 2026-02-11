const getUserModel = require("../models/User");
const { connectDB } = require("../config/db");
const bcrypt = require("bcryptjs");


exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    await connectDB();
    const User = await getUserModel();

    const emailNormalized = email.toLowerCase().trim();
    const user = await User.findOne({
      email: emailNormalized,
    });

    if (!user) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    if (!user.password) {
      return res.status(401).json({ error: "Ce compte utilise la connexion Google." });
    }

    if (user.authMethod === "google" && user.password) {
      user.authMethod = "email";
      await user.save();
    }

    const passwordTrimmed = password.trim();
    const valid = await bcrypt.compare(passwordTrimmed, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Email ou mot de passe incorrect." });
    }

    req.session.userId = user._id;
    req.session.userEmail = user.email;
    req.session.userName = user.name || user.email;
    req.session.userPicture = user.picture;

    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });

    const setCookieHeader = res.getHeader("Set-Cookie");

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


exports.googleCallback = async (req, res) => {
  try {
    const profile = req.user;

    if (!profile || !profile.emails || !profile.emails[0]) {
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

    let user = await User.findOne({
      $or: [{ email: email }, { googleId: googleId }],
    });

    if (!user) {
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
      await user.save();
    }

    req.session.userId = user._id;
    req.session.userEmail = user.email;
    req.session.userName = user.name || user.email;
    req.session.userPicture = user.picture;

    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 200));

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectUrl = `${frontendUrl}/dashboard?success=logged_in`;

    res.redirect(redirectUrl);
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    res.redirect(`${frontendUrl}/login?error=server_error`);
  }
};


exports.logout = (req, res) => {
  if (req.session) {
    delete req.session.userId;
    delete req.session.userEmail;
    delete req.session.userName;
    delete req.session.userPicture;
  }

  req.session.save((err) => {
    if (err) {
      return res.status(500).json({ message: "Erreur lors de la déconnexion." });
    }
    res.status(200).json({ message: "Déconnexion réussie." });
  });
};


exports.checkSession = (req, res) => {

  if (req.session && req.session.userId) {
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
  res.status(200).json({ isAuthenticated: false });
};


exports.requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Non authentifié." });
  }
  next();
};


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
