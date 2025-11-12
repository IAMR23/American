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
const puntajeRoutes = require("./routes/PuntajeRoutes");
const Cola = require("./models/Cola");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ====================
// 🔹 Configuración de CORS
// ====================
const allowedOrigins = [
  "https://american-karaoke.com",
  "https://www.american-karaoke.com",
  "http://localhost:5173",
  "http://192.168.1.33:5173",
  "http://192.168.105.2:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS no permitido: " + origin), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

app.set("io", io);

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
    app.use("/p", puntajeRoutes);
    app.use("/t2", playlistPropiaRoutes);

    // io.on("connection", (socket) => {
    //   console.log("🟢 Cliente conectado:", socket.id);

    //   socket.on("join", async (userId) => {
    //     socket.join(userId);
    //     console.log(`Usuario ${userId} unido a su sala`);

    //     const colaUsuario = await Cola.findOne({ user: userId }).populate(
    //       "canciones"
    //     );
    //     if (colaUsuario) {
    //       socket.emit("colaActualizada", {
    //         nuevaCola: colaUsuario.canciones,
    //         indexActual: colaUsuario.currentIndex || 0,
    //       });
    //     }
    //   });

    //   socket.on("cambiarCancion", ({ userId, index }) => {
    //     if (!userId || index == null) return;

    //     io.in(userId).emit("cambiarCancion", { index, userId });
    //   });

    //   socket.on("disconnect", () => {
    //     console.log("🔴 Cliente desconectado:", socket.id);
    //   });
    // });

    io.on("connection", (socket) => {
      console.log("🟢 Cliente conectado:", socket.id);

      socket.on("join", async (userId) => {
        socket.join(userId);
        console.log(`Usuario ${userId} unido a su sala`);

        const colaUsuario = await Cola.findOne({ user: userId }).populate(
          "canciones"
        );
        if (colaUsuario) {
          socket.emit("colaActualizada", {
            nuevaCola: colaUsuario.canciones,
            indexActual: colaUsuario.currentIndex || 0,
          });
        }
      });

      socket.on(
        "actualizarCola",
        async ({ userId, nuevaCola, indexActual }) => {
          if (!userId || !nuevaCola) return;

          await Cola.findOneAndUpdate(
            { user: userId },
            {
              canciones: nuevaCola.map((c) => c._id),
              currentIndex: indexActual || 0,
            },
            { upsert: true, new: true }
          );

          io.in(userId).emit("colaActualizada", { nuevaCola, indexActual });
        }
      );

      socket.on("cambiarCancion", ({ userId, index }) => {
        if (!userId || index == null) return;
        io.in(userId).emit("cambiarCancion", { index, userId });
      });

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
