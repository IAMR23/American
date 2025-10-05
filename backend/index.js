const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
require("dotenv").config();
const conectarDB = require("./config/db");

// Routes
const userRoutes = require("./routes/UserRoutes");
const authRoutes = require("./routes/authRoutes");
const songRoutes = require("./routes/cancionRoutes");
const generoRoutes = require("./routes/generoRoutes");
const anuncioRoutes = require("./routes/anuncioRoutes");
const resenaRoutes = require("./routes/resenaRoutes");
const totalRoutes = require("./routes/TotalRoutes");
const solicitudCancionRouter = require("./routes/solicitudCancionRoutes");
const publicacionRoutes = require("./routes/publicacionRoutes");
const paypalRoutes = require("./routes/paypalRoutes");
const suscripcionRoutes = require("./routes/suscripcionRoutes");
const playlistPropiaRoutes = require("./routes/PlaylistPropiaRoutes");
const Cola = require("./models/Cola");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ====================
// 🔹 Configuración de CORS
// ====================
const allowedOrigins = [
  "https://american-karaoke.com",
  "http://localhost:5173",
  "http://192.168.1.33:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS no permitido: " + origin), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT" , "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());
app.use(express.json());

// ====================
// 🔹 Configuración de Socket.io
// ====================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true, // necesario si hay cookies o headers de autenticación
  },
  transports: ["websocket", "polling"], // fallback seguro
  allowEIO3: true, // si el cliente es legacy
});

// Guardar instancia de io en app
app.set("io", io);

// ====================
// 🔹 Conectar DB y arrancar servidor
// ====================
conectarDB()
  .then(() => {
    console.log("Base de datos conectada");

    // Rutas
    app.use("/", userRoutes);
    app.use("/", authRoutes);
    app.use("/song", songRoutes);
    app.use("/genero", generoRoutes);
    app.use("/anuncio", anuncioRoutes);
    app.use("/resenas", resenaRoutes);
    app.use("/t", totalRoutes);
    app.use("/solicitud", solicitudCancionRouter);
    app.use("/publicacion", publicacionRoutes);
    app.use("/paypal", paypalRoutes);
    app.use("/suscripcion", suscripcionRoutes);
    app.use("/t2", playlistPropiaRoutes);

    // ====================
    // 🔹 Socket.io events
    // ====================

    io.on("connection", (socket) => {
      console.log("🟢 Cliente conectado:", socket.id);

      // Unirse a la sala del usuario
      socket.on("join", (userId) => {
        socket.join(userId);
        console.log(`Usuario ${userId} unido a su sala`);
      });

      // Pedir la cola actual
      socket.on("pedirCola", async (userId) => {
        if (!userId) return; // prevenir null
        const colaUsuario = await Cola.findOne({ user: userId }).populate(
          "canciones"
        );
        if (!colaUsuario) return;

        socket.emit("colaActualizada", {
          nuevaCola: colaUsuario.canciones,
          indexActual: colaUsuario.currentIndex ?? 0,
        });
      });

      // Cambiar canción y mantener sincronía en todos los dispositivos
      socket.on("cambiarCancion", async ({ userId, index }) => {
        if (!userId || index == null) return;

        // Actualizar DB
        await Cola.findOneAndUpdate({ user: userId }, { currentIndex: index });

        // Emitir a TODOS los sockets en la sala del usuario
        io.in(userId).emit("cambiarCancion", { index, userId });
      });

      // Actualizar la cola completa
      socket.on(
        "actualizarCola",
        async ({ userId, nuevaCola, indexActual }) => {
          if (!userId) return;
          console.log(`Usuario ${userId} actualizó la cola`);

          // Guardar la nueva cola y el index en la DB
          await Cola.findOneAndUpdate(
            { user: userId },
            { canciones: nuevaCola, currentIndex: indexActual }
          );

          // Emitir la actualización a TODOS los sockets en la sala del usuario
          io.in(userId).emit("colaActualizada", { nuevaCola, indexActual });
        }
      );

      socket.on("disconnect", () => {
        console.log("🔴 Cliente desconectado:", socket.id);
      });
    });

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error al conectar a la base de datos:", err);
    process.exit(1);
  });
