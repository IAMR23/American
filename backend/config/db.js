const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/mi_basedatos";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI); // Sin opciones useNewUrlParser ni useUnifiedTopology
    console.log("✅ Conectado a MongoDB local");
  } catch (err) {
    console.error("❌ Error de conexión a MongoDB:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
