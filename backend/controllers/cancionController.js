const Cancion = require("../models/Cancion");
const mongoose = require("mongoose");

const crearCancion = async (req, res) => {
  try {
    const {
      numero,
      titulo,
      artista,
      generos,
      videoUrl,
      imagenUrl,
      visiblePrincipal,
      videoDefault,
    } = req.body;

    const nuevaCancion = new Cancion({
      numero,
      titulo,
      artista,
      generos,
      videoUrl,
      imagenUrl,
      visiblePrincipal: visiblePrincipal || false,
      videoDefault,
    });

    await nuevaCancion.save();
    res.status(201).json(nuevaCancion);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const listarCancionesNumero = async (req, res) => {
  try {
    const canciones = await Cancion.find()
      .sort({ numero: 1 }) // Orden ascendente por número
      .populate("generos", "nombre");

    res.json(canciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const listarCanciones = async (req, res) => {
  try {
    const canciones = await Cancion.find()
      .sort({ titulo: 1 })
      .populate("generos", "nombre"); // 1 para ascendente
    res.json(canciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const listarCancionesArtista = async (req, res) => {
  try {
    const canciones = await Cancion.find()
      .sort({ artista: 1 })
      .populate("generos", "nombre"); // 1 para ascendente
    res.json(canciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const obtenerCancion = async (req, res) => {
  try {
    const cancion = await Cancion.findById(req.params.id).populate("generos");
    if (!cancion)
      return res.status(404).json({ error: "Canción no encontrada" });
    res.json(cancion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const actualizarCancion = async (req, res) => {
  try {
    const {
      numero,
      titulo,
      artista,
      generos,
      videoUrl,
      imagenUrl,
      visiblePrincipal,
      videoDefault,
    } = req.body;

    const cancionActualizada = await Cancion.findByIdAndUpdate(
      req.params.id,
      {
        numero,
        titulo,
        artista,
        generos,
        videoUrl,
        imagenUrl,
        visiblePrincipal,
        videoDefault,
      },
      { new: true },
    );

    if (!cancionActualizada)
      return res.status(404).json({ error: "Canción no encontrada" });

    res.json(cancionActualizada);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getVideoDefault = async (req, res) => {
  try {
    const canciones = await Cancion.aggregate([
      { $match: { videoDefault: true } },
      { $sample: { size: 20 } } 
    ]);

    // Populate manual (aggregate no soporta populate directo)
    await Cancion.populate(canciones, { path: "generos" });

    res.json(canciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const eliminarCancion = async (req, res) => {
  try {
    const cancionEliminada = await Cancion.findByIdAndDelete(req.params.id);
    if (!cancionEliminada)
      return res.status(404).json({ error: "Canción no encontrada" });

    res.json({ message: "Canción eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
//   try {
//     const { busqueda, ordenFecha } = req.query;

//     const pipeline = [
//       {
//         $lookup: {
//           from: "generos",
//           localField: "generos",
//           foreignField: "_id",
//           as: "generos",
//         },
//       },
//     ];

//     if (busqueda) {
//       const regex = new RegExp(busqueda, "i");
//       pipeline.push({
//         $match: {
//           $or: [
//             { titulo: { $regex: regex } },
//             { artista: { $regex: regex } },
//             { "generos.nombre": { $regex: regex } },
//           ],
//         },
//       });
//     }

//     pipeline.push({
//       $sort: { createdAt: ordenFecha === "asc" ? 1 : -1 },
//     });

//     const canciones = await mongoose.model("Cancion").aggregate(pipeline);

//     res.status(200).json({ canciones });
//   } catch (error) {
//     console.error("Error en filtro por búsqueda:", error);
//     res.status(500).json({ message: "Error al filtrar canciones", error });
//   }
// };

const filtrarCanciones = async (req, res) => {
  try {
    const { busqueda, filtro, videoDefault } = req.query;

    const pipeline = [];

    // 🔥 MATCH PRIMERO (para no romper coincidencias)
    if (busqueda && filtro) {
      const regex = new RegExp(busqueda, "i");

      const campos = {
        titulo: { titulo: regex },
        artista: { artista: regex },
        generos: {}, // este se hace después del lookup
        numero: {
          $expr: {
            $regexMatch: {
              input: { $toString: "$numero" },
              regex: regex,
            },
          },
        },
      };

      // Solo meter $match si no es generos
      if (filtro !== "generos" && campos[filtro]) {
        pipeline.push({ $match: campos[filtro] });
      }
    }

    // Lookup de géneros
    pipeline.push({
      $lookup: {
        from: "generos",
        localField: "generos",
        foreignField: "_id",
        as: "generos",
      },
    });

    // Si el filtro es por género, hacemos match ahora sí
    if (filtro === "generos" && busqueda) {
      const regex = new RegExp(busqueda, "i");
      pipeline.push({
        $match: { "generos.nombre": regex },
      });
    }

    pipeline.push({
      $unwind: {
        path: "$generos",
        preserveNullAndEmptyArrays: true,
      },
    });

    // Video default si aplica
    if (videoDefault === "true") {
      pipeline.push({ $match: { videoDefault: true } });
    }

    const canciones = await Cancion.aggregate(pipeline);

    res.json({ canciones });
  } catch (error) {
    console.error("Error al filtrar canciones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

const getCancionesPaginadas = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const busqueda = req.query.busqueda || "";
  const ordenFecha = req.query.ordenFecha === "asc" ? 1 : -1;

  const query = {
    $or: [
      { titulo: { $regex: busqueda, $options: "i" } },
      { artista: { $regex: busqueda, $options: "i" } },
    ],
  };

  try {
    const canciones = await Cancion.find(query)
      .populate("generos")
      .sort({ createdAt: ordenFecha })
      .skip(skip)
      .limit(limit);

    const total = await Cancion.countDocuments(query);

    res.json({
      canciones,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error al buscar canciones:", error);
    res.status(500).json({ error: "Error al buscar canciones" });
  }
};

// Controlador para canciones visibles en principal
const listarCancionesVisibles = async (req, res) => {
  try {
    const cancionesVisibles = await Cancion.find({
      visiblePrincipal: true,
    }).populate("generos");
    res.json(cancionesVisibles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Listar canciones por últimas subidas
const listarCancionesUltimas = async (req, res) => {
  try {
    const canciones = await Cancion.find()
      .sort({ createdAt: -1 }) // -1 para descendente (más recientes primero)
      .populate("generos", "nombre"); // opcional: traer solo el nombre del género

    res.json(canciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  crearCancion,
  listarCanciones,
  obtenerCancion,
  actualizarCancion,
  eliminarCancion,
  filtrarCanciones,
  getCancionesPaginadas,
  listarCancionesVisibles,
  listarCancionesArtista,
  listarCancionesNumero,
  listarCancionesUltimas,
  getVideoDefault,
};
