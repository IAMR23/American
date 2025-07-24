const express = require('express');
const router = express.Router();
const controlador = require('../controllers/publicacionController');

router.post('/', controlador.crearPublicacion);
router.get('/', controlador.obtenerPublicaciones);
router.get('/video', controlador.obtenerPublicacionesVideo);
router.get('/:id', controlador.obtenerPublicacion);
router.put('/:id', controlador.actualizarPublicacion);
router.delete('/:id', controlador.eliminarPublicacion);

module.exports = router;
