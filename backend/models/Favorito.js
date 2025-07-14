const mongoose = require('mongoose');

const FavoritaSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  canciones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cancion' }]
}, { timestamps: true });

module.exports = mongoose.model('Favorita', FavoritaSchema);
 