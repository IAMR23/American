const mongoose = require('mongoose');

const PagoSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
  paypalSubscriptionID: { type: String, default: null },
  paypalEventId: { type: String, default: null },
  paypalPaymentId: { type: String, default: null },
  tipoEvento: { type: String, default: null },
  monto_pagado: Number,
  currency: { type: String, default: 'USD' },
  metodo: String, // Ej: 'stripe', 'paypal'
  fecha_pago: { type: Date, default: Date.now },
  estado: { type: String, default: 'completado' },
  resumen: { type: String, default: null },
}, { timestamps: true });

PagoSchema.index(
  { paypalEventId: 1 },
  {
    unique: true,
    partialFilterExpression: { paypalEventId: { $type: 'string' } },
  },
);
PagoSchema.index({ paypalSubscriptionID: 1, fecha_pago: -1 });

module.exports = mongoose.model('Pago', PagoSchema);
