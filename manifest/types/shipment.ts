export interface ExpectedItem {
  itemNumber: string;
  legacyItemNumber?: string;
  description: string;
  upc: string;
  qtyExpected: number;
  documentId?: string; // Packing list number from the page this item was on
}

export interface ReceivedItem {
  itemNumber: string;
  legacyItemNumber?: string;
  description: string;
  upc: string;
  qtyReceived: number;
  qtyExpected: number;
  discrepancy: number;
  documentId?: string; // Packing list number (inherited from ExpectedItem)
  scannedByDevice?: string; // Device ID that scanned this item
  scannedAt?: number; // Timestamp when scanned
}

export interface Shipment {
  id: string;
  date: string;
  documentIds: string[];
  expectedItems: ExpectedItem[];
  receivedItems: ReceivedItem[];
  status: "in-progress" | "completed";
  createdAt: number;
  completedAt?: number;
}

export interface ShipmentState {
  shipments: Shipment[];
  currentShipment: Shipment | null;
}

export interface AddExpectedReceivedItemPayload {
  upc: string;
  qtyReceived: number;
  deviceId?: string;
}

export interface AddUnexpectedReceivedItemPayload {
  upc: string;
  qtyReceived: number;
  itemNumber?: string;
  legacyItemNumber?: string;
  description?: string;
  deviceId?: string;
}
