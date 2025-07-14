import { obtenerDepartamentos } from "../controllers/arrendatarioController.js";
import { filtrarDepartamentos } from "../controllers/departamentoController.js";
import router from "./adminRoutes.js";

// Ruta para crear un usuario
router.get("/departamentos-disponibles", obtenerDepartamentos);
router.get("/filtrar", filtrarDepartamentos); // Ruta para filtrar

export default router;
