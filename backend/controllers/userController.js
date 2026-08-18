const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const User = require("../models/User.js");
const {
  normalizeEmail,
  normalizeName,
  serializeUser,
  validatePasswordStrength,
} = require("../utils/userSecurity");

async function createUser(req, res) {
  const { password } = req.body;
  const nombre = normalizeName(req.body.nombre);
  const email = normalizeEmail(req.body.email);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if (!nombre) {
    return res.status(400).json({ message: "El nombre es obligatorio" });
  }

  if (!email) {
    return res.status(400).json({ message: "El email es obligatorio" });
  }

  const passwordError = validatePasswordStrength(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "El usuario ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      nombre,
      email,
      password: hashedPassword,
      rol: "cantante",
      suscrito: false,
      subscriptionStart: null,
      subscriptionEnd: null,
    });

    await newUser.save();

    res.status(201).json({
      message: "Usuario creado exitosamente",
      user: serializeUser(newUser),
    });
  } catch (error) {
    console.error("Error al crear el usuario:", error);
    res.status(500).json({ message: "Error al crear el usuario" });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const {
    nombre,
    email,
    password,
    rol,
    suscrito,
    subscriptionStart,
    subscriptionEnd,
  } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID de usuario inválido" });
  }

  const normalizedEmail = email ? normalizeEmail(email) : null;
  const normalizedName = nombre ? normalizeName(nombre) : null;

  if (password) {
    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }
  }

  try {
    const user = await User.findById(id).select("+password +tokenVersion");
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (normalizedEmail) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser && existingUser._id.toString() !== id) {
        return res
          .status(400)
          .json({ message: "El email ya está en uso por otro usuario" });
      }
    }

    if (password) {
      user.password = await bcrypt.hash(password, 10);
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    }

    if (normalizedName) user.nombre = normalizedName;
    if (normalizedEmail) user.email = normalizedEmail;

    if (rol !== undefined) {
      if (!["admin", "cantante"].includes(rol)) {
        return res.status(400).json({ message: "Rol inválido" });
      }
      user.rol = rol;
    }

    if (typeof suscrito === "boolean") user.suscrito = suscrito;

    if (subscriptionStart !== undefined) {
      const startDate = subscriptionStart ? new Date(subscriptionStart) : null;
      if (startDate && Number.isNaN(startDate.getTime())) {
        return res
          .status(400)
          .json({ message: "Fecha de inicio de suscripción inválida" });
      }
      user.subscriptionStart = startDate;
    }

    if (subscriptionEnd !== undefined) {
      const endDate = subscriptionEnd ? new Date(subscriptionEnd) : null;
      if (endDate && Number.isNaN(endDate.getTime())) {
        return res
          .status(400)
          .json({ message: "Fecha de fin de suscripción inválida" });
      }
      user.subscriptionEnd = endDate;
    }

    await user.save();

    res.status(200).json({
      message: "Usuario actualizado exitosamente",
      user: serializeUser(user),
    });
  } catch (error) {
    console.error("Error al actualizar el usuario:", error);
    res.status(500).json({ message: "Error al actualizar el usuario" });
  }
}

async function getUserById(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID de usuario inválido" });
  }

  try {
    const user = await User.findById(id).lean();
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json({ user: serializeUser(user) });
  } catch (error) {
    console.error("Error al obtener el usuario:", error);
    res.status(500).json({ message: "Error al obtener el usuario" });
  }
}

async function getUsers(req, res) {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();

    res.status(200).json({ user: users.map(serializeUser) });
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ message: "Error al obtener el usuario" });
  }
}

async function deleteUser(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "ID de usuario inválido" });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    console.error("Error al eliminar el usuario:", error);
    res.status(500).json({ message: "Error al eliminar el usuario" });
  }
}

module.exports = {
  createUser,
  updateUser,
  getUserById,
  deleteUser,
  getUsers,
};
