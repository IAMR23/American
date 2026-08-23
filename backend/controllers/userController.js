const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../models/User.js");

const passwordRegex = /^.{6,}$/;
const passwordErrorMessage = "La contrasena debe tener minimo 6 caracteres.";
const allowedRoles = ["admin", "cantante"];
const userPageLimits = [5, 10, 25, 50];
const defaultUserPageLimit = 10;
const allowedSorts = {
  nombre: "nombre",
  rol: "rol",
  estado: "subscriptionRank",
  vencimiento: "subscriptionEnd",
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cleanUser = (user) => {
  const plain = user?.toObject ? user.toObject() : user;
  if (!plain) return plain;

  delete plain.password;
  delete plain.resetToken;
  delete plain.resetTokenExpire;
  return plain;
};

const parseDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getSubscriptionStatus = (user, now = new Date()) => {
  const start = parseDate(user?.subscriptionStart);
  const end = parseDate(user?.subscriptionEnd);

  if (!user?.suscrito || !start || !end) return "sin";
  if (start > now) return "programada";
  if (end <= now) return "vencida";
  return "activa";
};

const validateSubscriptionDates = ({ suscrito, subscriptionStart, subscriptionEnd }) => {
  const start = parseDate(subscriptionStart);
  const end = parseDate(subscriptionEnd);

  if (!suscrito) {
    return { valid: true, start: null, end: null };
  }

  if (!start || !end) {
    return {
      valid: false,
      message: "La fecha de inicio y fin son obligatorias para una suscripcion.",
    };
  }

  if (end <= start) {
    return {
      valid: false,
      message: "La fecha de fin debe ser posterior a la fecha de inicio.",
    };
  }

  return { valid: true, start, end };
};

const buildUsersMatch = ({ search, role, subscriptionStatus, now }) => {
  const filters = [];

  if (search) {
    const searchRegex = new RegExp(escapeRegExp(search), "i");
    filters.push({ $or: [{ nombre: searchRegex }, { email: searchRegex }] });
  }

  if (allowedRoles.includes(role)) {
    filters.push({ rol: role });
  }

  if (subscriptionStatus === "activa") {
    filters.push({
      suscrito: true,
      subscriptionStart: { $lte: now },
      subscriptionEnd: { $gt: now },
    });
  }

  if (subscriptionStatus === "programada") {
    filters.push({ suscrito: true, subscriptionStart: { $gt: now } });
  }

  if (subscriptionStatus === "vencida") {
    filters.push({ suscrito: true, subscriptionEnd: { $lte: now } });
  }

  if (subscriptionStatus === "sin") {
    filters.push({
      $or: [
        { suscrito: { $ne: true } },
        { subscriptionStart: null },
        { subscriptionEnd: null },
      ],
    });
  }

  return filters.length ? { $and: filters } : {};
};

const getUserStats = async (now) => {
  const [total, activos, programadas, vencidos, sinSuscripcion, admins] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({
        suscrito: true,
        subscriptionStart: { $lte: now },
        subscriptionEnd: { $gt: now },
      }),
      User.countDocuments({ suscrito: true, subscriptionStart: { $gt: now } }),
      User.countDocuments({ suscrito: true, subscriptionEnd: { $lte: now } }),
      User.countDocuments({
        $or: [
          { suscrito: { $ne: true } },
          { subscriptionStart: null },
          { subscriptionEnd: null },
        ],
      }),
      User.countDocuments({ rol: "admin" }),
    ]);

  return { total, activos, programadas, vencidos, sinSuscripcion, admins };
};

const getSort = ({ sortBy, sortOrder }) => {
  const field = allowedSorts[sortBy] || "createdAt";
  const direction = sortOrder === "asc" ? 1 : -1;

  return { [field]: direction, _id: -1 };
};

const ensureCanChangeAdminRole = async ({ targetUser, nextRole }) => {
  if (targetUser.rol !== "admin" || nextRole === "admin") return null;

  const adminCount = await User.countDocuments({ rol: "admin" });
  if (adminCount <= 1) {
    return "No se puede quitar el rol al ultimo administrador.";
  }

  return null;
};

async function createUser(req, res) {
  const isAdminRequest = req.user?.rol === "admin";
  const {
    nombre = "",
    email = "",
    password = "",
    rol = "cantante",
    suscrito = false,
    subscriptionStart,
    subscriptionEnd,
  } = req.body;

  const normalizedEmail = String(email).trim().toLowerCase();
  const nextRole = isAdminRequest && allowedRoles.includes(rol) ? rol : "cantante";
  const nextSuscrito = isAdminRequest ? Boolean(suscrito) : false;
  const dateValidation = validateSubscriptionDates({
    suscrito: nextSuscrito,
    subscriptionStart,
    subscriptionEnd,
  });

  if (!String(nombre).trim()) {
    return res.status(400).json({ message: "El nombre es obligatorio." });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ message: "Ingresa un correo valido." });
  }

  if (!password) {
    return res.status(400).json({ message: "La contrasena es obligatoria." });
  }

  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: passwordErrorMessage });
  }

  if (!dateValidation.valid) {
    return res.status(400).json({ message: dateValidation.message });
  }

  try {
    const existingUser = await User.findOne({
      email: new RegExp(`^${escapeRegExp(normalizedEmail)}$`, "i"),
    });
    if (existingUser) {
      return res.status(400).json({ message: "El correo ya esta en uso." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      nombre: String(nombre).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      rol: nextRole,
      suscrito: nextSuscrito,
      subscriptionStart: dateValidation.start,
      subscriptionEnd: dateValidation.end,
    });

    await newUser.save();

    res.status(201).json({
      message: "Usuario creado exitosamente",
      user: cleanUser(newUser),
    });
  } catch (error) {
    res.status(500).json({ message: "Error al crear el usuario", error });
  }
}

async function updateUser(req, res) {
  const { id } = req.params;
  const updates = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Usuario invalido." });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const nextRole = updates.rol || user.rol;
    if (!allowedRoles.includes(nextRole)) {
      return res.status(400).json({ message: "Rol invalido." });
    }

    const adminRoleError = await ensureCanChangeAdminRole({
      targetUser: user,
      nextRole,
    });
    if (adminRoleError) {
      return res.status(400).json({ message: adminRoleError });
    }

    if (Object.prototype.hasOwnProperty.call(updates, "nombre")) {
      if (!String(updates.nombre).trim()) {
        return res.status(400).json({ message: "El nombre es obligatorio." });
      }
      user.nombre = String(updates.nombre).trim();
    }

    if (Object.prototype.hasOwnProperty.call(updates, "email")) {
      const normalizedEmail = String(updates.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res.status(400).json({ message: "Ingresa un correo valido." });
      }

      const existingUser = await User.findOne({
        email: new RegExp(`^${escapeRegExp(normalizedEmail)}$`, "i"),
      });
      if (existingUser && existingUser._id.toString() !== id) {
        return res.status(400).json({ message: "El correo ya esta en uso." });
      }

      user.email = normalizedEmail;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "password") && updates.password) {
      if (!passwordRegex.test(updates.password)) {
        return res.status(400).json({ message: passwordErrorMessage });
      }

      user.password = await bcrypt.hash(updates.password, 10);
    }

    user.rol = nextRole;

    if (
      Object.prototype.hasOwnProperty.call(updates, "suscrito") ||
      Object.prototype.hasOwnProperty.call(updates, "subscriptionStart") ||
      Object.prototype.hasOwnProperty.call(updates, "subscriptionEnd")
    ) {
      const nextSuscrito = Boolean(updates.suscrito);
      const dateValidation = validateSubscriptionDates({
        suscrito: nextSuscrito,
        subscriptionStart: updates.subscriptionStart,
        subscriptionEnd: updates.subscriptionEnd,
      });

      if (!dateValidation.valid) {
        return res.status(400).json({ message: dateValidation.message });
      }

      user.suscrito = nextSuscrito;
      user.subscriptionStart = dateValidation.start;
      user.subscriptionEnd = dateValidation.end;
    }

    await user.save();

    res.status(200).json({
      message: "Usuario actualizado exitosamente",
      user: cleanUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el usuario", error });
  }
}

async function updateUserSubscription(req, res) {
  const { id } = req.params;
  const { suscrito, subscriptionStart, subscriptionEnd } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Usuario invalido." });
  }

  const dateValidation = validateSubscriptionDates({
    suscrito: Boolean(suscrito),
    subscriptionStart,
    subscriptionEnd,
  });

  if (!dateValidation.valid) {
    return res.status(400).json({ message: dateValidation.message });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    user.suscrito = Boolean(suscrito);
    user.subscriptionStart = dateValidation.start;
    user.subscriptionEnd = dateValidation.end;
    await user.save();

    res.status(200).json({
      message: "Suscripcion actualizada exitosamente",
      user: cleanUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar la suscripcion", error });
  }
}

async function getUserById(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Usuario invalido." });
  }

  if (req.user?.rol !== "admin" && req.user?._id?.toString() !== id) {
    return res.status(403).json({ message: "No tienes permiso para ver este usuario." });
  }

  try {
    const user = await User.findById(id).select("-password -resetToken -resetTokenExpire");
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el usuario", error });
  }
}

async function getUsers(req, res) {
  try {
    const requestedPage = Number.parseInt(req.query.page, 10);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = userPageLimits.includes(requestedLimit)
      ? requestedLimit
      : defaultUserPageLimit;
    const search = String(req.query.search || "").trim();
    const role = String(req.query.role || "todos");
    const subscriptionStatus = String(req.query.subscriptionStatus || "todos");
    const sortBy = String(req.query.sortBy || "createdAt");
    const sortOrder = String(req.query.sortOrder || "desc");
    const now = new Date();
    const match = buildUsersMatch({ search, role, subscriptionStatus, now });
    const [total, stats] = await Promise.all([
      User.countDocuments(match),
      getUserStats(now),
    ]);
    const totalPages = Math.ceil(total / limit);
    const currentPage = totalPages ? Math.min(page, totalPages) : 1;
    const skip = (currentPage - 1) * limit;
    const pipeline = [
      { $match: match },
      {
        $addFields: {
          subscriptionStatus: {
            $switch: {
              branches: [
                {
                  case: {
                    $or: [
                      { $ne: ["$suscrito", true] },
                      { $eq: ["$subscriptionStart", null] },
                      { $eq: ["$subscriptionEnd", null] },
                    ],
                  },
                  then: "sin",
                },
                { case: { $gt: ["$subscriptionStart", now] }, then: "programada" },
                { case: { $lte: ["$subscriptionEnd", now] }, then: "vencida" },
              ],
              default: "activa",
            },
          },
          subscriptionRank: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [
                      { $eq: ["$suscrito", true] },
                      { $lte: ["$subscriptionStart", now] },
                      { $gt: ["$subscriptionEnd", now] },
                    ],
                  },
                  then: 1,
                },
                {
                  case: {
                    $and: [
                      { $eq: ["$suscrito", true] },
                      { $gt: ["$subscriptionStart", now] },
                    ],
                  },
                  then: 2,
                },
                {
                  case: {
                    $and: [
                      { $eq: ["$suscrito", true] },
                      { $lte: ["$subscriptionEnd", now] },
                    ],
                  },
                  then: 3,
                },
              ],
              default: 4,
            },
          },
        },
      },
      { $sort: getSort({ sortBy, sortOrder }) },
      { $skip: skip },
      { $limit: limit },
      { $project: { password: 0, resetToken: 0, resetTokenExpire: 0 } },
    ];
    const user = await User.aggregate(pipeline);

    res.status(200).json({
      user,
      pagination: {
        page: currentPage,
        limit,
        total,
        totalPages,
      },
      stats,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener usuarios", error });
  }
}

async function deleteUser(req, res) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Usuario invalido." });
  }

  if (req.user?._id?.toString() === id) {
    return res.status(400).json({
      message: "No puedes eliminar tu propia cuenta desde este modulo.",
    });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (user.rol === "admin") {
      const adminCount = await User.countDocuments({ rol: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({
          message: "No se puede eliminar el ultimo administrador.",
        });
      }
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
  updateUserSubscription,
  getUserById,
  deleteUser,
  getUsers,
  getSubscriptionStatus,
};
