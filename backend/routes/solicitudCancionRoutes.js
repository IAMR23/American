const express = require('express');
const router = express.Router();
const controlador = require('../controllers/solicitudCancionController');

// CRUD
router.post('/', controlador.crearSolicitud);
router.get('/', controlador.obtenerSolicitudes);
router.get('/:id', controlador.obtenerSolicitudPorId);
router.put('/:id', controlador.actualizarSolicitud);
router.delete('/:id', controlador.eliminarSolicitud);

module.exports = router;
