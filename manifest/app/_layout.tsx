import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '../store/store';
import { loadPersistedShipments } from '../store/shipmentSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

function AppContent() {
  useEffect(() => {
    // Load persisted shipments on app start
    const loadData = async () => {
      try {
        const shipmentsData = await AsyncStorage.getItem('shipments');
        if (shipmentsData) {
          const shipments = JSON.parse(shipmentsData);
          store.dispatch(loadPersistedShipments(shipments));
        }
      } catch (error) {
        console.error('Failed to load persisted data:', error);
      }
    };
    loadData();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Shipment Receiving' }} />
      <Stack.Screen name="history" options={{ title: 'Shipment History' }} />
      <Stack.Screen name="new-shipment" options={{ title: 'New Shipment' }} />
      <Stack.Screen name="scan-items" options={{ title: 'Scan Items' }} />
      <Stack.Screen name="received-items" options={{ title: 'Received Items' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
