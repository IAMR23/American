const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  canciones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cancion' }],
}, { timestamps: true });

PlaylistSchema.index(
  { user: 1, nombre: 1 },
  {
    unique: true,
    partialFilterExpression: {
      user: { $type: 'objectId' },
      nombre: { $type: 'string' },
    },
  },
);

module.exports = mongoose.model('Playlist', PlaylistSchema);
