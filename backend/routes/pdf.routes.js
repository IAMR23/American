const express = require("express");
const router = express.Router();
const uploadPdf = require("../middleware/uploadPdf");
const fs = require("fs");
const multer = require("multer");


router.post("/upload-pdf", (req, res) => {
  try {
    uploadPdf.single("archivo")(req, res, function (err) {
      // 🔴 Errores de multer
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            message: "El archivo supera el tamaño permitido",
          });
        }
        return res.status(400).json({
          message: "Error al subir archivo",
          error: err.message,
        });
      }

      // 🔴 Errores personalizados (fileFilter, etc.)
      if (err) {
        return res.status(400).json({
          message: err.message,
        });
      }

      // 🔴 Validación
      if (!req.file) {
        return res.status(400).json({
          message: "No se subió ningún archivo",
        });
      }

      // ✅ OK
      return res.json({
        message: "PDF subido correctamente",
        file: req.file.filename,
      });
    });
  } catch (error) {
    console.error("Error inesperado:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
});

// =====================
// OBTENER ÚLTIMO PDF (robusto)
// =====================
router.get("/ultimo-pdf", async (req, res) => {
  try {
    const dir = "uploads";

    // Validar que exista el directorio
    if (!fs.existsSync(dir)) {
      return res.status(404).json({
        message: "No existe el directorio de uploads",
      });
    }

    const files = fs.readdirSync(dir);

    if (!files.length) {
      return res.status(404).json({
        message: "No hay archivos disponibles",
      });
    }

    // Ordenar por fecha de modificación (más reciente primero)
    const ultimo = files
      .map((file) => ({
        name: file,
        time: fs.statSync(path.join(dir, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time)[0];

    return res.json({ file: ultimo.name });
  } catch (error) {
    console.error("Error obteniendo último PDF:", error);
    return res.status(500).json({
      message: "Error interno del servidor",
    });
  }
});


module.exports = router;
