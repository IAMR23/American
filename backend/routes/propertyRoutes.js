import express from "express";
import upload, {
  publicarDepartamento,
  obtenerDepartamentosPorArrendador,
  actualizarDepartamento,
  filtrarDepartamentos,
  obtenerDepartamento,
  obtenerTodosDepartamentos,
} from "../controllers/departamentoController.js";
import {
  authenticate,
  isAprobado,
  isArrendador,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/departamento",
  authenticate,
  isArrendador,
  isAprobado,
  upload,
  publicarDepartamento
);
router.get("/departamentos/arrendador/:id", obtenerDepartamentosPorArrendador);
router.patch(
  "/departamento/:id",
  authenticate,
  isArrendador,
  upload,
  actualizarDepartamento
);
router.get("/filtrar", filtrarDepartamentos);
router.get("/departamentos/:id", obtenerDepartamento);
router.get("/departamentos", obtenerTodosDepartamentos);

export default router;
