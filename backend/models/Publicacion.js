const mongoose = require("mongoose");

const publicacionSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true },
    descripcion: { type: String, required: true },
    tipo: { type: String, required: true },
    mediaUrl: { type: String },
    tipoMedia: { type: String, enum: ["video", "pdf" , "mp3"], default: null }, // <- NUEVO
  },
  { timestamps: true }
);

module.exports = mongoose.model("Publicacion", publicacionSchema);
