const Resena = require("../models/Review");

// Crear una reseña
const crearResena = async (req, res) => {
  try {
    const { usuario, cancion, comentario, calificacion } = req.body;

    const nuevaResena = new Resena({
      usuario,
      cancion,
      comentario,
      calificacion,
    });

    await nuevaResena.save();
    res.status(201).json({ message: "Reseña creada", resena: nuevaResena });
  } catch (error) {
    res.status(500).json({ message: "Error al crear la reseña", error });
  }
};

// Obtener todas las reseñas de una canción
const obtenerResenasPorCancion = async (req, res) => {
  try {
    const { cancionId } = req.params;

    const resenas = await Resena.find({ cancion: cancionId })
      .populate("usuario", "nombre")
      .sort({ createdAt: -1 });

    res.status(200).json({ resenas });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener las reseñas", error });
  }
};

// Eliminar una reseña
const eliminarResena = async (req, res) => {
  try {
    const { id } = req.params;
    const resena = await Resena.findById(id);

    if (!resena) {
      return res.status(404).json({ message: "Reseña no encontrada" });
    }

    await Resena.findByIdAndDelete(id);
    res.status(200).json({ message: "Reseña eliminada exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar la reseña", error });
  }
};

module.exports = {
  crearResena,
  obtenerResenasPorCancion,
  eliminarResena,
};
