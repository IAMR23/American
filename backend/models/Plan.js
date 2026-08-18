// models/Plan.js
const mongoose = require("mongoose");

const PlanSchema = new mongoose.Schema({
  paypalPlanId: { type: String, required: true, unique: true },
  productId: { type: String, required: true },
  nombre: { type: String, required: true },
  descripcion: { type: String },
  precio: { type: Number, required: true },
  duracionDias: { type: Number, required: true },
  intervalUnit: { type: String, default: "MONTH" },
  intervalCount: { type: Number, default: 1 },
  currency: { type: String, default: "USD" },
  estado: { type: String, default: "INACTIVE" }, // ACTIVE, INACTIVE, CREATED
  create_time: { type: Date, default: Date.now },
}, { timestamps: true });

PlanSchema.index({ productId: 1, estado: 1 });

module.exports = mongoose.model("Plan", PlanSchema);
