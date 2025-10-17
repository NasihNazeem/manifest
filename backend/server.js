const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ PDF Parser API running on http://localhost:${PORT}`);
  console.log(`📄 Endpoints:`);
  console.log(`   GET  /           - Health check`);
  console.log(`   POST /api/parse-pdf - Parse PDF file`);
});
