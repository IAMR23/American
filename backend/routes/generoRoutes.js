const express = require("express");
const { body } = require("express-validator");
const {
  createGenero,
  getGeneroById,
  updateGenero,
  deleteGenero,
  getGenero,
} = require("../controllers/generoController");
const { authenticate, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();
const protegerAdmin = [authenticate, isAdmin];

// Crear género
router.post(
  "/",
  [
    ...protegerAdmin,
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
    ...protegerAdmin,
    body("nombre").optional().isString(),
    body("description").optional().isString(),
  ],
  updateGenero
);

// Eliminar género
router.get("/", getGenero);
router.delete("/:id", ...protegerAdmin, deleteGenero);

module.exports = router;
