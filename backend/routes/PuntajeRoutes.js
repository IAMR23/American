const express = require("express");
const router = express.Router();
const Puntaje = require("../models/Puntaje"); 

// ✅ Crear puntaje
router.post("/puntaje/", async (req, res) => {
  try {
    const { titulo , videoUrl , imagenUrl, weight } = req.body;
    const nuevoPuntaje = new Puntaje({ titulo , videoUrl , imagenUrl, weight });
    const guardado = await nuevoPuntaje.save();
    res.status(201).json(guardado);
  } catch (error) {
    res.status(500).json({ message: "Error al crear el puntaje", error });
  }
});

// ✅ Obtener todos los puntajes
router.get("/puntaje/", async (req, res) => {
  try {
    const puntajes = await Puntaje.find().sort({ createdAt: -1 });
    res.json(puntajes);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener los puntajes", error });
  }
});

// ✅ Obtener un puntaje por ID
router.get("/puntaje/:id", async (req, res) => {
  try {
    const puntaje = await Puntaje.findById(req.params.id);
    if (!puntaje) return res.status(404).json({ message: "Puntaje no encontrado" });
    res.json(puntaje);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el puntaje", error });
  }
});

// ✅ Actualizar puntaje
router.put("/puntaje/:id", async (req, res) => {
  try {
    const { titulo , videoUrl , imagenUrl, weight } = req.body;
    const actualizado = await Puntaje.findByIdAndUpdate(
      req.params.id,
      { titulo , videoUrl , imagenUrl, weight },
      { new: true }
    );
    if (!actualizado)
      return res.status(404).json({ message: "Puntaje no encontrado" });
    res.json(actualizado);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar el puntaje", error });
  }
});

// ✅ Eliminar puntaje
router.delete("/puntaje/:id", async (req, res) => {
  try {
    const eliminado = await Puntaje.findByIdAndDelete(req.params.id);
    if (!eliminado)
      return res.status(404).json({ message: "Puntaje no encontrado" });
    res.json({ message: "Puntaje eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al eliminar el puntaje", error });
  }
});

module.exports = router;
