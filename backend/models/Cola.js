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
      estado: {
        type: String,
        enum: ["pendiente", "reproduciendo", "reproducida", "eliminada"],
        default: "pendiente",
      },
      cancion: { type: mongoose.Schema.Types.ObjectId, ref: 'Cancion' },
    },
  ],
  colaNormalBackup: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cancion' }],
  currentIndexNormalBackup: Number,

}, { timestamps: true });

module.exports = mongoose.model('Cola', ColaSchema);
