import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { store, persistor } from "../store/store";
import { StatusBar } from "expo-status-bar";

function LoadingView() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingView />} persistor={persistor}>
        <StatusBar style="auto" />
        <Stack>
          <Stack.Screen name="index" options={{ title: "Manifest" }} />
          <Stack.Screen name="history" options={{ title: "History" }} />
          <Stack.Screen
            name="new-shipment"
            options={{ title: "New Shipment" }}
          />
          <Stack.Screen name="scan-items" options={{ title: "Scan Items" }} />
          <Stack.Screen
            name="received-items"
            options={{ title: "Received Items" }}
          />
        </Stack>
      </PersistGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
});
