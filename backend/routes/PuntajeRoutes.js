const express = require("express");
const router = express.Router();
const Puntaje = require("../models/Puntaje");

const normalizarPuntaje = (puntaje) => {
  const data = puntaje?.toObject ? puntaje.toObject() : puntaje;
  if (!data) return data;

  return {
    ...data,
    calificacion: data.calificacion || data.titulo || "",
  };
};

// ---------------------------
// ✅ Crear puntaje
// ---------------------------
router.post("/puntaje/", async (req, res) => {
  try {
    const { calificacion, titulo, videoUrl, imagenUrl, weight, key } = req.body;

    const nuevoPuntaje = new Puntaje({
      calificacion: calificacion || titulo,
      videoUrl,
      imagenUrl,
      weight,
      key,
    });

    const guardado = await nuevoPuntaje.save();
    res.status(201).json(normalizarPuntaje(guardado));
  } catch (error) {
    res.status(500).json({ message: "Error al crear el puntaje", error });
  }
});

// ---------------------------
// ✅ Obtener todos los puntajes
// ---------------------------
router.get("/puntaje/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 0, 0);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 0, 0),
      100,
    );

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [puntajes, total] = await Promise.all([
        Puntaje.find()
          .sort({ createdAt: -1, _id: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Puntaje.countDocuments(),
      ]);
      const totalPages = Math.ceil(total / limit);

      return res.json({
        puntajes: puntajes.map(normalizarPuntaje),
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      });
    }

    const puntajes = await Puntaje.find().sort({ createdAt: -1 }).lean();
    res.json(puntajes.map(normalizarPuntaje));
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los puntajes", error });
  }
});

// ---------------------------
// ✅ Obtener puntaje por ID
// ---------------------------
router.get("/puntaje/:id", async (req, res) => {
  try {
    const puntaje = await Puntaje.findById(req.params.id).lean();
    if (!puntaje) {
      return res.status(404).json({ message: "Puntaje no encontrado" });
    }
    res.json(normalizarPuntaje(puntaje));
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el puntaje", error });
  }
});

// ---------------------------
// ✅ Actualizar puntaje
// ---------------------------
router.put("/puntaje/:id", async (req, res) => {
  try {
    const { calificacion, titulo, videoUrl, imagenUrl, weight, key } = req.body;

    const actualizado = await Puntaje.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          calificacion: calificacion || titulo,
          videoUrl,
          imagenUrl,
          weight,
          key,
        },
        $unset: { titulo: "" },
      },
      { new: true }
    );

    if (!actualizado) {
      return res.status(404).json({ message: "Puntaje no encontrado" });
    }

    res.json(normalizarPuntaje(actualizado));
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el puntaje", error });
  }
});

// ---------------------------
// ✅ Eliminar puntaje
// ---------------------------
router.delete("/puntaje/:id", async (req, res) => {
  try {
    const eliminado = await Puntaje.findByIdAndDelete(req.params.id);
    if (!eliminado) {
      return res.status(404).json({ message: "Puntaje no encontrado" });
    }
    res.json({ message: "Puntaje eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el puntaje", error });
  }
});

module.exports = router;
