const mongoose = require('mongoose');

const ColaSchema = new mongoose.Schema({
 // user: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
 roomId: { type: String, required: true, unique: true },
  canciones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cancion' }], 
  currentIndex : Number,
  modoMesaActivo: { type: Boolean, default: false },
  modoMesaItems: [
    {
      mesaNumero: Number,
      mesaNombre: String,
      participanteNombre: String,
      participanteIndex: Number,
      cancionIndex: Number,
      esVideoDefaultMesas: { type: Boolean, default: false },
      cancion: { type: mongoose.Schema.Types.ObjectId, ref: 'Cancion' },
    },
  ],
  modoConcursoActivo: { type: Boolean, default: false },
  modoConcursoFinalizado: { type: Boolean, default: false },
  cancionesPorParticipanteConcurso: { type: Number, default: 1 },
  concursoItems: [
    {
      participanteId: String,
      participanteNombre: String,
      participanteIndex: Number,
      cancionIndex: Number,
      esVideoDefaultConcurso: { type: Boolean, default: false },
      esVideoFinalConcurso: { type: Boolean, default: false },
      estado: {
        type: String,
        enum: ["pendiente", "reproduciendo", "reproducida", "eliminada"],
        default: "pendiente",
      },
      calificaciones: [
        {
          tipo: { type: String, enum: ["usuario", "sistema"], default: "usuario" },
          valor: Number,
          key: String,
          calificacionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Puntaje' },
          calificacion: String,
          createdAt: { type: Date, default: Date.now },
        },
      ],
      cancion: { type: mongoose.Schema.Types.ObjectId, ref: 'Cancion' },
    },
  ],
  colaNormalBackup: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cancion' }],
  currentIndexNormalBackup: Number,

}, { timestamps: true });

module.exports = mongoose.model('Cola', ColaSchema);
