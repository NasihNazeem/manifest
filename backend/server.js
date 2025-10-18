const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const db = require("./database");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

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
  // Pattern 1: XXXXX-XXX-X (e.g., 40508-217-9) - single char after last hyphen
  let legacyMatch = remaining.match(/^(\d{5}-\d{3}-[\dA-Z])/);
  if (legacyMatch) {
    legacyNumber = legacyMatch[1];
    remaining = remaining.substring(legacyMatch[1].length);
  } else {
    // Pattern 2: XXXXX-XXX (e.g., 07041-830)
    legacyMatch = remaining.match(/^(\d{5}-\d{3})/);
    if (legacyMatch) {
      legacyNumber = legacyMatch[1];
      remaining = remaining.substring(legacyMatch[1].length);
    } else {
      // Pattern 3: XXXXX-XX (1-2 letters followed by space, e.g., 40151-MG )
      legacyMatch = remaining.match(/^(\d{5}-[A-Z]{1,2})(?=\s)/);
      if (legacyMatch) {
        legacyNumber = legacyMatch[1];
        remaining = remaining.substring(legacyMatch[1].length);
      } else {
        // Pattern 4: XXXX-X (single char, e.g., 4219-R)
        legacyMatch = remaining.match(/^(\d{4}-[\dA-Z])/);
        if (legacyMatch) {
          legacyNumber = legacyMatch[1];
          remaining = remaining.substring(legacyMatch[1].length);
        }
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
    message: "PDF Parser & Sync API is running",
    endpoints: {
      health: "GET /",
      parsePdf: "POST /api/parse-pdf",
      createShipment: "POST /api/shipments",
      getShipment: "GET /api/shipments/:id",
      getAllShipments: "GET /api/shipments",
      addReceivedItem: "POST /api/shipments/:id/received-items",
      getReceivedItems: "GET /api/shipments/:id/received-items",
      syncReceivedItems: "GET /api/shipments/:id/received-items/sync",
      completeShipment: "POST /api/shipments/:id/complete",
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

// ============================================
// SYNC ENDPOINTS FOR MULTI-DEVICE SUPPORT
// ============================================

// Create or update a shipment
app.post("/api/shipments", (req, res) => {
  try {
    const { shipmentId, shipmentData } = req.body;

    if (!shipmentId || !shipmentData) {
      return res.status(400).json({
        success: false,
        error: "shipmentId and shipmentData are required"
      });
    }

    const success = db.saveShipment(shipmentId, shipmentData);

    if (success) {
      res.json({
        success: true,
        shipment: db.getShipment(shipmentId)
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to save shipment"
      });
    }
  } catch (error) {
    console.error("Error saving shipment:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get a specific shipment
app.get("/api/shipments/:id", (req, res) => {
  try {
    const shipment = db.getShipment(req.params.id);

    if (shipment) {
      res.json({
        success: true,
        shipment
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Shipment not found"
      });
    }
  } catch (error) {
    console.error("Error getting shipment:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all shipments
app.get("/api/shipments", (req, res) => {
  try {
    const shipments = db.getAllShipments();
    res.json({
      success: true,
      shipments
    });
  } catch (error) {
    console.error("Error getting shipments:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add a received item to a shipment
app.post("/api/shipments/:id/received-items", (req, res) => {
  try {
    const shipmentId = req.params.id;
    const { upc, qtyReceived, deviceId } = req.body;

    if (!upc || !qtyReceived || !deviceId) {
      return res.status(400).json({
        success: false,
        error: "upc, qtyReceived, and deviceId are required"
      });
    }

    const result = db.addReceivedItem(shipmentId, upc, qtyReceived, deviceId);

    if (result.success) {
      res.json({
        success: true,
        item: result.item
      });
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Error adding received item:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all received items for a shipment
app.get("/api/shipments/:id/received-items", (req, res) => {
  try {
    const shipmentId = req.params.id;
    const items = db.getReceivedItems(shipmentId);

    res.json({
      success: true,
      items
    });
  } catch (error) {
    console.error("Error getting received items:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Sync received items (get items updated after timestamp)
app.get("/api/shipments/:id/received-items/sync", (req, res) => {
  try {
    const shipmentId = req.params.id;
    const lastSync = parseInt(req.query.lastSync) || 0;

    const items = db.getReceivedItemsSince(shipmentId, lastSync);

    res.json({
      success: true,
      items,
      serverTime: Date.now()
    });
  } catch (error) {
    console.error("Error syncing items:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Complete a shipment
app.post("/api/shipments/:id/complete", (req, res) => {
  try {
    const result = db.completeShipment(req.params.id);

    if (result.success) {
      res.json({
        success: true,
        shipment: db.getShipment(req.params.id)
      });
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Error completing shipment:", error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete a shipment
app.delete("/api/shipments/:id", (req, res) => {
  try {
    const result = db.deleteShipment(req.params.id);

    res.json({
      success: result.success
    });
  } catch (error) {
    console.error("Error deleting shipment:", error);
    res.status(500).json({
      success: false,
      error: error.message
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
  console.log(`✅ PDF Parser & Sync API running on http://localhost:${PORT}`);
  console.log(`📄 Endpoints:`);
  console.log(`   GET    /                                      - Health check`);
  console.log(`   POST   /api/parse-pdf                        - Parse PDF file`);
  console.log(`   POST   /api/shipments                        - Create/update shipment`);
  console.log(`   GET    /api/shipments/:id                    - Get shipment`);
  console.log(`   GET    /api/shipments                        - Get all shipments`);
  console.log(`   POST   /api/shipments/:id/received-items     - Add received item`);
  console.log(`   GET    /api/shipments/:id/received-items     - Get all received items`);
  console.log(`   GET    /api/shipments/:id/received-items/sync - Sync items since timestamp`);
  console.log(`   POST   /api/shipments/:id/complete           - Complete shipment`);
  console.log(`   DELETE /api/shipments/:id                    - Delete shipment`);
});
