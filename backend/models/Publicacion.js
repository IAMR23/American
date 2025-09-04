const mongoose = require("mongoose");

const publicacionSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true },
    boton: { type: String },
    mediaUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Publicacion", publicacionSchema);
