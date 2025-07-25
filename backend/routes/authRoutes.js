const express = require("express");
const { login } = require("../controllers/authController");
const { authenticate, verificarSuscripcionActiva } = require("../middleware/authMiddleware");

const router = express.Router();

// Ruta para iniciar sesión
router.post("/login", login);

router.get("/user/suscripcion", authenticate, verificarSuscripcionActiva, (req, res) => {
  res.json({
    suscrito: true, // sabemos que está suscrito porque pasó el middleware
    subscriptionEnd: req.user.subscriptionEnd,
  });
});

module.exports = router;
