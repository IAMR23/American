const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");
const { normalizeEmail, serializeUser } = require("../utils/userSecurity");

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

const limpiarUsuario = serializeUser;

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

const getBearerToken = (req) => {
  const [scheme, token] = req.headers.authorization?.split(" ") || [];
  return scheme === "Bearer" && token ? token : null;
};

const getLogoutUserId = (req) => {
  const candidates = [
    getBearerToken(req),
    req.cookies?.[REFRESH_COOKIE_NAME],
  ].filter(Boolean);

  for (const token of candidates) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type === "access" || decoded.type === "refresh") {
        return decoded.userId;
      }
    } catch {
      // Logout must still clear the browser cookie even if a token is stale.
    }
  }

  return null;
};

const invalidateLogoutTokens = async (req) => {
  const userId = getLogoutUserId(req);
  if (!userId) return;

  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
};

const login = async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  try {
    const user = await User.findOne({ email }).select("+password +tokenVersion");

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

    const user = await User.findById(decoded.userId).select("+tokenVersion");

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

const logout = async (req, res) => {
  try {
    await invalidateLogoutTokens(req);
  } catch (error) {
    console.error("Error al invalidar tokens en logout:", error);
  }

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
