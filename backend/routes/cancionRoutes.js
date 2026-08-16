const express = require("express");
const router = express.Router();
const cancionController = require("../controllers/cancionController");
const {
  authenticate,
  verificarHostSalaConSuscripcionActiva,
  verificarSuscripcionActiva,
} = require("../middleware/authMiddleware");
const Cancion = require("../models/Cancion");

const protegerPremium = [authenticate, verificarSuscripcionActiva];

router.post("/", ...protegerPremium, cancionController.crearCancion);
router.get("/", ...protegerPremium, cancionController.listarCanciones);
router.get("/numero", ...protegerPremium, cancionController.listarCancionesNumero);
router.get("/ultsubidas", ...protegerPremium, cancionController.listarCancionesUltimasRecientes);
router.get("/artista", ...protegerPremium, cancionController.listarCancionesArtista);
router.get("/filtrar", ...protegerPremium, cancionController.filtrarCanciones);
router.get("/search", ...protegerPremium, cancionController.getCancionesPaginadas);
router.get(
  "/search-room/:roomId",
  verificarHostSalaConSuscripcionActiva,
  cancionController.getCancionesPaginadas
);
router.get("/visibles", cancionController.listarCancionesVisibles);
router.get("/masreproducidas", async (req, res) => {
  try {
    const top = await Cancion.find({ videoUrl: { $exists: true, $ne: "" } })
      .sort({ reproducciones: -1 })
      .limit(20)
      .populate("generos", "nombre");
    res.set("Cache-Control", "no-store");
    res.json(top);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener canciones populares" });
  }
});
router.get("/default/all", ...protegerPremium, cancionController.getVideosDefaultAll);
router.get("/default" , cancionController.getVideoDefault)
router.get("/:id", ...protegerPremium, cancionController.obtenerCancion);
router.put("/:id", ...protegerPremium, cancionController.actualizarCancion);
router.delete("/:id", ...protegerPremium, cancionController.eliminarCancion);

router.post("/:id/reproducir", ...protegerPremium, async (req, res) => {
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
