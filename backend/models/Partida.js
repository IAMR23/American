const mongoose = require('mongoose');

const PartidaSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  cancion: { type: mongoose.Schema.Types.ObjectId, ref: 'Cancion' },
  desde_playlist: { type: Boolean, default: false },
  fecha: { type: Date, default: Date.now },
  calificacion: { type: Number, min: 1, max: 5 }, // opcional
  comentarios: String // opcional
}, { timestamps: true });

module.exports = mongoose.model('Partida', PartidaSchema);
