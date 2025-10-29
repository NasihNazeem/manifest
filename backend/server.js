const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcrypt");
const db = require("./database");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting for internal tool - uses custom key generator to avoid IP detection issues
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // High limit for internal tool with ~9 users
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  // Custom key generator using user agent + time window (avoids IP-based issues)
  keyGenerator: (req) => {
    return `${req.headers['user-agent'] || 'unknown'}_${Math.floor(Date.now() / (15 * 60 * 1000))}`;
  },
  // Skip all validations since we're using custom key generator
  validate: false,
});

const pdfLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: "Too many PDF uploads, please try again later.",
  keyGenerator: (req) => {
    return `pdf_${req.headers['user-agent'] || 'unknown'}_${Math.floor(Date.now() / (15 * 60 * 1000))}`;
  },
  validate: false,
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/", limiter);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
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

function parseMultiLineItem(lines, startIndex) {
  const firstLine = lines[startIndex];

  if (!/^\d{7}/.test(firstLine.trim())) {
    return null;
  }

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

function extractPackingListNumber(text) {
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.includes("Packing List")) {
      const sameLine = line.match(/Packing List\s+(\d+)/);
      if (sameLine) {
        return sameLine[1];
      } else if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const nextLineMatch = nextLine.match(/^(\d{8})$/);
        if (nextLineMatch) {
          return nextLineMatch[1];
        }
      }
    }
  }

  return null;
}

const SALT_ROUNDS = 10;

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "PDF Parser & Sync API is running",
    endpoints: {
      health: "GET /",
      login: "POST /api/auth/login",
      logout: "POST /api/auth/logout",
      changePasscode: "POST /api/auth/change-passcode",
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

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, passcode } = req.body;

    if (!username || !passcode) {
      return res.status(400).json({
        success: false,
        error: "Username and passcode are required",
      });
    }

    const user = await db.getUserByUsername(username);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or passcode",
      });
    }

    const isValid = await bcrypt.compare(passcode, user.passcodeHash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid username or passcode",
      });
    }

    await db.updateLastLogin(user.id);

    const session = await db.createSession(user.id);

    if (!session) {
      console.error(`Failed to create session for user: ${username}`);
      return res.status(500).json({
        success: false,
        error: "Failed to create session",
      });
    }

    res.json({
      success: true,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        isTempPasscode: user.isTempPasscode,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({
      success: false,
      error: "Login failed",
    });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        error: "Session token is required",
      });
    }

    const success = await db.deleteSession(sessionToken);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: "Failed to logout",
      });
    }

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({
      success: false,
      error: "Logout failed",
    });
  }
});

app.post("/api/auth/change-passcode", async (req, res) => {
  try {
    const { sessionToken, currentPasscode, newPasscode } = req.body;

    if (!sessionToken || !currentPasscode || !newPasscode) {
      return res.status(400).json({
        success: false,
        error: "Session token, current passcode, and new passcode are required",
      });
    }

    // Validate new passcode format (must be exactly 4 digits)
    if (!/^\d{4}$/.test(newPasscode)) {
      return res.status(400).json({
        success: false,
        error: "New passcode must be exactly 4 digits",
      });
    }

    // Validate session
    const sessionData = await db.validateSession(sessionToken);

    if (!sessionData) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired session",
      });
    }

    const user = await db.getUserByUsername(sessionData.user.username);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    const isValid = await bcrypt.compare(currentPasscode, user.passcodeHash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: "Current passcode is incorrect",
      });
    }

    const newPasscodeHash = await bcrypt.hash(newPasscode, SALT_ROUNDS);

    const result = await db.changePasscode(user.id, newPasscodeHash);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: "Failed to change passcode",
      });
    }

    res.json({
      success: true,
      message: "Passcode changed successfully",
    });
  } catch (error) {
    console.error("Error changing passcode:", error);
    res.status(500).json({
      success: false,
      error: "Failed to change passcode",
    });
  }
});

// PDF parsing endpoint (with stricter rate limiting)
app.post(
  "/api/parse-pdf",
  pdfLimiter,
  upload.single("file"),
  async (req, res) => {
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

      // Parse page-by-page to associate items with document IDs
      const allItems = [];
      const packingListsSet = new Set();

      // Split text by page breaks (pdf-parse concatenates all pages)
      // We'll use a heuristic: "Packing List" typically appears at the start of each page
      const pageTexts = [];
      const lines = data.text.split("\n");
      let currentPageText = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Detect new page by "Packing List" header
        if (line.includes("Packing List") && currentPageText.length > 0) {
          pageTexts.push(currentPageText.join("\n"));
          currentPageText = [line];
        } else {
          currentPageText.push(line);
        }
      }
      // Add last page
      if (currentPageText.length > 0) {
        pageTexts.push(currentPageText.join("\n"));
      }

      // Process each page
      for (let pageIndex = 0; pageIndex < pageTexts.length; pageIndex++) {
        const pageText = pageTexts[pageIndex];
        const documentId = extractPackingListNumber(pageText);
        const pageItems = extractItems(pageText);

        // Add documentId to each item from this page
        pageItems.forEach((item) => {
          item.documentId = documentId;
          allItems.push(item);
          if (documentId) {
            packingListsSet.add(documentId);
          }
        });
      }

      const packingLists = Array.from(packingListsSet);

      res.json({
        success: true,
        data: {
          metadata: {
            parsedAt: new Date().toISOString(),
            numPages: data.numpages,
            textLength: data.text.length,
            totalPackingLists: packingLists.length,
            totalItems: allItems.length,
            totalQuantity: allItems.reduce(
              (sum, item) => sum + item.qtyShipped,
              0
            ),
          },
          packingLists: packingLists,
          expectedItems: allItems,
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
  }
);

app.post("/api/shipments", async (req, res) => {
  try {
    const { shipmentId, shipmentData } = req.body;

    if (!shipmentId || !shipmentData) {
      return res.status(400).json({
        success: false,
        error: "shipmentId and shipmentData are required",
      });
    }

    const success = await db.saveShipment(shipmentId, shipmentData);

    if (success) {
      const shipment = await db.getShipment(shipmentId);
      res.json({
        success: true,
        shipment,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to save shipment",
      });
    }
  } catch (error) {
    console.error("Error saving shipment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PUT endpoint for upserting (create or update) a shipment
app.put("/api/shipments/:id", async (req, res) => {
  try {
    const shipmentId = req.params.id;
    const shipmentData = req.body;

    if (!shipmentData) {
      return res.status(400).json({
        success: false,
        error: "Shipment data is required",
      });
    }

    const success = await db.saveShipment(shipmentId, shipmentData);

    if (success) {
      const shipment = await db.getShipment(shipmentId);
      res.json({
        success: true,
        shipment,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to save shipment",
      });
    }
  } catch (error) {
    console.error("Error upserting shipment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/shipments/:id", async (req, res) => {
  try {
    const shipment = await db.getShipment(req.params.id);

    if (shipment) {
      res.json({
        success: true,
        shipment,
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Shipment not found",
      });
    }
  } catch (error) {
    console.error("Error getting shipment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/shipments", async (req, res) => {
  try {
    const shipments = await db.getAllShipments();
    res.json({
      success: true,
      shipments,
    });
  } catch (error) {
    console.error("Error getting shipments:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Batch upload received items (optimized for minimal writes)
app.post("/api/shipments/:id/received-items/batch", async (req, res) => {
  try {
    const shipmentId = req.params.id;
    const { receivedItems } = req.body;

    if (!Array.isArray(receivedItems)) {
      return res.status(400).json({
        success: false,
        error: "receivedItems must be an array",
      });
    }

    // Check if shipment is completed
    const shipment = await db.getShipment(shipmentId);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: "Shipment not found",
      });
    }

    if (shipment.status === "completed") {
      return res.status(403).json({
        success: false,
        error: "Cannot upload items to a completed shipment",
      });
    }

    const result = await db.batchUploadReceivedItems(shipmentId, receivedItems);

    if (result.success) {
      res.json({
        success: true,
        message: `Successfully uploaded ${receivedItems.length} items`,
        itemCount: receivedItems.length,
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error("Error batch uploading received items:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Single item upload (kept for backwards compatibility, but batch is preferred)
app.post("/api/shipments/:id/received-items", async (req, res) => {
  try {
    const shipmentId = req.params.id;
    const { upc, qtyReceived, deviceId, username, name } = req.body;

    if (!upc || !qtyReceived || !deviceId) {
      return res.status(400).json({
        success: false,
        error: "upc, qtyReceived, and deviceId are required",
      });
    }

    // Check if shipment is completed
    const shipment = await db.getShipment(shipmentId);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        error: "Shipment not found",
      });
    }

    if (shipment.status === "completed") {
      return res.status(403).json({
        success: false,
        error: "Cannot add items to a completed shipment",
      });
    }

    const result = await db.addReceivedItem(
      shipmentId,
      upc,
      qtyReceived,
      deviceId,
      username,  // Pass username
      name       // Pass name
    );

    if (result.success) {
      res.json({
        success: true,
        item: result.item,
      });
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Error adding received item:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/shipments/:id/received-items", async (req, res) => {
  try {
    const shipmentId = req.params.id;
    const items = await db.getReceivedItems(shipmentId);

    res.json({
      success: true,
      receivedItems: items,  // Changed from 'items' to 'receivedItems' for consistency
    });
  } catch (error) {
    console.error("Error getting received items:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/shipments/:id/received-items/sync", async (req, res) => {
  try {
    const shipmentId = req.params.id;
    const lastSync = parseInt(req.query.lastSync) || 0;

    const items = await db.getReceivedItemsSince(shipmentId, lastSync);

    res.json({
      success: true,
      items,
      serverTime: Date.now(),
    });
  } catch (error) {
    console.error("Error syncing items:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/shipments/:id/complete", async (req, res) => {
  try {
    const result = await db.completeShipment(req.params.id);

    if (result.success) {
      const shipment = await db.getShipment(req.params.id);
      res.json({
        success: true,
        shipment,
      });
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error("Error completing shipment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.delete("/api/shipments/:id", async (req, res) => {
  try {
    const result = await db.deleteShipment(req.params.id);

    res.json({
      success: result.success,
    });
  } catch (error) {
    console.error("Error deleting shipment:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`PDF Parser & Sync API running on http://localhost:${PORT}`);
  console.log(` Endpoints:`);
  console.log(
    `   GET    /                                       - Health check`
  );
  console.log(
    `   POST   /api/auth/login                        - User login (session-based)`
  );
  console.log(`   POST   /api/auth/logout                       - User logout`);
  console.log(
    `   POST   /api/auth/change-passcode              - Change passcode`
  );
  console.log(
    `   POST   /api/parse-pdf                         - Parse PDF file`
  );
  console.log(
    `   POST   /api/shipments                         - Create/update shipment`
  );
  console.log(
    `   PUT    /api/shipments/:id                     - Upsert shipment`
  );
  console.log(
    `   GET    /api/shipments/:id                     - Get shipment`
  );
  console.log(
    `   GET    /api/shipments                         - Get all shipments`
  );
  console.log(
    `   POST   /api/shipments/:id/received-items      - Add received item`
  );
  console.log(
    `   GET    /api/shipments/:id/received-items      - Get all received items`
  );
  console.log(
    `   GET    /api/shipments/:id/received-items/sync - Sync items since timestamp`
  );
  console.log(
    `   POST   /api/shipments/:id/complete            - Complete shipment`
  );
  console.log(
    `   DELETE /api/shipments/:id                     - Delete shipment`
  );
});
