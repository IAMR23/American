const express = require('express');
const router = express.Router();
const controlador = require('../controllers/publicacionController');
const { authenticate, isAdmin } = require("../middleware/authMiddleware");

const protegerAdmin = [authenticate, isAdmin];

// Rutas CRUD
router.post('/', ...protegerAdmin, controlador.crearPublicacion);
router.get('/', controlador.obtenerPublicaciones);
router.get('/:id', controlador.obtenerPublicacion);
router.put('/:id', ...protegerAdmin, controlador.actualizarPublicacion);
router.delete('/:id', ...protegerAdmin, controlador.eliminarPublicacion);

module.exports = router;
