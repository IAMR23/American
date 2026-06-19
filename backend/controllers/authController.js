const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");

const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "30d";
const REFRESH_COOKIE_NAME = "refreshToken";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/auth/refresh",
  maxAge: THIRTY_DAYS_MS,
});

const limpiarUsuario = (user) => ({
  _id: user._id,
  nombre: user.nombre,
  email: user.email,
  rol: user.rol,
  suscrito: user.suscrito,
  subscriptionEnd: user.subscriptionEnd,
});

const generarAccessToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      rol: user.rol,
      tokenVersion: user.tokenVersion,
      type: "access",
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN },
  );

const generarRefreshToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      tokenVersion: user.tokenVersion,
      type: "refresh",
    },
    process.env.JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN },
  );

const setRefreshCookie = (res, refreshToken) => {
  // El refreshToken viaja solo en cookie HttpOnly; nunca se expone al frontend.
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions());
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...getRefreshCookieOptions(),
    maxAge: undefined,
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "El usuario no existe" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Contrasena incorrecta" });
    }

    const accessToken = generarAccessToken(user);
    const refreshToken = generarRefreshToken(user);

    setRefreshCookie(res, refreshToken);

    res.json({
      message: "Inicio de sesion exitoso",
      accessToken,
      token: accessToken,
      user: limpiarUsuario(user),
    });
  } catch (error) {
    res.status(500).json({ message: "Error en el servidor" });
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      return res.status(401).json({ message: "No hay refresh token activo" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    if (decoded.type !== "refresh") {
      return res.status(401).json({ message: "Refresh token invalido" });
    }

    const user = await User.findById(decoded.userId);

    if (!user || decoded.tokenVersion !== user.tokenVersion) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: "Sesion expirada" });
    }

    const accessToken = generarAccessToken(user);

    res.json({
      accessToken,
      token: accessToken,
      user: limpiarUsuario(user),
    });
  } catch (error) {
    clearRefreshCookie(res);
    res.status(401).json({ message: "Refresh token invalido o expirado" });
  }
};

const me = async (req, res) => {
  res.json({ user: limpiarUsuario(req.user) });
};

const logout = async (_req, res) => {
  clearRefreshCookie(res);
  res.json({ message: "Sesion cerrada" });
};

module.exports = {
  login,
  refresh,
  me,
  logout,
  generarAccessToken,
  generarRefreshToken,
};
