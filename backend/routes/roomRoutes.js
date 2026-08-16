// routes/room.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const Room = require("../models/Room");
const {
  authenticate,
  verificarSuscripcionActiva,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create-room", authenticate, verificarSuscripcionActiva, async (req, res) => {
  try {
    const roomId = uuidv4();

    const room = new Room({
      roomId,
      host: req.user._id,
    });

    await room.save();

    res.json({
      roomId,
      host: req.user._id,
    });
  } catch (error) {
    console.error("Error creando sala:", error);
    res.status(500).json({ error: "Error creando sala" });
  }
});

module.exports = router;
