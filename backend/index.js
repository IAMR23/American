const express = require("express");
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
const publicacionRoutes = require ("./routes/publicacionRoutes");
const paypalRoutes = require ("./routes/paypalRoutes");
const suscripcionRoutes = require ("./routes/suscripcionRoutes");
const playlistPropiaRoutes = require ("./routes/PlaylistPropiaRoutes");
 
const app = express();
const PORT = process.env.PORT || 5000;
 
// Middleware
app.use(express.json());
app.use(cors());
app.options('*', cors());


// Conectar a la base de datos y luego arrancar el servidor
conectarDB()
  .then(() => {
    console.log("Base de datos conectada");

    // Usar rutas con prefijo para usuarios
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


    app.listen(PORT,  '0.0.0.0', () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error al conectar a la base de datos:", err);
    process.exit(1); // Termina el proceso si no se conecta a la DB
  });
