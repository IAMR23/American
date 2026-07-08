// models/Cancion.js
const mongoose = require("mongoose");

const CancionSchema = new mongoose.Schema(
  {
    numero: Number,
    titulo: String,
    artista: String,
    generos: { type: mongoose.Schema.Types.ObjectId, ref: "Genero" },
    videoUrl: String,
    videoDefaultMesas: { type: Boolean, default: false },
    videoDefaultConcurso: { type: Boolean, default: false },
    videoFinalConcurso: { type: Boolean, default: false },
    imagenUrl: String,
    visiblePrincipal: Boolean,
    videoDefault: {type : Boolean , default : false },
    videoDefaultAt: { type: Date, default: null },
    reproducciones: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cancion", CancionSchema);
