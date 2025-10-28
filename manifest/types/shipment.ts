export interface ExpectedItem {
  itemNumber: string;
  legacyItemNumber?: string;
  description: string;
  upc: string;
  qtyExpected: number;
  documentId?: string;
}

export interface ReceivedItem {
  itemNumber: string;
  legacyItemNumber?: string;
  description: string;
  upc: string;
  qtyReceived: number;
  qtyExpected: number;
  discrepancy: number;
  documentId?: string;
  scannedByDevice?: string;
  scannedAt?: number;
  scannedByUsername?: string;
  scannedByName?: string;
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
  documentId?: string;
  qtyReceived: number;
  deviceId?: string;
  username?: string;
  name?: string;
}

export interface AddUnexpectedReceivedItemPayload {
  upc: string;
  qtyReceived: number;
  itemNumber?: string;
  legacyItemNumber?: string;
  description?: string;
  deviceId?: string;
  username?: string;
  name?: string;
}
