export interface ExpectedItem {
  itemNumber: string;
  legacyItemNumber?: string;
  description: string;
  upc: string;
  qtyExpected: number;
}

export interface ReceivedItem {
  itemNumber: string;
  legacyItemNumber?: string;
  description: string;
  upc: string;
  qtyReceived: number;
  qtyExpected: number;
  discrepancy: number;
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
