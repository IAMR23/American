// models/Cancion.js
const mongoose = require("mongoose");

const PuntajeSchema = new mongoose.Schema(
  {
    calificacion: String,
    videoUrl: String,
    imagenUrl: String,
    weight: Number,
    key: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Puntaje", PuntajeSchema);
