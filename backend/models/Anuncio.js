const mongoose = require('mongoose');

const AnuncioSchema = new mongoose.Schema({
  titulo: String,
  contenido: String,
  visible: { type: Boolean, default: true },
  fecha_inicio: Date,
  fecha_fin: Date,
  creado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' } // Admin
}, { timestamps: true });

module.exports = mongoose.model('Anuncio', AnuncioSchema);
