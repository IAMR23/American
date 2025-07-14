const express = require("express");
const { body } = require("express-validator");
const {
  createGenero,
  getGeneroById,
  updateGenero,
  deleteGenero,
  getGenero,
} = require("../controllers/generoController");

const router = express.Router();

// Crear género
router.post(
  "/",
  [
    body("nombre").notEmpty().withMessage("El nombre es obligatorio"),
    body("description").optional().isString(),
  ],
  createGenero
);

// Obtener género por ID
router.get("/:id", getGeneroById);

// Actualizar género
router.put(
  "/:id",
  [
    body("nombre").optional().isString(),
    body("description").optional().isString(),
  ],
  updateGenero
);

// Eliminar género
router.get("/", getGenero);
router.delete("/:id", deleteGenero);

module.exports = router;
