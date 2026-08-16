const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Room = require("../models/Room");

const SUBSCRIPTION_INACTIVE_CODE = "SUBSCRIPTION_INACTIVE";
const SUBSCRIPTION_INACTIVE_MESSAGE = "Tu suscripcion no esta vigente";

const responderSuscripcionInactiva = (res) =>
  res.status(403).json({
    code: SUBSCRIPTION_INACTIVE_CODE,
    message: SUBSCRIPTION_INACTIVE_MESSAGE,
    mensaje: SUBSCRIPTION_INACTIVE_MESSAGE,
  });

const getSubscriptionEndDate = (subscriptionEnd) => {
  if (!subscriptionEnd) return null;

  const date = new Date(subscriptionEnd);
  return Number.isNaN(date.getTime()) ? null : date;
};

const tieneSuscripcionVigente = (usuario) => {
  const fin = getSubscriptionEndDate(usuario?.subscriptionEnd);

  return usuario?.suscrito === true && Boolean(fin) && Date.now() < fin.getTime();
};

const tieneAccesoKaraoke = (usuario) =>
  usuario?.rol === "admin" || tieneSuscripcionVigente(usuario);

// Middleware para verificar que el usuario está autenticado
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No se proporcionó token" });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type && decoded.type !== "access") {
      return res.status(401).json({ message: "Token de acceso invalido" });
    }

    // Buscar usuario
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    // 🔴 VALIDACIÓN CLAVE PARA LOGOUT GLOBAL
    if (decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({
        message: "Sesión expirada. Inicie sesión nuevamente."
      });
    }

    req.user = user;

    next();

  } catch (error) {
    return res.status(401).json({
      message: "Token inválido o expirado"
    });
  }
};

// Middleware para verificar que el usuario sea un arrendador (cantante)
const isPlayer = (req, res, next) => {
  if (req.user && req.user.rol === "cantante") {
    return next(); // El usuario es cantante, continuar
  }
  return res
    .status(403)
    .json({ message: "Acción solo permitida para cantantes" });
};

const isAprobado = (req, res, next) => {
  if (req.user && req.user.verificado === true) {
    return next(); // El cantante está aprobado, continuar
  }
  return res.status(403).json({
    message: "El cantante no está aprobado para realizar esta acción",
  });
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.rol === "admin") {
    return next(); // El usuario es admin, continuar
  }
  return res
    .status(403)
    .json({ message: "Acción solo permitida para administradores" });
};

const verificarSuscripcionActiva = async (req, res, next) => {
  try {
    const usuarioId = req.user?._id || req.user?.id;

    if (!usuarioId) {
      return res.status(401).json({ message: "Usuario no autenticado" });
    }

    const usuario = await User.findById(usuarioId);

    if (!usuario) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    if (!tieneAccesoKaraoke(usuario)) {
      return responderSuscripcionInactiva(res);
    }

    req.user = usuario;
    next();
  } catch (err) {
    console.error("Error en middleware de suscripción:", err);
    responderSuscripcionInactiva(res);
  }
};

const verificarHostSalaConSuscripcionActiva = async (req, res, next) => {
  try {
    const roomId = req.params?.roomId || req.body?.roomId || req.query?.roomId;

    if (!roomId) {
      return res.status(400).json({ error: "roomId requerido" });
    }

    const sala = await Room.findOne({ roomId });

    if (!sala) {
      return res.status(404).json({ error: "Sala no existe" });
    }

    if (!sala.host || !mongoose.Types.ObjectId.isValid(String(sala.host))) {
      return responderSuscripcionInactiva(res);
    }

    const host = await User.findById(sala.host);

    if (!tieneAccesoKaraoke(host)) {
      return responderSuscripcionInactiva(res);
    }

    req.room = sala;
    req.roomHost = host;
    next();
  } catch (err) {
    console.error("Error validando suscripcion del host de sala:", err);
    responderSuscripcionInactiva(res);
  }
};

module.exports = {
  authenticate,
  isPlayer,
  isAprobado,
  isAdmin,
  verificarSuscripcionActiva,
  verificarHostSalaConSuscripcionActiva,
  responderSuscripcionInactiva,
  tieneAccesoKaraoke,
  tieneSuscripcionVigente,
  SUBSCRIPTION_INACTIVE_CODE,
  SUBSCRIPTION_INACTIVE_MESSAGE,
};
