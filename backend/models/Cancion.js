// models/Cancion.js
const mongoose = require("mongoose");

const CancionSchema = new mongoose.Schema(
  {
    numero: Number,
    titulo: String,
    artista: String,
    generos: { type: mongoose.Schema.Types.ObjectId, ref: "Genero" },
    videoUrl: String,
    imagenUrl: String,
    visiblePrincipal: Boolean,
    reproducciones: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cancion", CancionSchema);
