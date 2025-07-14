// models/Cancion.js
const mongoose = require("mongoose");

const CancionSchema = new mongoose.Schema(
  {
    titulo: String,
    artista: String,
    generos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Genero" }],
    videoUrl: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cancion", CancionSchema);
