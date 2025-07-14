const mongoose = require('mongoose');

const PagoSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
  monto_pagado: Number,
  metodo: String, // Ej: 'stripe', 'paypal'
  fecha_pago: { type: Date, default: Date.now },
  estado: { type: String, default: 'completado' }
}, { timestamps: true });

module.exports = mongoose.model('Pago', PagoSchema);
