const express = require("express");
const router = express.Router();
const controlador = require("../controllers/solicitudCancionController");
const {
  authenticate,
  verificarSuscripcionActiva,
} = require("../middleware/authMiddleware");

const protegerPremium = [authenticate, verificarSuscripcionActiva];

// CRUD
router.post("/", ...protegerPremium, controlador.crearSolicitud);
router.post("/:id/votar", ...protegerPremium, controlador.votarPorSolicitud);
router.get("/", ...protegerPremium, controlador.obtenerSolicitudes);
router.get("/:id", ...protegerPremium, controlador.obtenerSolicitudPorId);
router.put("/:id", ...protegerPremium, controlador.actualizarSolicitud);
router.delete("/all", ...protegerPremium, controlador.eliminarTodasSolicitudes);

router.delete("/:id", ...protegerPremium, controlador.eliminarSolicitud);

module.exports = router;
