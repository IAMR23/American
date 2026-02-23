// models/Sesion.js
const mongoose = require("mongoose");

const SesionSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  activa: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Sesion", SesionSchema);