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

// 🚀 aquí personalizamos add para emitir evento

router.post("/cola/add", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { songId } = req.body;

    // Buscar si ya existe una cola para este usuario
    let colaUsuario = await Cola.findOne({ user: userId });

    if (!colaUsuario) {
      // Si no existe, crear una nueva cola
      colaUsuario = await Cola.create({
        user: userId,
        canciones: [songId]
      });
    } else {
      // Si existe, agregar la canción al array
      colaUsuario.canciones.push(songId);
      await colaUsuario.save();
    }

    // Traer la cola actualizada CON la información completa de las canciones
    const colaActualizada = await Cola.findOne({ user: userId })
      .populate('canciones') // Popula todas las canciones del array
      .populate('user'); // También popula la info del usuario si la necesitas


    // Emitir a todos los clientes conectados a la misma sala
    const io = req.app.get("io");
    io.to(userId).emit("colaActualizada", { 
      nuevaCola: colaActualizada.canciones, // Solo enviar el array de canciones
      indexActual: 0 
    });

    res.status(201).json({
      message: "Canción agregada a la cola",
      cola: colaActualizada.canciones,
      totalCanciones: colaActualizada.canciones.length
    });

  } catch (err) {
    console.error("Error al agregar canción a la cola:", err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/cola/remove", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Elimina la cola del usuario
    const eliminada = await Cola.findOneAndDelete({ user: userId });

    if (eliminada) {
      // Emitir evento a todos los sockets del usuario
      const io = req.app.get("io");
      io.to(userId).emit("colaEliminada", eliminada);
    }

    res.json({ message: "Cola eliminada correctamente", eliminada });
  } catch (err) {
    console.error("Error al eliminar la cola:", err);
    res.status(500).json({ error: err.message });
  }
});


router.get("/cola/:userId", async (req, res) => {
  try {
    const cola = await Cola.find({ userId: req.params.userId });
    res.json(cola);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/cola/clear/:userId", async (req, res) => {
  try {
    const result = await Cola.deleteMany({ userId: req.params.userId });

    // Emitir evento de limpieza
    const io = req.app.get("io");
    io.to(req.params.userId).emit("colaLimpiada");

    res.json({ cleared: result.deletedCount });
  } catch (err) {
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
