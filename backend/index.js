const express = require("express");
const http = require("http"); // <-- necesario para socket.io
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

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ====================
// 🔹 Configuración de CORS
// ====================
const allowedOrigins = [
  "https://american-karaoke.com", // frontend en producción
  "http://localhost:5173", // frontend en desarrollo
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requests sin origen (Postman, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS no permitido: " + origin), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Necesario para preflight OPTIONS
app.options("*", cors());

// ====================
// 🔹 Configuración de Socket.io
// ====================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(express.json());

// Guardar instancia de io en app (para usar en rutas)
app.set("io", io);

// Conectar DB y arrancar servidor
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

    io.on("connection", (socket) => {
      console.log("🟢 Cliente conectado:", socket.id);

      // Cuando el frontend se conecte, le pasa su userId
      socket.on("join", (userId) => {
        socket.join(userId);
        console.log(`Usuario ${userId} unido a su sala`);
      });

      socket.on("disconnect", () => {
        console.log("🔴 Cliente desconectado:", socket.id);
      });
    });

    // Iniciar servidor
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error al conectar a la base de datos:", err);
    process.exit(1);
  });
