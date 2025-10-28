import { createSlice, PayloadAction, createSelector } from "@reduxjs/toolkit";
import {
  Shipment,
  ShipmentState,
  ExpectedItem,
  ReceivedItem,
  AddExpectedReceivedItemPayload,
  AddUnexpectedReceivedItemPayload,
} from "../types/shipment";

const initialState: ShipmentState = {
  shipments: [],
  currentShipment: null,
};

const shipmentSlice = createSlice({
  name: "shipment",
  initialState,
  reducers: {
    createShipment: (
      state,
      action: PayloadAction<{
        id?: string;
        documentIds: string[];
        expectedItems: ExpectedItem[];
      }>
    ) => {
      const shipmentId = action.payload.id || Date.now().toString();
      const newShipment: Shipment = {
        id: shipmentId,
        date: new Date().toISOString().split("T")[0],
        documentIds: action.payload.documentIds,
        expectedItems: action.payload.expectedItems,
        receivedItems: [],
        status: "in-progress",
        createdAt: Date.now(),
      };
      state.currentShipment = newShipment;
    },

    // Add expected received item (item in manifest)
    addExpectedReceivedItem: (
      state,
      action: PayloadAction<AddExpectedReceivedItemPayload>
    ) => {
      if (!state.currentShipment) return;

      const { upc, documentId, qtyReceived, deviceId } = action.payload;

      // Find expected item using BOTH upc AND documentId for unique identification
      const expectedItem = state.currentShipment.expectedItems.find(
        (item) => item.upc === upc && item.documentId === documentId
      );

      if (!expectedItem) {
        console.warn(`Expected item with UPC ${upc} and documentId ${documentId} not found in manifest`);
        return;
      }

      // Check if this specific item (upc + documentId) already received
      const existingIndex = state.currentShipment.receivedItems.findIndex(
        (item) => item.upc === upc && item.documentId === documentId
      );

      if (existingIndex !== -1) {
        // Update existing received item
        const existingItem = state.currentShipment.receivedItems[existingIndex];
        existingItem.qtyReceived += qtyReceived;
        existingItem.discrepancy =
          existingItem.qtyReceived - existingItem.qtyExpected;
      } else {
        // Add new received item from expected item
        const receivedItem: ReceivedItem = {
          itemNumber: expectedItem.itemNumber,
          legacyItemNumber: expectedItem.legacyItemNumber,
          description: expectedItem.description,
          upc: expectedItem.upc,
          qtyReceived,
          qtyExpected: expectedItem.qtyExpected,
          discrepancy: qtyReceived - expectedItem.qtyExpected,
          documentId: expectedItem.documentId, // Preserve document ID from expected item
          scannedByDevice: deviceId,
          scannedAt: Date.now(),
        };
        state.currentShipment.receivedItems.push(receivedItem);
      }
    },

    // Add unexpected received item (item NOT in manifest with optional user-provided details)
    addUnexpectedReceivedItem: (
      state,
      action: PayloadAction<AddUnexpectedReceivedItemPayload>
    ) => {
      if (!state.currentShipment) return;

      const {
        upc,
        qtyReceived,
        itemNumber,
        legacyItemNumber,
        description,
        deviceId,
      } = action.payload;

      // Check if item already received
      const existingIndex = state.currentShipment.receivedItems.findIndex(
        (item) => item.upc === upc
      );

      if (existingIndex !== -1) {
        // Update existing received item quantity
        const existingItem = state.currentShipment.receivedItems[existingIndex];
        existingItem.qtyReceived += qtyReceived;
        existingItem.discrepancy =
          existingItem.qtyReceived - existingItem.qtyExpected;

        // Update optional fields if provided (don't overwrite existing values with empty ones)
        if (itemNumber && itemNumber.trim()) {
          existingItem.itemNumber = itemNumber;
        }
        if (legacyItemNumber && legacyItemNumber.trim()) {
          existingItem.legacyItemNumber = legacyItemNumber;
        }
        if (description && description.trim()) {
          existingItem.description = description;
        }
      } else {
        // Add new unexpected item with user-provided details or defaults
        const receivedItem: ReceivedItem = {
          itemNumber: itemNumber?.trim() || "",
          legacyItemNumber: legacyItemNumber?.trim() || undefined,
          description: description?.trim() || "Unexpected Item",
          upc: upc,
          qtyReceived,
          qtyExpected: 0,
          discrepancy: qtyReceived, // All unexpected items are overages
          scannedByDevice: deviceId,
          scannedAt: Date.now(),
        };
        state.currentShipment.receivedItems.push(receivedItem);
      }
    },

    updateReceivedItemQuantity: (
      state,
      action: PayloadAction<{ upc: string; documentId?: string; qtyReceived: number }>
    ) => {
      if (!state.currentShipment) {
        return;
      }

      const { upc, documentId, qtyReceived } = action.payload;

      // Find item using composite key (upc + documentId)
      const receivedItemIndex = state.currentShipment.receivedItems.findIndex(
        (item) => item.upc === upc && item.documentId === documentId
      );

      if (receivedItemIndex !== -1) {
        // Item exists in receivedItems - update it
        const item = state.currentShipment.receivedItems[receivedItemIndex];
        item.qtyReceived = qtyReceived;
        item.discrepancy = qtyReceived - item.qtyExpected;
      } else {
        // Item doesn't exist in receivedItems yet - check if it's in expectedItems
        const expectedItem = state.currentShipment.expectedItems.find(
          (item) => item.upc === upc && item.documentId === documentId
        );

        if (expectedItem) {
          // Create a new received item entry
          const newReceivedItem: ReceivedItem = {
            itemNumber: expectedItem.itemNumber,
            legacyItemNumber: expectedItem.legacyItemNumber,
            description: expectedItem.description,
            upc: expectedItem.upc,
            qtyReceived: qtyReceived,
            qtyExpected: expectedItem.qtyExpected,
            discrepancy: qtyReceived - expectedItem.qtyExpected,
            documentId: expectedItem.documentId, // Preserve document ID
            scannedAt: Date.now(),
          };
          state.currentShipment.receivedItems.push(newReceivedItem);
        }
        // If item not found in expectedItems, silently ignore the update
      }
    },

    completeShipment: (state) => {
      if (!state.currentShipment) return;

      state.currentShipment.status = "completed";
      state.currentShipment.completedAt = Date.now();
      state.shipments.unshift(state.currentShipment);
      state.currentShipment = null;
    },

    cancelShipment: (state) => {
      state.currentShipment = null;
    },

    deleteShipment: (state, action: PayloadAction<string>) => {
      state.shipments = state.shipments.filter((s) => s.id !== action.payload);
    },

    // Load completed shipments from server
    loadShipmentsFromServer: (state, action: PayloadAction<Shipment[]>) => {
      // Only load completed shipments, don't override current active shipment
      const completedShipments = action.payload.filter(s => s.status === "completed");

      // Merge with existing shipments, avoiding duplicates
      const existingIds = new Set(state.shipments.map(s => s.id));
      const newShipments = completedShipments.filter(s => !existingIds.has(s.id));

      state.shipments = [...state.shipments, ...newShipments];
      console.log(`Loaded ${newShipments.length} completed shipments from server`);
    },
  },
});

export const {
  createShipment,
  addExpectedReceivedItem,
  addUnexpectedReceivedItem,
  updateReceivedItemQuantity,
  completeShipment,
  cancelShipment,
  deleteShipment,
  loadShipmentsFromServer,
} = shipmentSlice.actions;

/**
 * Memoized selector to get all items with their received status
 * Merges expectedItems and receivedItems to show complete picture:
 * - Items expected but not received (shortage with qty 0)
 * - Items expected and received (match or discrepancy)
 * - Items received but not expected (unexpected overage)
 */
const selectCurrentShipment = (state: { shipment: ShipmentState }) =>
  state.shipment.currentShipment;

export const selectAllItemsWithStatus = createSelector(
  [selectCurrentShipment],
  (currentShipment): ReceivedItem[] => {
    if (!currentShipment) return [];

    const allItems: ReceivedItem[] = [];

    // Add all expected items with their received status
    // Use composite key (upc + documentId) to match items uniquely
    currentShipment.expectedItems.forEach((expectedItem) => {
      const receivedItem = currentShipment.receivedItems.find(
        (r) => r.upc === expectedItem.upc && r.documentId === expectedItem.documentId
      );

      if (receivedItem) {
        // Item was received
        allItems.push(receivedItem);
      } else {
        // Item was NOT received - shortage
        allItems.push({
          itemNumber: expectedItem.itemNumber,
          legacyItemNumber: expectedItem.legacyItemNumber,
          description: expectedItem.description,
          upc: expectedItem.upc,
          qtyReceived: 0,
          qtyExpected: expectedItem.qtyExpected,
          discrepancy: -expectedItem.qtyExpected, // Negative = shortage
          documentId: expectedItem.documentId,
        });
      }
    });

    // Add unexpected items (received but not in expected)
    // Use composite key (upc + documentId) to check if item is expected
    currentShipment.receivedItems.forEach((receivedItem) => {
      const isExpected = currentShipment.expectedItems.some(
        (e) => e.upc === receivedItem.upc && e.documentId === receivedItem.documentId
      );
      if (!isExpected) {
        allItems.push(receivedItem);
      }
    });

    return allItems;
  }
);

export default shipmentSlice.reducer;
