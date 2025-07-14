const Anuncio = require("../models/Anuncio");
const { validationResult } = require("express-validator");

// Crear un anuncio
const crearAnuncio = async (req, res) => {
  const { titulo, contenido, visible } = req.body;
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  try {
    const nuevoAnuncio = new Anuncio({
      titulo,
      contenido,
      visible,
      creado_por: req.user._id, // Se asume autenticación con usuario (admin)
    });

    await nuevoAnuncio.save();
    res.status(201).json({ mensaje: "Anuncio creado exitosamente", anuncio: nuevoAnuncio });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al crear el anuncio", error });
  }
};

// Obtener todos los anuncios (opcionalmente solo visibles)
const obtenerAnuncios = async (req, res) => {
  try {
    const anuncios = await Anuncio.find().sort({ createdAt: -1 });
    res.status(200).json(anuncios);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener los anuncios", error });
  }
};



const obtenerAnunciosVisibles = async (req, res) => {
  try {
    const anuncios = await Anuncio.find({visible : true}).sort({ createdAt: -1 });
    res.status(200).json(anuncios);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener los anuncios", error });
  }
};


// Obtener todos los anuncios (admin: visibles e invisibles)
const obtenerTodosAnuncios = async (req, res) => {
  try {
    const anuncios = await Anuncio.find().sort({ createdAt: -1 }).populate("creado_por", "nombre email");
    res.status(200).json(anuncios);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener los anuncios", error });
  }
};

// Actualizar un anuncio
const actualizarAnuncio = async (req, res) => {
  const { id } = req.params;
  const { titulo, contenido, visible } = req.body;

  try {
    const anuncio = await Anuncio.findById(id);
    if (!anuncio) {
      return res.status(404).json({ mensaje: "Anuncio no encontrado" });
    }

    anuncio.titulo = titulo || anuncio.titulo;
    anuncio.contenido = contenido || anuncio.contenido;
    if (typeof visible === "boolean") anuncio.visible = visible;

    await anuncio.save();
    res.status(200).json({ mensaje: "Anuncio actualizado", anuncio });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al actualizar el anuncio", error });
  }
};

// Eliminar un anuncio
const eliminarAnuncio = async (req, res) => {
  const { id } = req.params;

  try {
    const anuncio = await Anuncio.findByIdAndDelete(id);
    if (!anuncio) {
      return res.status(404).json({ mensaje: "Anuncio no encontrado" });
    }

    res.status(200).json({ mensaje: "Anuncio eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar el anuncio", error });
  }
};

module.exports = {
  crearAnuncio,
  obtenerAnuncios,
  obtenerAnunciosVisibles,
  obtenerTodosAnuncios,
  actualizarAnuncio,
  eliminarAnuncio,
};
