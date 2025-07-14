const mongoose = require('mongoose');

const ResenaSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  cancion: { type: mongoose.Schema.Types.ObjectId, ref: 'Cancion' },
  comentario: String,
  calificacion: { type: Number, min: 1, max: 5 }
}, { timestamps: true });

module.exports = mongoose.model('Resena', ResenaSchema);
