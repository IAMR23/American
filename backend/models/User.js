const mongoose = require("mongoose");

const UsuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },

    rol: {
      type: String,
      enum: ["admin", "cantante"],
      default: "cantante",
    },

    // Nuevo: Suscripción
    suscrito: {
      type: Boolean,
      default: false,
    },

    subscriptionStart: {
      type: Date,
      default: null,
    },

    subscriptionEnd: {
      type: Date,
      default: null,
    },

    subscriptionStatus: {
      type: String,
      default: "INACTIVE",
    },

    subscriptionPlanId: {
      type: String,
      default: null,
      select: false,
    },

    paypalSubscriptionID: {
      type: String,
      default: null,
      select: false,
    },
    resetToken: {
      type: String,
      default: null,
      select: false,
    },

    resetTokenExpire: {
      type: Date,
      default: null,
      select: false,
    },

    tokenVersion: {
      type: Number,
      default: 0,
      select: false,
    },
  },

  { timestamps: true }
);

UsuarioSchema.index(
  { paypalSubscriptionID: 1 },
  {
    unique: true,
    partialFilterExpression: { paypalSubscriptionID: { $type: "string" } },
  },
);

module.exports = mongoose.model("Usuario", UsuarioSchema);
