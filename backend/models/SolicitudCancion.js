const mongoose = require('mongoose');

const SolicitudCancionSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  comentario: String,
  estado: { type: String, default: 'pendiente' } // pendiente, aceptada, rechazada
}, { timestamps: true });

module.exports = mongoose.model('SolicitudCancion', SolicitudCancionSchema);
