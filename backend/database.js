const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'shipments.json');

// Initialize database
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      shipments: {},
      receivedItems: {}
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  }
}

// Read database
function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database:', error);
    return { shipments: {}, receivedItems: {} };
  }
}

// Write database
function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing database:', error);
    return false;
  }
}

// Create or update shipment
function saveShipment(shipmentId, shipmentData) {
  const db = readDB();

  db.shipments[shipmentId] = {
    ...shipmentData,
    id: shipmentId,
    lastUpdated: Date.now()
  };

  // Initialize receivedItems for this shipment if not exists
  if (!db.receivedItems[shipmentId]) {
    db.receivedItems[shipmentId] = {};
  }

  return writeDB(db);
}

// Get shipment by ID
function getShipment(shipmentId) {
  const db = readDB();
  return db.shipments[shipmentId] || null;
}

// Get all shipments
function getAllShipments() {
  const db = readDB();
  return Object.values(db.shipments);
}

// Add or update received item for a shipment
function addReceivedItem(shipmentId, upc, qtyReceived, deviceId) {
  const db = readDB();

  // Ensure shipment exists
  if (!db.shipments[shipmentId]) {
    return { success: false, error: 'Shipment not found' };
  }

  // Ensure receivedItems for shipment exists
  if (!db.receivedItems[shipmentId]) {
    db.receivedItems[shipmentId] = {};
  }

  // Get existing or create new
  const existing = db.receivedItems[shipmentId][upc];

  if (existing) {
    // Update existing - add to quantity
    existing.qtyReceived += qtyReceived;
    existing.lastUpdated = Date.now();

    // Track which devices scanned this
    if (!existing.scannedBy.includes(deviceId)) {
      existing.scannedBy.push(deviceId);
    }
  } else {
    // Create new received item
    db.receivedItems[shipmentId][upc] = {
      upc,
      qtyReceived,
      scannedBy: [deviceId],
      lastUpdated: Date.now()
    };
  }

  const success = writeDB(db);
  return {
    success,
    item: db.receivedItems[shipmentId][upc]
  };
}

// Get all received items for a shipment
function getReceivedItems(shipmentId) {
  const db = readDB();
  const items = db.receivedItems[shipmentId] || {};
  return Object.values(items);
}

// Get received items updated after a timestamp
function getReceivedItemsSince(shipmentId, timestamp) {
  const db = readDB();
  const items = db.receivedItems[shipmentId] || {};

  return Object.values(items).filter(item => item.lastUpdated > timestamp);
}

// Complete shipment
function completeShipment(shipmentId) {
  const db = readDB();

  if (!db.shipments[shipmentId]) {
    return { success: false, error: 'Shipment not found' };
  }

  db.shipments[shipmentId].status = 'completed';
  db.shipments[shipmentId].completedAt = Date.now();
  db.shipments[shipmentId].lastUpdated = Date.now();

  const success = writeDB(db);
  return { success };
}

// Delete shipment
function deleteShipment(shipmentId) {
  const db = readDB();

  delete db.shipments[shipmentId];
  delete db.receivedItems[shipmentId];

  const success = writeDB(db);
  return { success };
}

// Initialize DB on module load
initDB();

module.exports = {
  saveShipment,
  getShipment,
  getAllShipments,
  addReceivedItem,
  getReceivedItems,
  getReceivedItemsSince,
  completeShipment,
  deleteShipment
};
