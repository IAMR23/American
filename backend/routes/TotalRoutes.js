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
    const { songId, roomId, position } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "roomId requerido" });
    }

    let cola = await Cola.findOne({ roomId });

    // 🟢 Crear cola si no existe
    if (!cola) {
      cola = await Cola.create({
        roomId,
     //   user: userId, // opcional (host o quien agrega)
        canciones: [songId],
        currentIndex: 0,
      });
    } else {
      let canciones = cola.canciones
        .map((c) => c.toString())
        .filter((c) => c !== songId);

      const insertPos =
        typeof position === "number" && position >= 0
          ? Math.min(position, canciones.length)
          : canciones.length;

      canciones.splice(insertPos, 0, songId);

      await Cola.updateOne(
        { roomId },
        {
          $set: {
            canciones,
          },
        }
      );
    }

    const colaActualizada = await Cola.findOne({ roomId }).populate("canciones");
    // 🔥 SOCKET POR SALA (NO por user)
    const io = req.app.get("io");
    io.to(roomId).emit("colaActualizada", {
      nuevaCola: colaActualizada.canciones,
      indexActual: colaActualizada.currentIndex || 0,
    });

    console.log(`Canción ${songId} agregada a la cola de la sala ${roomId}`);
    res.status(201).json({
      message: "Canción agregada",
      cola: colaActualizada.canciones,
      totalCanciones: colaActualizada.canciones.length,
      currentIndex: colaActualizada.currentIndex || 0,
    });

  } catch (err) {
    console.error("Error al agregar canción a la cola:", err);
    res.status(500).json({ error: err.message });
  }
});

 
router.post("/cola/add2", async (req, res) => {
  try {
    const { songId, roomId, position } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "roomId requerido" });
    }

    let cola = await Cola.findOne({ roomId });

    // 🟢 Crear cola si no existe
    if (!cola) {
      cola = await Cola.create({
        roomId,
     //   user: userId, // opcional (host o quien agrega)
        canciones: [songId],
        currentIndex: 0,
      });
    } else {
      let canciones = cola.canciones
        .map((c) => c.toString())
        .filter((c) => c !== songId);

      const insertPos =
        typeof position === "number" && position >= 0
          ? Math.min(position, canciones.length)
          : canciones.length;

      canciones.splice(insertPos, 0, songId);

      await Cola.updateOne(
        { roomId },
        {
          $set: {
            canciones,
          },
        }
      );
    }

    const colaActualizada = await Cola.findOne({ roomId }).populate("canciones");
    // 🔥 SOCKET POR SALA (NO por user)
    const io = req.app.get("io");
    io.to(roomId).emit("colaActualizada", {
      nuevaCola: colaActualizada.canciones,
      indexActual: colaActualizada.currentIndex || 0,
    });

    console.log(`Canción ${songId} agregada a la cola de la sala ${roomId}`);
    res.status(201).json({
      message: "Canción agregada",
      cola: colaActualizada.canciones,
      totalCanciones: colaActualizada.canciones.length,
      currentIndex: colaActualizada.currentIndex || 0,
    });

  } catch (err) {
    console.error("Error al agregar canción a la cola:", err);
    res.status(500).json({ error: err.message });
  }
});


router.post("/cola/play-now", async (req, res) => {
  try {
    const { songId, roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "roomId requerido" });
    }

    let cola = await Cola.findOne({ roomId });

    // Crear cola si no existe
    if (!cola) {
      cola = await Cola.create({
        roomId,
        canciones: [songId],
        currentIndex: 0,
      });
    } else {
      let canciones = cola.canciones
        .map((c) => c.toString())
        .filter((c) => c !== songId);

      // 👉 Insertar EXACTAMENTE en el índice actual
      const insertPos = cola.currentIndex || 0;

      canciones.splice(insertPos, 0, songId);

      await Cola.updateOne(
        { roomId },
        {
          $set: {
            canciones,
            currentIndex: insertPos, // 🔥 CLAVE
          },
        }
      );
    }

    const colaActualizada = await Cola.findOne({ roomId }).populate("canciones");

    const io = req.app.get("io");

    io.to(roomId).emit("colaActualizada", {
      nuevaCola: colaActualizada.canciones,
      indexActual: colaActualizada.currentIndex,
    });

    console.log(`PLAY NOW -> ${songId} en sala ${roomId}`);

    res.status(201).json({
      message: "Reproduciendo ahora",
      cola: colaActualizada.canciones,
      currentIndex: colaActualizada.currentIndex,
    });

  } catch (err) {
    console.error("Error en play-now:", err);
    res.status(500).json({ error: err.message });
  }
});



router.delete("/cola/remove", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    await Cola.deleteMany({ user: userId });

    const io = req.app.get("io");

    io.to(userId).emit("colaActualizada", {
      nuevaCola: [],
      indexActual: 0,
    });

    res.json({ message: "Cola eliminada correctamente" });

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
