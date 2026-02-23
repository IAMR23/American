const express = require("express");
const router = express.Router();
const uploadPdf = require("../middleware/uploadPdf");
const fs = require("fs");

router.post("/upload-pdf", uploadPdf.single("archivo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No se subió ningún archivo" });
  }

  res.json({
    message: "PDF subido correctamente",
    file: req.file.filename
  });
});


router.get("/ultimo-pdf", async (req, res) => {
  const files = fs.readdirSync("uploads");
  const ultimo = files.sort().reverse()[0];

  res.json({ file: ultimo });
});

module.exports = router;
