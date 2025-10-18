import { configureStore } from "@reduxjs/toolkit";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import shipmentReducer from "./shipmentSlice";

// Redux Persist configuration - simplified for Expo Go compatibility
const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  timeout: 0, // Set to 0 to avoid timing issues in Expo Go
};

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, shipmentReducer);

// Configure store with persistence
export const store = configureStore({
  reducer: {
    shipment: persistedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Create persistor
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
