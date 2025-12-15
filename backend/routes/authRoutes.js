const express = require("express");
const { login } = require("../controllers/authController");
const { authenticate, verificarSuscripcionActiva } = require("../middleware/authMiddleware");
const { forgotPassword } = require("../middleware/forgotPassword");
const { resetPassword } = require("../middleware/resetPassword");

const router = express.Router();

// Ruta para iniciar sesión
router.post("/login", login);

router.get("/user/suscripcion", authenticate, verificarSuscripcionActiva, (req, res) => {
  res.json({
    suscrito: true, // sabemos que está suscrito porque pasó el middleware
    subscriptionEnd: req.user.subscriptionEnd,
  });
});

// Recuperar contraseña
router.post("/forgot-password", forgotPassword);

// Resetear contraseña
router.post("/reset-password", resetPassword);

module.exports = router;
  