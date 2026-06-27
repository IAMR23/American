const express = require("express");
const router = express.Router();

const Favorito = require("../models/Favorito");
const Playlist = require("../models/Playlist");
const Cola = require("../models/Cola");
const createListController = require("../controllers/listController");
const { authenticate } = require("../middleware/authMiddleware");
const Cancion = require("../models/Cancion");
const { generarColaModoMesa } = require("../services/modoMesaService");
const { generarColaModoConcurso } = require("../services/modoConcursoService");

const favoritoController = createListController(Favorito);
const playlistController = createListController(Playlist);
const colaController = createListController(Cola);

const emitirColaActualizada = async (req, roomId) => {
  const colaActualizada = await Cola.findOne({ roomId }).populate("canciones");
  const io = req.app.get("io");

  io.to(roomId).emit("colaActualizada", {
    nuevaCola: colaActualizada?.canciones || [],
    indexActual: colaActualizada?.currentIndex || 0,
    modoMesaActivo: Boolean(colaActualizada?.modoMesaActivo),
    modoMesaItems: colaActualizada?.modoMesaItems || [],
    modoConcursoActivo: Boolean(colaActualizada?.modoConcursoActivo),
    modoConcursoFinalizado: Boolean(colaActualizada?.modoConcursoFinalizado),
    concursoItems: colaActualizada?.concursoItems || [],
  });

  return colaActualizada;
};

const getCancionesConcursoActivas = (items = []) =>
  items
    .filter((item) => item.estado !== "eliminada" && item.estado !== "reproducida")
    .map((item) => item.cancion);

const crearItemsEspecialesConcurso = (canciones = [], tipo = "inicial") =>
  canciones.map((cancion, index) => {
    const esInicial = tipo === "inicial";

    return {
      participanteId: esInicial
        ? `default-concurso-${index}`
        : `final-concurso-${index}`,
      participanteNombre: esInicial
        ? "Video inicial concurso"
        : "Video final concurso",
      participanteIndex: -1,
      cancionIndex: index,
      esVideoDefaultConcurso: esInicial,
      esVideoFinalConcurso: !esInicial,
      estado: "pendiente",
      cancion: cancion._id,
    };
  });

const getActiveIndexFromItems = (items = [], fallback = 0) => {
  const activeItems = items.filter(
    (item) => item.estado !== "eliminada" && item.estado !== "reproducida",
  );
  const reproduciendoIndex = activeItems.findIndex(
    (item) => item.estado === "reproduciendo",
  );

  if (reproduciendoIndex >= 0) return reproduciendoIndex;

  const pendienteIndex = activeItems.findIndex(
    (item) => item.estado === "pendiente",
  );

  if (pendienteIndex >= 0) return pendienteIndex;

  return Math.min(Math.max(Number(fallback) || 0, 0), Math.max(activeItems.length - 1, 0));
};

const bloquearCambiosSiConcursoActivo = async (roomId, res) => {
  const query = roomId ? { roomId, modoConcursoActivo: true } : { modoConcursoActivo: true };
  const concursoActivo = await Cola.exists(query);

  if (!concursoActivo) return false;

  res.status(409).json({
    error: "No se pueden agregar canciones mientras el Concurso esta activo",
  });
  return true;
};

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
    if (await bloquearCambiosSiConcursoActivo(null, res)) return;

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


router.post("/cola/modo-mesa/activar", async (req, res) => {
  try {
    const { roomId, mesas } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "roomId requerido" });
    }

    if (!Array.isArray(mesas)) {
      return res.status(400).json({ error: "mesas debe ser un arreglo" });
    }

    const colaModoMesa = generarColaModoMesa(mesas);
    const videosDefaultMesas = await Cancion.find({
      videoDefaultMesas: true,
      videoUrl: { $exists: true, $ne: "" },
    })
      .sort({ numero: 1, _id: 1 })
      .select("_id");
    const itemsDefaultMesas = videosDefaultMesas.map((cancion, index) => ({
      mesaNumero: 0,
      mesaNombre: "Video inicial mesas",
      participanteNombre: "Mesas",
      participanteIndex: -1,
      cancionIndex: index,
      esVideoDefaultMesas: true,
      cancion: cancion._id,
    }));
    const canciones = [
      ...videosDefaultMesas.map((cancion) => cancion._id),
      ...colaModoMesa.map((item) => item.cancionId),
    ];

    if (!canciones.length) {
      return res.status(400).json({
        error: "No hay canciones asignadas a participantes de mesas",
      });
    }

    const colaExistente = await Cola.findOne({ roomId });
    const backupCanciones =
      colaExistente?.modoMesaActivo || colaExistente?.modoConcursoActivo
      ? colaExistente.colaNormalBackup || []
      : colaExistente?.canciones || [];
    const backupCurrentIndex =
      colaExistente?.modoMesaActivo || colaExistente?.modoConcursoActivo
      ? colaExistente.currentIndexNormalBackup || 0
      : colaExistente?.currentIndex || 0;

    await Cola.findOneAndUpdate(
      { roomId },
      {
        $set: {
          canciones,
          currentIndex: 0,
          modoMesaActivo: true,
          modoMesaItems: [
            ...itemsDefaultMesas,
            ...colaModoMesa.map((item) => ({
              mesaNumero: item.mesaNumero,
              mesaNombre: item.mesaNombre,
              participanteNombre: item.participanteNombre,
              participanteIndex: item.participanteIndex,
              cancionIndex: item.cancionIndex,
              esVideoDefaultMesas: false,
              cancion: item.cancionId,
            })),
          ],
          modoConcursoActivo: false,
          modoConcursoFinalizado: false,
          concursoItems: [],
          colaNormalBackup: backupCanciones,
          currentIndexNormalBackup: backupCurrentIndex,
        },
      },
      { upsert: true, new: true },
    );

    const colaActualizada = await emitirColaActualizada(req, roomId);

    res.json({
      message: "Modo mesa activado",
      cola: colaActualizada.canciones,
      currentIndex: colaActualizada.currentIndex,
      modoMesaActivo: true,
      totalCanciones: colaActualizada.canciones.length,
    });
  } catch (err) {
    console.error("Error al activar modo mesa:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/cola/modo-mesa/desactivar", async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "roomId requerido" });
    }

    const colaExistente = await Cola.findOne({ roomId });
    const tieneBackup = Array.isArray(colaExistente?.colaNormalBackup);

    await Cola.findOneAndUpdate(
      { roomId },
      {
        $set: {
          canciones: tieneBackup ? colaExistente.colaNormalBackup : [],
          currentIndex: tieneBackup
            ? colaExistente.currentIndexNormalBackup || 0
            : 0,
          modoMesaActivo: false,
          modoMesaItems: [],
          colaNormalBackup: [],
          currentIndexNormalBackup: 0,
        },
      },
      { upsert: true, new: true },
    );

    const colaActualizada = await emitirColaActualizada(req, roomId);

    res.json({
      message: "Modo mesa desactivado",
      cola: colaActualizada.canciones,
      currentIndex: colaActualizada.currentIndex || 0,
      modoMesaActivo: false,
    });
  } catch (err) {
    console.error("Error al desactivar modo mesa:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/cola/modo-concurso/activar", async (req, res) => {
  try {
    const { roomId, participantes, cancionesPorParticipante } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "roomId requerido" });
    }

    if (!Array.isArray(participantes) || !participantes.length) {
      return res.status(400).json({ error: "Agrega participantes al concurso" });
    }

    const colaModoConcurso = generarColaModoConcurso(
      participantes,
      cancionesPorParticipante,
    );
    const videosDefaultConcurso = await Cancion.find({
      videoDefaultConcurso: true,
      videoUrl: { $exists: true, $ne: "" },
    })
      .sort({ numero: 1, _id: 1 })
      .select("_id");
    const videosFinalConcurso = await Cancion.find({
      videoFinalConcurso: true,
      videoUrl: { $exists: true, $ne: "" },
    })
      .sort({ numero: 1, _id: 1 })
      .select("_id");
    const itemsDefaultConcurso = crearItemsEspecialesConcurso(
      videosDefaultConcurso,
      "inicial",
    );
    const itemsFinalConcurso = crearItemsEspecialesConcurso(
      videosFinalConcurso,
      "final",
    );
    const hayVideosIniciales = itemsDefaultConcurso.length > 0;
    if (itemsDefaultConcurso[0]) {
      itemsDefaultConcurso[0].estado = "reproduciendo";
    }
    const itemsConcurso = [
      ...itemsDefaultConcurso,
      ...colaModoConcurso.map((item) => ({
        participanteId: item.participanteId,
        participanteNombre: item.participanteNombre,
        participanteIndex: item.participanteIndex,
        cancionIndex: item.cancionIndex,
        estado: hayVideosIniciales ? "pendiente" : item.estado,
        esVideoDefaultConcurso: false,
        esVideoFinalConcurso: false,
        cancion: item.cancionId,
      })),
      ...itemsFinalConcurso,
    ];
    const canciones = [
      ...videosDefaultConcurso.map((cancion) => cancion._id),
      ...colaModoConcurso.map((item) => item.cancionId),
      ...videosFinalConcurso.map((cancion) => cancion._id),
    ];

    if (!canciones.length) {
      return res.status(400).json({ error: "No hay canciones para el concurso" });
    }

    const colaExistente = await Cola.findOne({ roomId });
    const backupCanciones =
      colaExistente?.modoConcursoActivo || colaExistente?.modoMesaActivo
      ? colaExistente.colaNormalBackup || []
      : colaExistente?.canciones || [];
    const backupCurrentIndex =
      colaExistente?.modoConcursoActivo || colaExistente?.modoMesaActivo
      ? colaExistente.currentIndexNormalBackup || 0
      : colaExistente?.currentIndex || 0;

    await Cola.findOneAndUpdate(
      { roomId },
      {
        $set: {
          canciones,
          currentIndex: 0,
          modoConcursoActivo: true,
          modoConcursoFinalizado: false,
          cancionesPorParticipanteConcurso: Number(cancionesPorParticipante),
          concursoItems: itemsConcurso,
          modoMesaActivo: false,
          modoMesaItems: [],
          colaNormalBackup: backupCanciones,
          currentIndexNormalBackup: backupCurrentIndex,
        },
      },
      { upsert: true, new: true },
    );

    const colaActualizada = await emitirColaActualizada(req, roomId);

    res.json({
      message: "Modo concurso activado",
      cola: colaActualizada.canciones,
      currentIndex: colaActualizada.currentIndex,
      modoConcursoActivo: true,
      concursoItems: colaActualizada.concursoItems,
    });
  } catch (err) {
    console.error("Error al activar modo concurso:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/cola/modo-concurso/desactivar", async (req, res) => {
  try {
    const { roomId, finalizado = false } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "roomId requerido" });
    }

    const colaExistente = await Cola.findOne({ roomId });
    const tieneBackup = Array.isArray(colaExistente?.colaNormalBackup);

    await Cola.findOneAndUpdate(
      { roomId },
      {
        $set: {
          canciones: finalizado
            ? []
            : tieneBackup
              ? colaExistente.colaNormalBackup
              : [],
          currentIndex: finalizado
            ? 0
            : tieneBackup
              ? colaExistente.currentIndexNormalBackup || 0
              : 0,
          modoConcursoActivo: false,
          modoConcursoFinalizado: Boolean(finalizado),
          concursoItems: finalizado ? colaExistente?.concursoItems || [] : [],
          colaNormalBackup: [],
          currentIndexNormalBackup: 0,
        },
      },
      { upsert: true, new: true },
    );

    const colaActualizada = await emitirColaActualizada(req, roomId);

    res.json({
      message: finalizado ? "Concurso finalizado" : "Modo concurso desactivado",
      cola: colaActualizada.canciones,
      currentIndex: colaActualizada.currentIndex || 0,
      modoConcursoActivo: false,
    });
  } catch (err) {
    console.error("Error al desactivar modo concurso:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/cola/modo-concurso/cancion-terminada", async (req, res) => {
  try {
    const { roomId, indexActual } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "roomId requerido" });
    }

    const cola = await Cola.findOne({ roomId });
    if (!cola?.modoConcursoActivo) {
      return res.json({ message: "Concurso no activo" });
    }

    const items = cola.concursoItems.map((item) => item.toObject());
    const activeItems = items.filter(
      (item) => item.estado !== "eliminada" && item.estado !== "reproducida",
    );
    const itemTerminado = activeItems[Number(indexActual) || 0];

    if (itemTerminado) {
      const originalIndex = items.findIndex(
        (item) =>
          String(item.cancion) === String(itemTerminado.cancion) &&
          item.participanteId === itemTerminado.participanteId &&
          item.cancionIndex === itemTerminado.cancionIndex,
      );

      if (originalIndex >= 0 && items[originalIndex].estado !== "eliminada") {
        items[originalIndex].estado = "reproducida";
      }
    }

    const nextIndexOriginal = items.findIndex(
      (item) => item.estado === "pendiente",
    );

    if (nextIndexOriginal >= 0) {
      items[nextIndexOriginal].estado = "reproduciendo";
    }

    const canciones = getCancionesConcursoActivas(items);
    const currentIndex =
      nextIndexOriginal >= 0 ? getActiveIndexFromItems(items) : Math.max(canciones.length - 1, 0);
    const finalizado = nextIndexOriginal < 0;

    await Cola.updateOne(
      { roomId },
      {
        $set: {
          concursoItems: items,
          canciones: finalizado ? [] : canciones,
          currentIndex: finalizado ? 0 : currentIndex,
          modoConcursoActivo: !finalizado,
          modoConcursoFinalizado: finalizado,
        },
      },
    );

    const colaActualizada = await emitirColaActualizada(req, roomId);

    res.json({
      message: finalizado ? "Concurso finalizado" : "Cancion marcada como reproducida",
      cola: colaActualizada.canciones,
      currentIndex: colaActualizada.currentIndex || 0,
      modoConcursoActivo: Boolean(colaActualizada.modoConcursoActivo),
    });
  } catch (err) {
    console.error("Error al avanzar modo concurso:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/cola/modo-concurso/eliminar-participante", async (req, res) => {
  try {
    const { roomId, participanteId } = req.body;

    if (!roomId || !participanteId) {
      return res.status(400).json({ error: "roomId y participanteId requeridos" });
    }

    const cola = await Cola.findOne({ roomId });
    if (!cola?.modoConcursoActivo) {
      return res.status(400).json({ error: "Concurso no activo" });
    }

    const items = cola.concursoItems.map((item) => item.toObject());

    const itemsActualizados = items.map((item) => {
      if (
        item.participanteId === participanteId &&
        item.estado === "pendiente"
      ) {
        return { ...item, estado: "eliminada" };
      }

      return item;
    });

    const hayReproduciendo = itemsActualizados.some(
      (item) => item.estado === "reproduciendo",
    );

    if (!hayReproduciendo) {
      const nextIndex = itemsActualizados.findIndex(
        (item) => item.estado === "pendiente",
      );
      if (nextIndex >= 0) {
        itemsActualizados[nextIndex].estado = "reproduciendo";
      }
    }

    const quedanPendientes = itemsActualizados.some(
      (item) => item.estado === "pendiente" || item.estado === "reproduciendo",
    );
    const canciones = getCancionesConcursoActivas(itemsActualizados);
    const currentIndex = getActiveIndexFromItems(
      itemsActualizados,
      cola.currentIndex || 0,
    );

    await Cola.updateOne(
      { roomId },
      {
        $set: {
          concursoItems: itemsActualizados,
          canciones: quedanPendientes ? canciones : [],
          currentIndex: quedanPendientes ? currentIndex : 0,
          modoConcursoActivo: quedanPendientes,
          modoConcursoFinalizado: !quedanPendientes,
        },
      },
    );

    const colaActualizada = await emitirColaActualizada(req, roomId);

    res.json({
      message: "Participante eliminado del concurso",
      cola: colaActualizada.canciones,
      currentIndex: colaActualizada.currentIndex || 0,
      modoConcursoActivo: Boolean(colaActualizada.modoConcursoActivo),
    });
  } catch (err) {
    console.error("Error al eliminar participante del concurso:", err);
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

    if (await bloquearCambiosSiConcursoActivo(roomId, res)) return;

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

    if (await bloquearCambiosSiConcursoActivo(roomId, res)) return;

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

    if (await bloquearCambiosSiConcursoActivo(roomId, res)) return;

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
