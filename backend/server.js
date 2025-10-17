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

/**
 * Parse item data from raw text line(s)
 */
function parseItemLine(line) {
  if (!line || line.trim().length === 0) return null;

  const trimmed = line.trim();

  // Extract 7-digit item number
  const itemNumMatch = trimmed.match(/^(\d{7})/);
  if (!itemNumMatch) return null;

  const itemNumber = itemNumMatch[1];
  let remaining = trimmed.substring(7);

  // Extract legacy number (optional, various formats)
  let legacyNumber = null;

  // Try patterns from most specific to least specific
  let legacyMatch = remaining.match(/^(\d{5}-\d{3}-[\dA-Z])/);
  if (legacyMatch) {
    legacyNumber = legacyMatch[1];
    remaining = remaining.substring(legacyMatch[1].length);
  } else {
    legacyMatch = remaining.match(/^(\d{5}-\d{3})/);
    if (legacyMatch) {
      legacyNumber = legacyMatch[1];
      remaining = remaining.substring(legacyMatch[1].length);
    } else {
      legacyMatch = remaining.match(/^(\d{4}-[\dA-Z])/);
      if (legacyMatch) {
        legacyNumber = legacyMatch[1];
        remaining = remaining.substring(legacyMatch[1].length);
      }
    }
  }

  // Extract UPC and quantity
  const allMatches = [];

  for (let i = 0; i <= remaining.length - 13; i++) {
    const candidate = remaining.substring(i, i + 13);

    if (/^\d{13}$/.test(candidate)) {
      const startsValid =
        candidate.startsWith("4") ||
        candidate.startsWith("3") ||
        candidate.startsWith("038");

      if (startsValid) {
        const afterCandidate = remaining.substring(i + 13);
        if (/^\d{0,4}$/.test(afterCandidate)) {
          allMatches.push({
            upc: candidate,
            index: i,
            qtyAfter: afterCandidate,
          });
        }
      }
    }
  }

  if (allMatches.length === 0) return null;

  const lastMatch = allMatches[allMatches.length - 1];
  const upc = lastMatch.upc;
  const qty = lastMatch.qtyAfter || "0";

  const description = remaining.substring(0, lastMatch.index).trim();

  const result = {
    itemNumber: itemNumber,
    description: description,
    upc: upc,
    qtyShipped: parseInt(qty, 10),
  };

  if (legacyNumber) {
    result.legacyNumber = legacyNumber;
  }

  return result;
}

/**
 * Parse multi-line item data
 */
function parseMultiLineItem(lines, startIndex) {
  const firstLine = lines[startIndex];

  if (!/^\d{7}/.test(firstLine.trim())) {
    return null;
  }

  // Try single line first
  const singleLine = parseItemLine(firstLine);
  if (singleLine) {
    return { item: singleLine, linesConsumed: 1 };
  }

  // Try combining with next lines
  let bestMatch = null;
  let bestLinesConsumed = 0;

  for (let i = 1; i <= 4 && startIndex + i < lines.length; i++) {
    const combined = lines.slice(startIndex, startIndex + i + 1).join("");
    const parsed = parseItemLine(combined);
    if (parsed) {
      if (!bestMatch || (parsed.qtyShipped > 0 && bestMatch.qtyShipped === 0)) {
        bestMatch = parsed;
        bestLinesConsumed = i + 1;
      }
      if (parsed.qtyShipped > 0) {
        break;
      }
    }
  }

  if (bestMatch) {
    return { item: bestMatch, linesConsumed: bestLinesConsumed };
  }

  return null;
}

/**
 * Extract all items from PDF text
 */
function extractItems(text) {
  const lines = text.split("\n");
  const items = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (
      !line ||
      line.includes("Item Number") ||
      line.includes("Numéro D'item") ||
      line.includes("Page number") ||
      line.includes("ZWILLING J.A. HENCKELS") ||
      line.includes("Packing List")
    ) {
      i++;
      continue;
    }

    const result = parseMultiLineItem(lines, i);
    if (result) {
      items.push(result.item);
      i += result.linesConsumed;
    } else {
      i++;
    }
  }

  return items;
}

/**
 * Extract packing list numbers from text
 */
function extractPackingListNumbers(text) {
  const packingLists = [];
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes("Packing List")) {
      const sameLine = line.match(/Packing List\s+(\d+)/);
      if (sameLine) {
        packingLists.push(sameLine[1]);
      } else if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const nextLineMatch = nextLine.match(/^(\d{8})$/);
        if (nextLineMatch) {
          packingLists.push(nextLineMatch[1]);
        }
      }
    }
  }

  return [...new Set(packingLists)];
}

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "PDF Parser API is running",
    endpoints: {
      health: "GET /",
      parsePdf: "POST /api/parse-pdf",
    },
  });
});

// PDF parsing endpoint
app.post("/api/parse-pdf", upload.single("file"), async (req, res) => {
  try {
    let pdfBuffer;

    // Handle file upload or base64
    if (req.file) {
      pdfBuffer = req.file.buffer;
    } else if (req.body.fileContent) {
      pdfBuffer = Buffer.from(req.body.fileContent, "base64");
    } else {
      return res.status(400).json({
        success: false,
        error: "No file provided",
      });
    }

    // Parse PDF
    const data = await pdfParse(pdfBuffer);

    // Extract packing list numbers and items
    const packingLists = extractPackingListNumbers(data.text);
    const items = extractItems(data.text);

    res.json({
      success: true,
      data: {
        metadata: {
          parsedAt: new Date().toISOString(),
          numPages: data.numpages,
          textLength: data.text.length,
          totalPackingLists: packingLists.length,
          totalItems: items.length,
          totalQuantity: items.reduce((sum, item) => sum + item.qtyShipped, 0),
        },
        packingLists: packingLists,
        expectedItems: items,
      },
    });
  } catch (error) {
    console.error("Error parsing PDF:", error);
    res.status(500).json({
      success: false,
      error: "Failed to parse PDF",
      message: error.message,
    });
  }
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
