const mongoose = require("mongoose");

const MONGO_URL =
  process.env.MONGO_URL || "mongodb://localhost:27017/mi_basedatos";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URL); // Sin opciones useNewUrlParser ni useUnifiedTopology
    console.log("✅ Conectado a MongoDB local");
  } catch (err) {
    console.error("❌ Error de conexión a MongoDB:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
