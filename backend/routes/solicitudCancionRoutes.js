const express = require("express");
const router = express.Router();
const controlador = require("../controllers/solicitudCancionController");
const {
  authenticate,
  isAdmin,
  verificarSuscripcionActiva,
} = require("../middleware/authMiddleware");

const protegerPremium = [authenticate, verificarSuscripcionActiva];
const protegerAdmin = [authenticate, isAdmin];

// CRUD
router.post("/", ...protegerPremium, controlador.crearSolicitud);
router.post("/:id/votar", ...protegerPremium, controlador.votarPorSolicitud);
router.get("/", ...protegerPremium, controlador.obtenerSolicitudes);
router.get("/:id", ...protegerPremium, controlador.obtenerSolicitudPorId);
router.put("/:id", ...protegerPremium, controlador.actualizarSolicitud);
router.delete("/all", ...protegerAdmin, controlador.eliminarTodasSolicitudes);

router.delete("/:id", ...protegerPremium, controlador.eliminarSolicitud);

module.exports = router;
