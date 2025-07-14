const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  canciones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cancion' }],
}, { timestamps: true });

module.exports = mongoose.model('Playlist', PlaylistSchema);
