const { validationResult } = require("express-validator");
const Genero = require("../models/Genero");

// Crear un nuevo género
async function createGenero(req, res) {
  const { nombre } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const existingGenero = await Genero.findOne({ nombre });
    if (existingGenero) {
      return res.status(400).json({ message: "El género ya existe" });
    }

    const newGenero = new Genero({ nombre });
    await newGenero.save();

    res.status(201).json({
      message: "Género creado exitosamente",
      genero: newGenero,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al crear el género", error });
  }
}


async function getGenero(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 0, 0);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 0, 0),
      100,
    );

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [genero, total] = await Promise.all([
        Genero.find().sort({ nombre: 1, _id: 1 }).skip(skip).limit(limit),
        Genero.countDocuments(),
      ]);
      const totalPages = Math.ceil(total / limit);

      return res.status(200).json({
        genero,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      });
    }

    const genero = await Genero.find().sort({ nombre: 1, _id: 1 });
    if (!genero) {
      return res.status(404).json({ message: "Género no encontrado" });
    }

    res.status(200).json({ genero });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el género", error });
  }
}

async function getGeneroById(req, res) {
  const { id } = req.params;

  try {
    const genero = await Genero.findById(id);
    if (!genero) {
      return res.status(404).json({ message: "Género no encontrado" });
    }

    res.status(200).json({ genero });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el género", error });
  }
}

// Actualizar un género
async function updateGenero(req, res) {
  const { id } = req.params;
  const { nombre } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const genero = await Genero.findById(id);
    if (!genero) {
      return res.status(404).json({ message: "Género no encontrado" });
    }

    if (nombre && nombre !== genero.nombre) {
      const existingGenero = await Genero.findOne({ nombre });
      if (existingGenero) {
        return res
          .status(400)
          .json({ message: "El nombre ya está en uso por otro género" });
      }
      genero.nombre = nombre;
    }


    await genero.save();

    res.status(200).json({
      message: "Género actualizado exitosamente",
      genero,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el género", error });
  }
}

// Eliminar un género
async function deleteGenero(req, res) {
  const { id } = req.params;

  try {
    const genero = await Genero.findById(id);
    if (!genero) {
      return res.status(404).json({ message: "Género no encontrado" });
    }

    await Genero.findByIdAndDelete(id);
    res.status(200).json({ message: "Género eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el género", error });
  }
}

module.exports = {
  createGenero,
  getGeneroById,
  getGenero , 
  updateGenero,
  deleteGenero,
};
