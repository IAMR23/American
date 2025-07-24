const axios = require('axios');
const Publicacion = require('../models/Publicacion');



exports.crearPublicacion = async (req, res) => {
  try {
    const { titulo, descripcion, tipo, mediaUrl  , tipoMedia} = req.body;
    const nueva = new Publicacion({ titulo, descripcion, tipo, mediaUrl , tipoMedia });
    await nueva.save();
    res.status(201).json(nueva);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.obtenerPublicaciones = async (req, res) => {
  try {
    const publicaciones = await Publicacion.find();
    res.json(publicaciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obtenerPublicacion = async (req, res) => {
  try {
    const publicacion = await Publicacion.findById(req.params.id);
    if (!publicacion) return res.status(404).json({ error: 'No encontrada' });
    res.json(publicacion);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.actualizarPublicacion = async (req, res) => {
  try {
    const { titulo, descripcion, tipo, mediaUrl  , tipoMedia} = req.body;

    const actualizada = await Publicacion.findByIdAndUpdate(
      req.params.id,
      { titulo, descripcion, tipo, mediaUrl  , tipoMedia },
      { new: true }
    );
    if (!actualizada) return res.status(404).json({ error: 'No encontrada' });
    res.json(actualizada);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.eliminarPublicacion = async (req, res) => {
  try {
    const eliminada = await Publicacion.findByIdAndDelete(req.params.id);
    if (!eliminada) return res.status(404).json({ error: 'No encontrada' });
    res.json({ mensaje: 'Eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.obtenerPublicacionesVideo = async (req, res) => {
  try {
    const publicaciones = await Publicacion.find({ tipoMedia: "video" });
    res.json(publicaciones);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
