import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import shipmentReducer from "./shipmentSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";

const persistMiddleware = (store: any) => (next: any) => (action: any) => {
  const result = next(action);

  const state = store.getState();
  AsyncStorage.setItem("shipments", JSON.stringify(state.shipment.shipments));

  return result;
};

export const store = configureStore({
  reducer: {
    shipment: shipmentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(persistMiddleware),
});

export const loadPersistedData = async () => {
  try {
    const shipmentsData = await AsyncStorage.getItem("shipments");
    if (shipmentsData) {
      const shipments = JSON.parse(shipmentsData);
      return shipments;
    }
  } catch (error) {
    console.error("Failed to load persisted data:", error);
  }
  return [];
};

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
