const Cola = require("../models/Cola");
const Room = require("../models/Room"); // 🔥 IMPORTANTE

const initSockets = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 Cliente conectado:", socket.id);

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