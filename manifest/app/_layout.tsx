import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { store, persistor } from "../store/store";
import { StatusBar } from "expo-status-bar";
import { Colors } from "../constants/theme";
import { useAuthInit } from "../hooks/useAuthInit";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { useShipmentSync } from "../hooks/useShipmentSync";

function LoadingView() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

function AppContent() {
  // Initialize auth state from AsyncStorage
  useAuthInit();

  // Protect routes that require authentication
  useRequireAuth();

  // Sync completed shipments from server on app start
  useShipmentSync();

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="change-passcode" />
        <Stack.Screen name="history" />
        <Stack.Screen name="new-shipment" />
        <Stack.Screen name="scan-items" />
        <Stack.Screen name="received-items" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingView />} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
