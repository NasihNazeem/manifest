import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/store';
import { deleteShipment } from '../store/shipmentSlice';
import { exportReceivedItems, exportDiscrepancies } from '../utils/exportUtils';
import Screen from '../components/Screen';

export default function HistoryScreen() {
  const dispatch = useAppDispatch();
  const shipments = useAppSelector(state => state.shipment.shipments);

  const handleDelete = (shipmentId: string) => {
    Alert.alert(
      'Delete Shipment',
      'Are you sure you want to delete this shipment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteShipment(shipmentId)),
        },
      ]
    );
  };

  const handleExport = async (shipmentId: string, exportType: 'all' | 'discrepancies') => {
    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment) return;

    const success = exportType === 'all'
      ? await exportReceivedItems(shipment.receivedItems, `shipment_${shipment.date}_${shipment.id}.csv`)
      : await exportDiscrepancies(shipment.receivedItems, `discrepancies_${shipment.date}_${shipment.id}.csv`);

    // Only show error alert if export failed
    // Don't show success alert since we can't detect if user cancelled the share dialog
    if (!success) {
      Alert.alert('Error', 'Failed to export shipment');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const calculateDiscrepancyCount = (shipment: any) => {
    return shipment.receivedItems.filter((item: any) => item.discrepancy !== 0).length;
  };

  if (shipments.length === 0) {
    return (
      <Screen style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No shipments yet</Text>
          <Text style={styles.emptySubtext}>
            Complete a shipment to see it appear here
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {shipments.map(shipment => (
          <View key={shipment.id} style={styles.shipmentCard}>
            <View style={styles.shipmentHeader}>
              <Text style={styles.shipmentDate}>{shipment.date}</Text>
              <Text style={styles.shipmentId}>#{shipment.id.slice(-6)}</Text>
            </View>

            <View style={styles.shipmentStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{shipment.expectedItems.length}</Text>
                <Text style={styles.statLabel}>Expected Items</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{shipment.receivedItems.length}</Text>
                <Text style={styles.statLabel}>Received Items</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, calculateDiscrepancyCount(shipment) > 0 && styles.warningText]}>
                  {calculateDiscrepancyCount(shipment)}
                </Text>
                <Text style={styles.statLabel}>Discrepancies</Text>
              </View>
            </View>

            {shipment.documentIds.length > 0 && (
              <View style={styles.documentIdsContainer}>
                <Text style={styles.documentIdsLabel}>Document IDs:</Text>
                <Text style={styles.documentIds}>{shipment.documentIds.join(', ')}</Text>
              </View>
            )}

            <Text style={styles.timestamp}>
              Completed: {formatDate(shipment.completedAt || shipment.createdAt)}
            </Text>

            <View style={styles.actionsContainer}>
              <Pressable
                style={[styles.actionButton, styles.exportButton]}
                onPress={() => handleExport(shipment.id, 'all')}
              >
                <Text style={styles.actionButtonText}>Export All</Text>
              </Pressable>

              {calculateDiscrepancyCount(shipment) > 0 && (
                <Pressable
                  style={[styles.actionButton, styles.warningButton]}
                  onPress={() => handleExport(shipment.id, 'discrepancies')}
                >
                  <Text style={styles.actionButtonText}>Export Discrepancies</Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDelete(shipment.id)}
              >
                <Text style={styles.actionButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
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
    padding: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#bbb',
    textAlign: 'center',
  },
  shipmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  shipmentDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  shipmentId: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'monospace',
  },
  shipmentStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    paddingVertical: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  warningText: {
    color: '#FF9500',
  },
  documentIdsContainer: {
    marginBottom: 10,
  },
  documentIdsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  documentIds: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginBottom: 15,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  exportButton: {
    backgroundColor: '#007AFF',
  },
  warningButton: {
    backgroundColor: '#FF9500',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
