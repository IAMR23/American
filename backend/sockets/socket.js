const Cola = require("../models/Cola");

const initSockets = (io) => {
  io.on("connection", (socket) => {
    console.log("🟢 Cliente conectado:", socket.id);

    // 🔹 UNIRSE A UNA SALA
    socket.on("joinRoom", async ({ roomId, user }) => {
      if (!roomId) return;

      socket.join(roomId);
      console.log(`Usuario ${user} unido a sala ${roomId}`);

      try {
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
      }
    });

    // ➕ AGREGAR CANCIÓN
    socket.on("addSong", async ({ roomId, song, addedBy }) => {
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
    });

    // ⏭️ CAMBIAR CANCIÓN
    socket.on("cambiarCancion", async ({ roomId, index }) => {
      if (!roomId || index == null) return;

      try {
        const cola = await Cola.findOne({ roomId }).populate("canciones");
        if (!cola) return;

        cola.currentIndex = index;
        await cola.save();

        io.in(roomId).emit("colaActualizada", {
          nuevaCola: cola.canciones,
          indexActual: index,
        });
      } catch (error) {
        console.error("Error en cambiarCancion:", error);
      }
    });

    // 🗑️ ELIMINAR CANCIÓN
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

    // 🔄 LIMPIAR COLA
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

    socket.on("disconnect", () => {
      console.log("🔴 Cliente desconectado:", socket.id);
    });
  });
};

module.exports = { initSockets };