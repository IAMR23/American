const express = require("express");
const router = express.Router();
const {
  crearAnuncio,
  obtenerAnuncios,
  obtenerTodosAnuncios,
  actualizarAnuncio,
  eliminarAnuncio,
  obtenerAnunciosVisibles,
} = require("../controllers/anuncioController");

const { authenticate, isAdmin } = require("../middleware/authMiddleware");

// Validación básica con express-validator
const { body } = require("express-validator");

// Crear anuncio (solo admin)
router.post(
  "/",
  authenticate,
  isAdmin,
  [
    body("titulo").notEmpty().withMessage("El título es obligatorio"),
    body("contenido").notEmpty().withMessage("El contenido es obligatorio"),
  ],
  crearAnuncio
);

// Obtener solo anuncios visibles (público)
router.get("/", obtenerAnuncios);

// Obtener todos los anuncios (admin)
router.get("/admin", authenticate, isAdmin, obtenerTodosAnuncios);
router.get("/visible", obtenerAnunciosVisibles);

// Actualizar anuncio (admin)
router.put(
  "/:id",
  authenticate,
  isAdmin,
  [
    body("titulo").optional().isString(),
    body("contenido").optional().isString(),
    body("visible").optional().isBoolean(),
  ],
  actualizarAnuncio
);

// Eliminar anuncio (admin)
router.delete("/:id", authenticate, isAdmin, eliminarAnuncio);

module.exports = router;
