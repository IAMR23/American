// models/Cancion.js
const mongoose = require("mongoose");

const PuntajeSchema = new mongoose.Schema(
  {
    titulo : String, 
    videoUrl: String,
    imagenUrl: String,
    weight : Number
  },
  { timestamps: true }
);

module.exports = mongoose.model("Puntaje", PuntajeSchema);
