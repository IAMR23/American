const express = require('express');
const router = express.Router();
const controlador = require('../controllers/publicacionController');

// Rutas CRUD
router.post('/', controlador.crearPublicacion);
router.get('/', controlador.obtenerPublicaciones);
router.get('/:id', controlador.obtenerPublicacion);
router.put('/:id', controlador.actualizarPublicacion);
router.delete('/:id', controlador.eliminarPublicacion);

module.exports = router;
