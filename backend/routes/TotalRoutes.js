const express = require("express");
const router = express.Router();

const Favorito = require("../models/Favorito");
const Playlist = require("../models/Playlist");
const Cola = require("../models/Cola");
const createListController = require("../controllers/listController");
const { authenticate } = require("../middleware/authMiddleware");

const favoritoController = createListController(Favorito);
const playlistController = createListController(Playlist);
const colaController = createListController(Cola);

// ---------------- FAVORITOS ----------------
router.post("/favoritos/add", authenticate, favoritoController.addSong);
router.delete("/favoritos/remove", authenticate, favoritoController.removeSong);
router.get("/favoritos/:userId", authenticate, favoritoController.getList);
router.delete(
  "/favoritos/clear/:userId",
  authenticate,
  favoritoController.clearList
);

// ---------------- COLA ----------------

// Agregar canción a la cola
router.post("/cola/add", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { songId, position } = req.body; // posición = currentIndex en frontend

    let colaUsuario = await Cola.findOne({ user: userId });

    if (!colaUsuario) {
      // Si no existe la cola, la creamos
      colaUsuario = await Cola.create({
        user: userId,
        canciones: [songId],
        currentIndex: 0,
      });
    } else {
      // Evitar duplicados
      colaUsuario.canciones = colaUsuario.canciones.filter(
        (c) => c.toString() !== songId
      );

      // 🔥 Insertar en la posición actual (desplazando las demás)
      const insertPos =
        typeof position === "number" && position >= 0
          ? Math.min(position, colaUsuario.canciones.length)
          : colaUsuario.canciones.length;

      colaUsuario.canciones.splice(insertPos, 0, songId);

      // Mantener el índice actual sin moverse
      await colaUsuario.save();
    }

    // Obtener cola actualizada y con populate
    const colaActualizada = await Cola.findOne({ user: userId }).populate(
      "canciones"
    );

    // 🔁 Emitir evento de sincronización vía Socket.IO
    const io = req.app.get("io");
    io.to(userId).emit("colaActualizada", {
      nuevaCola: colaActualizada.canciones,
      indexActual: colaUsuario.currentIndex || 0,
    });

    res.status(201).json({
      message: "Canción agregada en la posición actual",
      cola: colaActualizada.canciones,
      totalCanciones: colaActualizada.canciones.length,
      currentIndex: colaUsuario.currentIndex || 0,
    });
  } catch (err) {
    console.error("Error al agregar canción a la cola:", err);
    res.status(500).json({ error: err.message });
  }
});

// Cambiar índice actual de la cola
router.patch("/cola/current-index", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { index } = req.body;

    const colaUsuario = await Cola.findOneAndUpdate(
      { user: userId },
      { currentIndex: index },
      { new: true }
    ).populate("canciones");

    if (!colaUsuario)
      return res.status(404).json({ error: "Cola no encontrada" });

    // Emitir a todos los sockets del usuario
    const io = req.app.get("io");
    io.to(userId).emit("colaActualizada", {
      nuevaCola: colaUsuario.canciones,
      indexActual: colaUsuario.currentIndex,
    });

    res.json({
      message: "Índice actualizado",
      currentIndex: colaUsuario.currentIndex,
    });
  } catch (err) {
    console.error("Error al actualizar índice:", err);
    res.status(500).json({ error: err.message });
  }
});

// Limpiar toda la cola
router.delete("/cola/remove", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    await Cola.findOneAndDelete({ user: userId });

    const io = req.app.get("io");
    io.to(userId).emit("colaActualizada", {
      nuevaCola: [],
      indexActual: 0,
    });

    res.json({ message: "Cola eliminada" });
  } catch (err) {
    console.error("Error al eliminar cola:", err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- PLAYLISTS ----------------
router.post("/playlist", authenticate, playlistController.createPlaylist);
router.get(
  "/playlist/:userId",
  authenticate,
  playlistController.getUserPlaylists
);
router.get(
  "/playlist/canciones/:playlistId",
  authenticate,
  playlistController.getCancionesDePlaylist
);
router.post(
  "/playlist/:playlistId/addsong",
  authenticate,
  playlistController.addCancionAPlaylist
);
router.post("/playlist/add", authenticate, playlistController.addSong);
router.delete("/playlist/remove", playlistController.removeSong);
router.delete("/playlist/clear/:userId", playlistController.clearList);

module.exports = router;
