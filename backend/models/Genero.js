const mongoose = require('mongoose');

const GeneroSchema = new mongoose.Schema({
  nombre: { type: String, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('Genero', GeneroSchema);
