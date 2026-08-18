const SolicitudCancion = require('../models/SolicitudCancion');

const getUserId = (req) => req.user?._id || req.user?.id;

const puedeModificarSolicitud = (req, solicitud) => {
  if (req.user?.rol === "admin") return true;
  return String(solicitud.usuario) === String(getUserId(req));
};

// Crear solicitud
exports.crearSolicitud = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ mensaje: "Usuario no autenticado" });
    }

    const nuevaSolicitud = new SolicitudCancion({
      usuario: userId,
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
    const page = Math.max(parseInt(req.query.page, 10) || 0, 0);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 0, 0),
      100,
    );

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [result] = await SolicitudCancion.aggregate([
        {
          $addFields: {
            totalVotos: { $size: { $ifNull: ["$votos", []] } },
          },
        },
        { $sort: { totalVotos: -1, createdAt: -1, _id: -1 } },
        {
          $lookup: {
            from: "usuarios",
            localField: "usuario",
            foreignField: "_id",
            as: "usuario",
            pipeline: [{ $project: { nombre: 1, email: 1 } }],
          },
        },
        {
          $unwind: {
            path: "$usuario",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $facet: {
            solicitudes: [{ $skip: skip }, { $limit: limit }],
            metadata: [{ $count: "total" }],
          },
        },
      ]);
      const total = result?.metadata?.[0]?.total || 0;
      const totalPages = Math.ceil(total / limit);

      return res.status(200).json({
        solicitudes: result?.solicitudes || [],
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      });
    }

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
    const solicitud = await SolicitudCancion.findById(req.params.id);

    if (!solicitud) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    if (!puedeModificarSolicitud(req, solicitud)) {
      return res.status(403).json({ mensaje: "No puedes modificar esta solicitud" });
    }

    solicitud.cantante = req.body.cantante ?? solicitud.cantante;
    solicitud.cancion = req.body.cancion ?? solicitud.cancion;
    const solicitudActualizada = await solicitud.save();

    res.status(200).json(solicitudActualizada);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar la solicitud', error });
  }
};

// Eliminar solicitud
exports.eliminarSolicitud = async (req, res) => {
  try {
    const solicitud = await SolicitudCancion.findById(req.params.id);

    if (!solicitud) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    if (!puedeModificarSolicitud(req, solicitud)) {
      return res.status(403).json({ mensaje: "No puedes eliminar esta solicitud" });
    }

    await SolicitudCancion.deleteOne({ _id: req.params.id });

    res.status(200).json({ mensaje: 'Solicitud eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al eliminar la solicitud', error });
  }
};

// Votar por una solicitud
exports.votarPorSolicitud = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({ mensaje: "Usuario no autenticado" });
    }

    const solicitud = await SolicitudCancion.findOneAndUpdate(
      { _id: req.params.id, votos: { $ne: userId } },
      { $addToSet: { votos: userId } },
      { new: true }
    );

    if (!solicitud) {
      const existe = await SolicitudCancion.exists({ _id: req.params.id });
      if (!existe) {
        return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
      }
      return res.status(400).json({ mensaje: 'Ya votaste por esta canción' });
    }

    res.status(200).json({
      mensaje: 'Voto registrado correctamente',
      totalVotos: solicitud.votos.length
    });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al registrar el voto', error });
  }
};

exports.eliminarTodasSolicitudes = async (req, res) => {
  try {
    console.log("XP1")
    await SolicitudCancion.deleteMany({});
    res.status(200).json({ mensaje: "Todas las solicitudes han sido eliminadas" });
  } catch (error) {
    console.error("Error al eliminar todas las solicitudes:", error);
    res.status(500).json({ mensaje: "Error al eliminar las solicitudes", error });
  }
};
