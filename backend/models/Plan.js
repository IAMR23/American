// models/Plan.js
const mongoose = require("mongoose");

const PlanSchema = new mongoose.Schema({
  paypalPlanId: { type: String, required: true, unique: true },
  productId: { type: String, required: true },
  nombre: { type: String, required: true },
  descripcion: { type: String },
  precio: { type: Number, required: true },
  duracionDias: { type: Number, required: true },
  currency: { type: String, default: "USD" },
  estado: { type: String, default: "INACTIVE" }, // El estado del plan: ACTIVE, INACTIVE
  create_time: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Plan", PlanSchema);
