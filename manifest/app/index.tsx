import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../store/store';

export default function HomeScreen() {
  const router = useRouter();
  const currentShipment = useAppSelector(state => state.shipment.currentShipment);
  const shipments = useAppSelector(state => state.shipment.shipments);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Shipment Receiving</Text>

        {currentShipment ? (
          <View style={styles.activeShipmentContainer}>
            <Text style={styles.sectionTitle}>Active Shipment</Text>
            <Text style={styles.shipmentInfo}>Date: {currentShipment.date}</Text>
            <Text style={styles.shipmentInfo}>
              Expected Items: {currentShipment.expectedItems.length}
            </Text>
            <Text style={styles.shipmentInfo}>
              Received Items: {currentShipment.receivedItems.length}
            </Text>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => router.push('/scan-items')}
            >
              <Text style={styles.buttonText}>Continue Scanning</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.push('/received-items')}
            >
              <Text style={styles.buttonTextSecondary}>View Received Items</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, styles.largeButton]}
            onPress={() => router.push('/new-shipment')}
          >
            <Text style={styles.buttonText}>Start New Shipment</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Shipments</Text>
          {shipments.length > 0 ? (
            <>
              <Text style={styles.shipmentCount}>
                {shipments.length} completed shipment{shipments.length !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => router.push('/history')}
              >
                <Text style={styles.buttonTextSecondary}>View History</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.emptyText}>No shipments yet</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  activeShipmentContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shipmentInfo: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666',
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  largeButton: {
    paddingVertical: 20,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 30,
  },
  historySection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shipmentCount: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
});
