const mongoose = require('mongoose');

const SolicitudCancionSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  cantante: String,
  cancion: String,
  votos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }] // Usuarios que han votado
}, { timestamps: true });

module.exports = mongoose.model('SolicitudCancion', SolicitudCancionSchema);
