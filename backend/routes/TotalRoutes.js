const express = require("express");
const router = express.Router();

const Favorito = require("../models/Favorito");
const Playlist = require("../models/Playlist");
const Cola = require("../models/Cola");
const createListController = require("../controllers/listController");
const { authenticate } = require("../middleware/authMiddleware");
const Cancion = require("../models/Cancion");

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

router.post("/cola/without/aut/add", async (req, res) => {
  try {
    const { songId, position } = req.body;

    // Buscamos una única cola global (puede usarse un campo especial o ID fijo)
    let colaGlobal = await Cola.findOne({ user: null });

    if (!colaGlobal) {
      // Si no existe la cola global, la creamos
      colaGlobal = await Cola.create({
        user: null,
        canciones: [songId],
        currentIndex: 0,
      });
    } else {
      // Evitar duplicados
      colaGlobal.canciones = colaGlobal.canciones.filter(
        (c) => c.toString() !== songId
      );

      // Insertar canción en la posición indicada o al final
      const insertPos =
        typeof position === "number" && position >= 0
          ? Math.min(position, colaGlobal.canciones.length)
          : colaGlobal.canciones.length;

      colaGlobal.canciones.splice(insertPos, 0, songId);

      await colaGlobal.save();
    }

    // Obtener la cola con populate
    const colaActualizada = await Cola.findOne({ user: null }).populate(
      "canciones"
    );

    // 🔁 Emitir evento global (opcional)
    const io = req.app.get("io");
    io.emit("colaActualizadaGlobal", {
      nuevaCola: colaActualizada.canciones,
      indexActual: colaGlobal.currentIndex || 0,
    });

    res.status(201).json({
      message: "Canción agregada a la cola global",
      cola: colaActualizada.canciones,
      totalCanciones: colaActualizada.canciones.length,
      currentIndex: colaGlobal.currentIndex || 0,
    });
  } catch (err) {
    console.error("Error al agregar canción a la cola global:", err);
    res.status(500).json({ error: err.message });
  }
});

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
// router.delete("/playlist/remove", playlistController.removeSong);
// router.delete("/playlist/clear/:userId", playlistController.clearList);

router.delete(
  "/playlist/:playlistId",
  authenticate,
  playlistController.deletePlaylist
);

module.exports = router;
