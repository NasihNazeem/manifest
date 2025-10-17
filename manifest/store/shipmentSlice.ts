import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Shipment, ShipmentState, ExpectedItem, ReceivedItem } from '../types/shipment';

const initialState: ShipmentState = {
  shipments: [],
  currentShipment: null,
};

const shipmentSlice = createSlice({
  name: 'shipment',
  initialState,
  reducers: {
    createShipment: (state, action: PayloadAction<{ documentIds: string[]; expectedItems: ExpectedItem[] }>) => {
      const newShipment: Shipment = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        documentIds: action.payload.documentIds,
        expectedItems: action.payload.expectedItems,
        receivedItems: [],
        status: 'in-progress',
        createdAt: Date.now(),
      };
      state.currentShipment = newShipment;
    },

    addReceivedItem: (state, action: PayloadAction<{ upc: string; qtyReceived: number }>) => {
      if (!state.currentShipment) return;

      const { upc, qtyReceived } = action.payload;
      const expectedItem = state.currentShipment.expectedItems.find(item => item.upc === upc);

      if (!expectedItem) return;

      // Check if item already received
      const existingIndex = state.currentShipment.receivedItems.findIndex(item => item.upc === upc);

      if (existingIndex !== -1) {
        // Update existing received item
        const existingItem = state.currentShipment.receivedItems[existingIndex];
        existingItem.qtyReceived += qtyReceived;
        existingItem.discrepancy = existingItem.qtyReceived - existingItem.qtyExpected;
      } else {
        // Add new received item
        const receivedItem: ReceivedItem = {
          itemNumber: expectedItem.itemNumber,
          legacyItemNumber: expectedItem.legacyItemNumber,
          description: expectedItem.description,
          upc: expectedItem.upc,
          qtyReceived,
          qtyExpected: expectedItem.qtyExpected,
          discrepancy: qtyReceived - expectedItem.qtyExpected,
        };
        state.currentShipment.receivedItems.push(receivedItem);
      }
    },

    updateReceivedItemQuantity: (state, action: PayloadAction<{ upc: string; qtyReceived: number }>) => {
      if (!state.currentShipment) return;

      const { upc, qtyReceived } = action.payload;
      const item = state.currentShipment.receivedItems.find(item => item.upc === upc);

      if (item) {
        item.qtyReceived = qtyReceived;
        item.discrepancy = qtyReceived - item.qtyExpected;
      }
    },

    completeShipment: (state) => {
      if (!state.currentShipment) return;

      state.currentShipment.status = 'completed';
      state.currentShipment.completedAt = Date.now();
      state.shipments.unshift(state.currentShipment);
      state.currentShipment = null;
    },

    cancelShipment: (state) => {
      state.currentShipment = null;
    },

    loadShipment: (state, action: PayloadAction<string>) => {
      const shipment = state.shipments.find(s => s.id === action.payload);
      if (shipment) {
        state.currentShipment = { ...shipment };
      }
    },

    deleteShipment: (state, action: PayloadAction<string>) => {
      state.shipments = state.shipments.filter(s => s.id !== action.payload);
    },

    loadPersistedShipments: (state, action: PayloadAction<Shipment[]>) => {
      state.shipments = action.payload;
    },
  },
});

export const {
  createShipment,
  addReceivedItem,
  updateReceivedItemQuantity,
  completeShipment,
  loadPersistedShipments,
  cancelShipment,
  loadShipment,
  deleteShipment,
} = shipmentSlice.actions;

export default shipmentSlice.reducer;
