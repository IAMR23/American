import express from "express";
import { authenticate, isArrendatario } from "../middleware/authMiddleware.js";
import {
  crearComentario,
  obtenerDepartamentosConComentarios,
} from "../controllers/reviewsController.js";
const router = express.Router();

// Ruta para dejar una reseña
router.post("/comentario/:id", authenticate, isArrendatario, crearComentario);
router.get("/depas/:id", obtenerDepartamentosConComentarios);
export default router; // Cambié 'module.exports' por 'export default'
