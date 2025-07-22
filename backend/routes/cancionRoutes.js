const express = require("express");
const router = express.Router();
const cancionController = require("../controllers/cancionController");
const { authenticate } = require("../middleware/authMiddleware");

router.post("/", authenticate ,cancionController.crearCancion);
router.get("/", cancionController.listarCanciones);
router.get("/artista", cancionController.listarCancionesArtista);
router.get("/filtrar", cancionController.filtrarCanciones);
router.get("/search", cancionController.getCancionesPaginadas);
router.get("/visibles", cancionController.listarCancionesVisibles);
router.get("/:id", cancionController.obtenerCancion);
router.put("/:id", cancionController.actualizarCancion);
router.delete("/:id", cancionController.eliminarCancion);

module.exports = router;
