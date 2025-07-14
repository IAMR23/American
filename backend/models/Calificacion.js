const mongoose = require('mongoose');

const CalificacionSchema = new mongoose.Schema({
  partida: { type: mongoose.Schema.Types.ObjectId, ref: 'Partida' },
  puntaje: { type: Number, min: 1, max: 5 },
  comentario: String
}, { timestamps: true });

module.exports = mongoose.model('Calificacion', CalificacionSchema);
