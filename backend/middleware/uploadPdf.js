const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ruta absoluta: backend/uploads
const uploadDir = path.join(__dirname, "..", "uploads");

// Crear carpeta si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, uniqueSuffix + ext);
  },
});

// Filtro para solo PDF
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.mimetype === "application/pdf" || ext === ".pdf") {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos PDF"), false);
  }
};

const uploadPdf = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
  fileFilter,
});

module.exports = uploadPdf;