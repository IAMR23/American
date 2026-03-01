const mongoose = require('mongoose');

const ColaSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
 roomId: { type: String, required: true, unique: true },
  canciones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cancion' }], 
  currentIndex : Number

}, { timestamps: true });

module.exports = mongoose.model('Cola', ColaSchema);
