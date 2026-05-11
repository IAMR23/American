const express = require("express");
const router = express.Router();
const uploadPdf = require("../middleware/uploadPdf");
const fs = require("fs");
const path = require("path");

const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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
      file: req.file.filename,
      url: `/uploads/${req.file.filename}`,
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

    const ultimo = files.sort().reverse()[0];

    return res.json({
      file: ultimo,
      url: `/uploads/${ultimo}`,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error al obtener el último PDF",
      error: error.message,
    });
  }
});

module.exports = router;