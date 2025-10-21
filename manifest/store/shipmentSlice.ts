import { createSlice, PayloadAction, createSelector } from "@reduxjs/toolkit";
import {
  Shipment,
  ShipmentState,
  ExpectedItem,
  ReceivedItem,
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
        documentIds: string[];
        expectedItems: ExpectedItem[];
      }>
    ) => {
      const newShipment: Shipment = {
        id: Date.now().toString(),
        date: new Date().toISOString().split("T")[0],
        documentIds: action.payload.documentIds,
        expectedItems: action.payload.expectedItems,
        receivedItems: [],
        status: "in-progress",
        createdAt: Date.now(),
      };
      state.currentShipment = newShipment;
    },

    addReceivedItem: (
      state,
      action: PayloadAction<{
        upc: string;
        qtyReceived: number;
        deviceId?: string;
      }>
    ) => {
      if (!state.currentShipment) return;

      const { upc, qtyReceived, deviceId } = action.payload;
      const expectedItem = state.currentShipment.expectedItems.find(
        (item) => item.upc === upc
      );

      // Check if item already received
      const existingIndex = state.currentShipment.receivedItems.findIndex(
        (item) => item.upc === upc
      );

      if (existingIndex !== -1) {
        // Update existing received item
        const existingItem = state.currentShipment.receivedItems[existingIndex];
        existingItem.qtyReceived += qtyReceived;
        existingItem.discrepancy =
          existingItem.qtyReceived - existingItem.qtyExpected;
        // Keep the first device that scanned it
      } else {
        // Add new received item
        const receivedItem: ReceivedItem = expectedItem
          ? {
              // Item was expected
              itemNumber: expectedItem.itemNumber,
              legacyItemNumber: expectedItem.legacyItemNumber,
              description: expectedItem.description,
              upc: expectedItem.upc,
              qtyReceived,
              qtyExpected: expectedItem.qtyExpected,
              discrepancy: qtyReceived - expectedItem.qtyExpected,
              scannedByDevice: deviceId,
              scannedAt: Date.now(),
            }
          : {
              // Unexpected item (not in manifest) - overage
              itemNumber: "",
              legacyItemNumber: undefined,
              description: "Unexpected Item",
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
      action: PayloadAction<{ upc: string; qtyReceived: number }>
    ) => {
      if (!state.currentShipment) {
        return;
      }

      const { upc, qtyReceived } = action.payload;
      const receivedItemIndex = state.currentShipment.receivedItems.findIndex(
        (item) => item.upc === upc
      );

      if (receivedItemIndex !== -1) {
        // Item exists in receivedItems - update it
        const item = state.currentShipment.receivedItems[receivedItemIndex];
        item.qtyReceived = qtyReceived;
        item.discrepancy = qtyReceived - item.qtyExpected;
      } else {
        // Item doesn't exist in receivedItems yet - check if it's in expectedItems
        const expectedItem = state.currentShipment.expectedItems.find(
          (item) => item.upc === upc
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
            scannedAt: Date.now(),
          };
          state.currentShipment.receivedItems.push(newReceivedItem);
        } else {
          console.log(
            "[REDUX] Item not found in expectedItems either - cannot update"
          );
        }
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

    loadShipment: (state, action: PayloadAction<string>) => {
      const shipment = state.shipments.find((s) => s.id === action.payload);
      if (shipment) {
        state.currentShipment = { ...shipment };
      }
    },

    deleteShipment: (state, action: PayloadAction<string>) => {
      state.shipments = state.shipments.filter((s) => s.id !== action.payload);
    },

    // Sync action: merge received items from server
    mergeReceivedItems: (
      state,
      action: PayloadAction<{
        shipmentId: string;
        serverItems: Array<{ upc: string; qtyReceived: number }>;
      }>
    ) => {
      if (
        !state.currentShipment ||
        state.currentShipment.id !== action.payload.shipmentId
      )
        return;

      const { serverItems } = action.payload;

      serverItems.forEach((serverItem) => {
        const expectedItem = state.currentShipment!.expectedItems.find(
          (item) => item.upc === serverItem.upc
        );
        const existingIndex = state.currentShipment!.receivedItems.findIndex(
          (item) => item.upc === serverItem.upc
        );

        if (existingIndex !== -1) {
          // Update existing item - use server quantity as source of truth
          const existingItem =
            state.currentShipment!.receivedItems[existingIndex];
          existingItem.qtyReceived = serverItem.qtyReceived;
          existingItem.discrepancy =
            serverItem.qtyReceived - existingItem.qtyExpected;
        } else {
          // Add new item from server
          const receivedItem: ReceivedItem = expectedItem
            ? {
                itemNumber: expectedItem.itemNumber,
                legacyItemNumber: expectedItem.legacyItemNumber,
                description: expectedItem.description,
                upc: expectedItem.upc,
                qtyReceived: serverItem.qtyReceived,
                qtyExpected: expectedItem.qtyExpected,
                discrepancy: serverItem.qtyReceived - expectedItem.qtyExpected,
              }
            : {
                itemNumber: "",
                legacyItemNumber: undefined,
                description: "Unexpected Item",
                upc: serverItem.upc,
                qtyReceived: serverItem.qtyReceived,
                qtyExpected: 0,
                discrepancy: serverItem.qtyReceived,
              };
          state.currentShipment!.receivedItems.push(receivedItem);
        }
      });
    },
  },
});

export const {
  createShipment,
  addReceivedItem,
  updateReceivedItemQuantity,
  completeShipment,
  cancelShipment,
  loadShipment,
  deleteShipment,
  mergeReceivedItems,
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
    currentShipment.expectedItems.forEach((expectedItem) => {
      const receivedItem = currentShipment.receivedItems.find(
        (r) => r.upc === expectedItem.upc
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
        });
      }
    });

    // Add unexpected items (received but not in expected)
    currentShipment.receivedItems.forEach((receivedItem) => {
      const isExpected = currentShipment.expectedItems.some(
        (e) => e.upc === receivedItem.upc
      );
      if (!isExpected) {
        allItems.push(receivedItem);
      }
    });

    return allItems;
  }
);

export default shipmentSlice.reducer;
