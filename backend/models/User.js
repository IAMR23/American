const mongoose = require("mongoose");

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const UsuarioSchema = new mongoose.Schema(
  {
    nombre: String,

    email: {
      type: String,
      unique: true,
      required: true,
    },

    password: {
      type: String,
      required: true,
      validate: {
        validator: function (value) {
          return passwordRegex.test(value);
        },
        message:
          "La contraseña debe tener mínimo 8 caracteres, incluyendo mayúsculas, minúsculas, números y un carácter especial.",
      },
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

    paypalSubscriptionID: {
      type: String,
      default: null,
    },
    resetToken: {
      type: String,
      default: null,
    },

    resetTokenExpire: {
      type: Date,
      default: null,
    },
  },

  { timestamps: true }
);

module.exports = mongoose.model("Usuario", UsuarioSchema);
