const Cola = require("../models/Cola");
const MesaSala = require("../models/MesaSala");
const Room = require("../models/Room"); // 🔥 IMPORTANTE
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const {
  SUBSCRIPTION_INACTIVE_CODE,
  SUBSCRIPTION_INACTIVE_MESSAGE,
  tieneAccesoKaraoke,
} = require("../middleware/authMiddleware");

const initSockets = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 Cliente conectado:", socket.id);
    const token = socket.handshake.auth?.token;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.type || decoded.type === "access") {
          socket.data.userId = decoded.userId;
          socket.data.tokenVersion = decoded.tokenVersion;
        }
      } catch (error) {
        socket.data.userId = null;
      }
    }

    const emitirSuscripcionInactiva = () => {
      const payload = {
        code: SUBSCRIPTION_INACTIVE_CODE,
        message: SUBSCRIPTION_INACTIVE_MESSAGE,
        mensaje: SUBSCRIPTION_INACTIVE_MESSAGE,
      };

      socket.emit("subscriptionInactive", payload);
      socket.emit("error", SUBSCRIPTION_INACTIVE_MESSAGE);
    };

    const validarAccesoSocket = async () => {
      if (!socket.data.userId) {
        emitirSuscripcionInactiva();
        return false;
      }

      const usuario = await User.findById(socket.data.userId);

      if (
        !usuario ||
        socket.data.tokenVersion !== usuario.tokenVersion ||
        !tieneAccesoKaraoke(usuario)
      ) {
        emitirSuscripcionInactiva();
        return false;
      }

      return true;
    };

    const validarHostSala = async (room) => {
      if (!room?.host || !mongoose.Types.ObjectId.isValid(String(room.host))) {
        return false;
      }

      const host = await User.findById(room.host);
      return tieneAccesoKaraoke(host);
    };

    /**
     * 🔹 UNIRSE A UNA SALA (CON VALIDACIÓN)
     */
    socket.on("joinRoom", async ({ roomId, user }) => {
      if (!roomId) return;

      try {
        // 🔥 VALIDACIÓN AQUÍ
        const room = await Room.findOne({ roomId });

        if (!room) {
          return socket.emit("error", "Sala no existe");
        }

        if (!(await validarHostSala(room))) {
          return socket.emit("error", "Sala no autorizada");
        }

        // ✅ SOLO SI EXISTE, SE UNE
        socket.join(roomId);
        console.log(`Usuario ${user} unido a sala ${roomId}`);

        let cola = await Cola.findOne({ roomId }).populate("canciones");

        if (!cola) {
          cola = new Cola({
            roomId,
            canciones: [],
            currentIndex: 0,
          });
          await cola.save();
        }

        socket.emit("colaActualizada", {
          nuevaCola: cola.canciones,
          indexActual: cola.currentIndex,
          modoMesaActivo: Boolean(cola.modoMesaActivo),
          modoMesaItems: cola.modoMesaItems || [],
          modoConcursoActivo: Boolean(cola.modoConcursoActivo),
          modoConcursoFinalizado: Boolean(cola.modoConcursoFinalizado),
          concursoItems: cola.concursoItems || [],
        });

        const mesaSala = await MesaSala.findOne({ roomId });
        socket.emit("mesasActualizadas", {
          roomId,
          mesas: mesaSala?.mesas || [],
        });
      } catch (error) {
        console.error("Error en joinRoom:", error);
        socket.emit("error", "Error al unirse a sala");
      }
    });

    /**
     * ➕ AGREGAR CANCIÓN
     */
/*     socket.on("addSong", async ({ roomId, song }) => {
      if (!roomId || !song?._id) return;

      try {
        let cola = await Cola.findOne({ roomId });

        if (!cola) {
          cola = new Cola({
            roomId,
            canciones: [], 
            currentIndex: 0,
          });
        }

        const last = cola.canciones[cola.canciones.length - 1];
        if (last?.toString() === song._id) return;

        cola.canciones.push(song._id);
        await cola.save();

        const colaActualizada = await Cola.findOne({ roomId }).populate("canciones");

        io.in(roomId).emit("colaActualizada", {
          nuevaCola: colaActualizada.canciones,
          indexActual: colaActualizada.currentIndex,
        });
      } catch (error) {
        console.error("Error en addSong:", error);
      }
    }); */

    /**
     * ⏭️ CAMBIAR CANCIÓN
     */
    socket.on("cambiarCancion", async ({ roomId, index }) => {
      if (!roomId || index == null) return;

      try {
        if (!(await validarAccesoSocket())) return;

        const cola = await Cola.findOne({ roomId }).populate("canciones");
        if (!cola) return;

        // ✅ MEJORADO: Validar y ajustar el índice si es necesario
        let finalIndex = index;
        const maxIndex = cola.canciones.length - 1;

        if (index < 0) {
          console.warn(
            `⚠️ Índice negativo recibido: ${index}, ajustando a 0`
          );
          finalIndex = 0;
        } else if (index > maxIndex) {
          console.warn(
            `⚠️ Índice fuera de rango: ${index} (máx: ${maxIndex}), ajustando a ${maxIndex}`
          );
          finalIndex = maxIndex;
        }

        cola.currentIndex = finalIndex;
        await cola.save();

        io.in(roomId).emit("colaActualizada", {
          nuevaCola: cola.canciones,
          indexActual: finalIndex,
          modoMesaActivo: Boolean(cola.modoMesaActivo),
          modoMesaItems: cola.modoMesaItems || [],
          modoConcursoActivo: Boolean(cola.modoConcursoActivo),
          modoConcursoFinalizado: Boolean(cola.modoConcursoFinalizado),
          concursoItems: cola.concursoItems || [],
        });
      } catch (error) {
        console.error("Error en cambiarCancion:", error);
      }
    });

    /**
     * 🗑️ ELIMINAR CANCIÓN
     */
    socket.on("removeSong", async ({ roomId, songId }) => {
      if (!roomId || !songId) return;

      try {
        if (!(await validarAccesoSocket())) return;

        const cola = await Cola.findOne({ roomId });
        if (!cola) return;

        cola.canciones = cola.canciones.filter(
          (id) => id.toString() !== songId
        );

        await cola.save();

        const colaActualizada = await Cola.findOne({ roomId }).populate("canciones");

        io.in(roomId).emit("colaActualizada", {
          nuevaCola: colaActualizada.canciones,
          indexActual: colaActualizada.currentIndex,
        });
      } catch (error) {
        console.error("Error en removeSong:", error);
      }
    });

    /**
     * 🔄 LIMPIAR COLA
     */
    socket.on("clearQueue", async ({ roomId }) => {
      if (!roomId) return;

      try {
        if (!(await validarAccesoSocket())) return;

        await Cola.findOneAndUpdate(
          { roomId },
          { canciones: [], currentIndex: 0 }
        );

        io.in(roomId).emit("colaActualizada", {
          nuevaCola: [],
          indexActual: 0,
        });
      } catch (error) {
        console.error("Error en clearQueue:", error);
      }
    });
    
    socket.on("setQueue", async ({ roomId, nuevaCola, indexActual }) => {
  if (!roomId || !Array.isArray(nuevaCola)) return;

  try {
    if (!(await validarAccesoSocket())) return;

    let cola = await Cola.findOne({ roomId });

    if (!cola) {
      cola = new Cola({
        roomId,
        canciones: [],
        currentIndex: 0,
      });
    }

    // guardar solo IDs
    cola.canciones = nuevaCola.map((c) => c._id);
    cola.currentIndex = indexActual || 0;

    await cola.save();

    const colaActualizada = await Cola.findOne({ roomId }).populate("canciones");

    io.in(roomId).emit("colaActualizada", {
      nuevaCola: colaActualizada.canciones,
      indexActual: colaActualizada.currentIndex,
    });

  } catch (error) {
    console.error("Error en setQueue:", error);
  }
});


    socket.on("disconnect", () => {
      console.log("🔴 Cliente desconectado:", socket.id);
    });
  });
};

module.exports = { initSockets };
