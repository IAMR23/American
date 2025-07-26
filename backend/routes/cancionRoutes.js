const express = require("express");
const router = express.Router();
const cancionController = require("../controllers/cancionController");
const { authenticate } = require("../middleware/authMiddleware");
const Cancion = require("../models/Cancion");

router.post("/", authenticate, cancionController.crearCancion);
router.get("/", cancionController.listarCanciones);
router.get("/artista", cancionController.listarCancionesArtista);
router.get("/filtrar", cancionController.filtrarCanciones);
router.get("/search", cancionController.getCancionesPaginadas);
router.get("/visibles", cancionController.listarCancionesVisibles);
router.get("/masreproducidas", async (req, res) => {
  try {
    const top = await Cancion.find().sort({ reproducciones: -1 }).limit(10);
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener canciones populares" });
  }
});
router.get("/:id", cancionController.obtenerCancion);
router.put("/:id", cancionController.actualizarCancion);
router.delete("/:id", cancionController.eliminarCancion);

router.post("/:id/reproducir", async (req, res) => {
  try {
    const cancion = await Cancion.findByIdAndUpdate(
      req.params.id,
      { $inc: { reproducciones: 1 } },
      { new: true }
    );
    res.json(cancion);
  } catch (err) {
    res.status(500).json({ error: "Error al contar reproducción" });
  }
});

module.exports = router;
