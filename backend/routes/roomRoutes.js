// routes/room.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const Room = require("../models/Room");

const router = express.Router();

router.post("/create-room", async (req, res) => {
  try {
    const { user } = req.body;

    if (!user) {
      return res.status(400).json({ error: "User requerido" });
    }

    const roomId = uuidv4();

    const room = new Room({
      roomId,
      host: user,
    });

    await room.save();

    res.json({
      roomId,
      host: user,
    });
  } catch (error) {
    console.error("Error creando sala:", error);
    res.status(500).json({ error: "Error creando sala" });
  }
});

module.exports = router;