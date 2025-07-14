const SolicitudCancion = require('../models/SolicitudCancion');

// Crear solicitud
exports.crearSolicitud = async (req, res) => {
  try {
    const nuevaSolicitud = new SolicitudCancion({
      usuario: req.body.usuario,
      comentario: req.body.comentario,
    });

    const solicitudGuardada = await nuevaSolicitud.save();
    res.status(201).json(solicitudGuardada);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear la solicitud', error });
  }
};

// Obtener todas las solicitudes

// Obtener todas las solicitudes
exports.obtenerSolicitudes = async (req, res) => {
  try {
    const solicitudes = await SolicitudCancion.find()
      .populate('usuario', 'nombre email') // <-- Esta línea es clave
      .sort({ createdAt: -1 });

    res.status(200).json(solicitudes);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener las solicitudes', error });
  }
};


// Obtener solicitud por ID
exports.obtenerSolicitudPorId = async (req, res) => {
  try {
    const solicitud = await SolicitudCancion.findById(req.params.id).populate('usuario');
    if (!solicitud) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }
    res.status(200).json(solicitud);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener la solicitud', error });
  }
};

// Actualizar solicitud
exports.actualizarSolicitud = async (req, res) => {
  try {
    const solicitudActualizada = await SolicitudCancion.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!solicitudActualizada) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    res.status(200).json(solicitudActualizada);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar la solicitud', error });
  }
};

// Eliminar solicitud
exports.eliminarSolicitud = async (req, res) => {
  try {
    const solicitudEliminada = await SolicitudCancion.findByIdAndDelete(req.params.id);

    if (!solicitudEliminada) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    res.status(200).json({ mensaje: 'Solicitud eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar la solicitud', error });
  }
};
