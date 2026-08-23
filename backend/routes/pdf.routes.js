const express = require("express");
const router = express.Router();
const uploadPdf = require("../middleware/uploadPdf");
const fs = require("fs");
const path = require("path");

const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const getPdfInfo = (filename) => {
  const filePath = path.join(uploadDir, filename);
  const stats = fs.statSync(filePath);

  return {
    file: filename,
    url: `/uploads/${filename}`,
    size: stats.size,
    uploadedAt: stats.mtime,
  };
};

router.post("/upload-pdf", (req, res) => {
  uploadPdf.single("archivo")(req, res, function (error) {
    if (error) {
      return res.status(400).json({
        message: "Error al subir el PDF",
        error: error.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No se subió ningún archivo",
      });
    }

    return res.json({
      message: "PDF subido correctamente",
      ...getPdfInfo(req.file.filename),
      originalName: req.file.originalname,
    });
  });
});

router.get("/ultimo-pdf", async (req, res) => {
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const files = fs
      .readdirSync(uploadDir)
      .filter((file) => path.extname(file).toLowerCase() === ".pdf");

    if (files.length === 0) {
      return res.status(404).json({
        message: "No hay PDFs subidos",
        file: null,
      });
    }

    const ultimo = files
      .map((file) => getPdfInfo(file))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];

    return res.json(ultimo);
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener el último PDF",
      error: error.message,
    });
  }
});

module.exports = router;
