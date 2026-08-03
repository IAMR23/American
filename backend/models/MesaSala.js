const mongoose = require("mongoose");

const CancionMesaSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "Cancion", required: true },
    numero: Number,
    titulo: String,
    artista: String,
    videoUrl: String,
  },
  { _id: false },
);

const PersonaMesaSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    nombre: { type: String, required: true },
    canciones: [CancionMesaSchema],
  },
  { _id: false },
);

const MesaSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    numero: { type: Number, required: true },
    nombre: { type: String, required: true },
    personas: [PersonaMesaSchema],
  },
  { _id: false },
);

const MesaSalaSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    mesas: [MesaSchema],
  },
  { timestamps: true },
);

module.exports = mongoose.model("MesaSala", MesaSalaSchema);
