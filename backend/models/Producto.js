// models/Producto.js
const mongoose = require("mongoose");

const ProductoSchema = new mongoose.Schema({
  paypalProductId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  type: { type: String, default: "SERVICE" },
  category: { type: String, default: "SOFTWARE" },
  create_time: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Producto", ProductoSchema);
