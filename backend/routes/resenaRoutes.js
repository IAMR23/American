const express = require("express");
const router = express.Router();
const {
  crearResena,
  obtenerResenasPorCancion,
  eliminarResena,
} = require("../controllers/resenaController");

// Crear una nueva reseña
router.post("/", crearResena);

// Obtener todas las reseñas de una canción
router.get("/:cancionId", obtenerResenasPorCancion);

// Eliminar una reseña por ID
router.delete("/:id", eliminarResena);

module.exports = router;
