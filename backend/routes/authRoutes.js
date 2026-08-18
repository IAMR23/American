const express = require("express");
const { login, refresh, me, logout } = require("../controllers/authController");
const {
  authenticate,
  tieneAccesoKaraoke,
  tieneSuscripcionVigente,
} = require("../middleware/authMiddleware");
const { forgotPassword } = require("../middleware/forgotPassword");
const { resetPassword } = require("../middleware/resetPassword");
const { createRateLimiter } = require("../middleware/rateLimit");

const router = express.Router();
const loginLimiter = createRateLimiter({
  keyPrefix: "auth:login",
  windowMs: 15 * 60 * 1000,
  max: 10,
});
const forgotPasswordLimiter = createRateLimiter({
  keyPrefix: "auth:forgot-password",
  windowMs: 15 * 60 * 1000,
  max: 5,
});
const resetPasswordLimiter = createRateLimiter({
  keyPrefix: "auth:reset-password",
  windowMs: 15 * 60 * 1000,
  max: 5,
});

// Ruta para iniciar sesión
router.post("/login", loginLimiter, login);
router.post("/api/auth/login", loginLimiter, login);
router.post("/api/auth/refresh", refresh);
router.get("/api/auth/me", authenticate, me);
router.post("/api/auth/logout", logout);

router.get("/user/suscripcion", authenticate, (req, res) => {
  res.json({
    rol: req.user.rol,
    suscrito: req.user.suscrito === true,
    subscriptionEnd: req.user.subscriptionEnd,
    suscripcionVigente: tieneSuscripcionVigente(req.user),
    tieneAccesoKaraoke: tieneAccesoKaraoke(req.user),
  });
});

// Recuperar contraseña
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

// Resetear contraseña
router.post("/reset-password", resetPasswordLimiter, resetPassword);

module.exports = router;
