import express from "express";

import {
  aprobarArrendador,
  aprobarDepartamento,
  desactivarArrendador,
  desaprobarDepartamento,
  obtenerArrendadores,
  obtenerDepartamentosPorVerificar,
} from "../controllers/adminController.js";
import { authenticate, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

/* Gestion Departamentos */
router.put(
  "/aprobar/departamento/:id",
  authenticate,
  isAdmin,
  aprobarDepartamento
);
router.put(
  "/desaprobar/departamento/:id",
  authenticate,
  isAdmin,
  desaprobarDepartamento
);
router.get(
  "/departamentos-verificacion",
  authenticate,
  isAdmin,
  obtenerDepartamentosPorVerificar
);

/* Gestion de Arrendadores */
router.put("/aprobar/arrendador/:id", authenticate, isAdmin, aprobarArrendador);
router.put(
  "/desactivar/arrendador/:id",
  authenticate,
  isAdmin,
  desactivarArrendador
);
router.get(
  "/arrendadores/verificacion",
  authenticate,
  isAdmin,
  obtenerArrendadores
);

export default router;
