const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const User = require("../models/User.js");

async function createUser(req, res) {
  const { nombre, email, password, rol } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Validación de seguridad de contraseña
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  if (!password) {
    return res.status(400).json({ message: "La contraseña es obligatoria" });
  }
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message:
        "La contraseña debe tener mínimo 8 caracteres,  mayúsculas, minúsculas, números y un carácter especial.",
    });
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
      rol,
    });

    await newUser.save();

    res
      .status(201)
      .json({ message: "Usuario creado exitosamente", user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Error al crear el usuario", error });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const { nombre, email, password, rol } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== id) {
        return res
          .status(400)
          .json({ message: "El email ya está en uso por otro usuario" });
      }
    }

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    user.nombre = nombre || user.nombre;
    user.email = email || user.email;
    user.rol = rol || user.rol;

    await user.save();

    res.status(200).json({ message: "Usuario actualizado exitosamente", user });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el usuario", error });
  }
}

async function getUserById(req, res) {
  const { id } = req.params;

  try {
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el usuario", error });
  }
}

async function getUsers(req, res) {
  const { id } = req.params;

  try {
    const user = await User.find();
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el usuario", error });
  }
}

async function deleteUser(req, res) {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    await User.findByIdAndDelete(id);

    res.status(200).json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el usuario", error });
  }
}

module.exports = {
  createUser,
  updateUser,
  getUserById,
  deleteUser,
  getUsers,
};
