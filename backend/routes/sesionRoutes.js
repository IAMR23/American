// routes/sesionRoutes.js
const express = require("express");
const router = express.Router();
const Sesion = require("../models/Sesion");

const generarCodigo = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

router.post("/crear", async (req, res) => {
  try {
    const code = generarCodigo();

    const sesion = await Sesion.create({
      code,
      host: req.user?.id, // si usas auth
    });

    res.json({
      code,
      url: `https://american-karaoke.com/join?session=${code}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;