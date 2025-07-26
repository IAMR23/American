const SolicitudCancion = require('../models/SolicitudCancion');

// Crear solicitud
exports.crearSolicitud = async (req, res) => {
  try {
    const nuevaSolicitud = new SolicitudCancion({
      usuario: req.body.usuario,
      cantante: req.body.cantante,
      cancion: req.body.cancion
    });

    const solicitudGuardada = await nuevaSolicitud.save();
    res.status(201).json(solicitudGuardada);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear la solicitud', error });
  }
};

// Obtener todas las solicitudes, ordenadas por votos
exports.obtenerSolicitudes = async (req, res) => {
  try {
    const solicitudes = await SolicitudCancion.find()
      .populate('usuario', 'nombre email');

    const solicitudesConVotos = solicitudes.map(s => ({
      ...s.toObject(),
      totalVotos: s.votos.length
    }));

    solicitudesConVotos.sort((a, b) => b.totalVotos - a.totalVotos);

    res.status(200).json(solicitudesConVotos);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener las solicitudes', error });
  }
};

// Obtener una solicitud por ID
exports.obtenerSolicitudPorId = async (req, res) => {
  try {
    const solicitud = await SolicitudCancion.findById(req.params.id)
      .populate('usuario', 'nombre email');

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
      {
        cantante: req.body.cantante,
        cancion: req.body.cancion
      },
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

// Votar por una solicitud
exports.votarPorSolicitud = async (req, res) => {
  try {
    const solicitud = await SolicitudCancion.findById(req.params.id);

    if (!solicitud) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    const userId = req.body.usuario;

    if (solicitud.votos.includes(userId)) {
      return res.status(400).json({ mensaje: 'Ya votaste por esta canción' });
    }

    solicitud.votos.push(userId);
    await solicitud.save();

    res.status(200).json({
      mensaje: 'Voto registrado correctamente',
      totalVotos: solicitud.votos.length
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al registrar el voto', error });
  }
};
