const mongoose = require('mongoose');

const FavoritaSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  canciones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cancion' }]
}, { timestamps: true });

FavoritaSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $type: 'objectId' } },
  },
);

module.exports = mongoose.model('Favorita', FavoritaSchema);
 
