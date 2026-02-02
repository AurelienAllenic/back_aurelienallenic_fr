const mongoose = require("mongoose");
const { getConnection, connectDB } = require("../config/db");
const bcrypt = require("bcryptjs");

const UserAurelienSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
    },
    picture: {
      type: String,
    },
    authMethod: {
      type: String,
      enum: ["email", "google"],
      required: true,
    },
    role: {
      type: String,
      default: "user",
      enum: ["user", "admin"],
    },
  },
  { timestamps: true }
);

UserAurelienSchema .pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserAurelienSchema .methods.comparePassword = async function (password) {
  if (!this.password) return false;
  return await bcrypt.compare(password, this.password);
};

const getUserModel = async () => {
  let connection = getConnection();

  if (!connection || connection.readyState !== 1) {
    connection = await connectDB();

    if (connection && connection.readyState === 2) {
      await new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 60;

        const checkConnection = setInterval(() => {
          attempts++;
          const state = connection.readyState;

          if (state === 1) {
            clearInterval(checkConnection);
            resolve();
          } else if (state === 0 || attempts >= maxAttempts) {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
      });
    }
  }

  if (!connection || connection.readyState !== 1) {
    throw new Error("Connexion MongoDB non disponible");
  }

  if (connection.models.UserAurelien) {
    return connection.models.UserAurelien;
  }

  return connection.model("UserAurelien", UserAurelienSchema, "useraureliens");
};

module.exports = getUserModel;