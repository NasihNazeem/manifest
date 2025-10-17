import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector, useAppDispatch } from '../store/store';
import { completeShipment, cancelShipment, updateReceivedItemQuantity } from '../store/shipmentSlice';
import {
  exportReceivedItems,
  exportDiscrepancies,
  exportOverages,
  exportShortages,
} from '../utils/exportUtils';
import { ReceivedItem } from '../types/shipment';

export default function ReceivedItemsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentShipment = useAppSelector(state => state.shipment.currentShipment);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');

  if (!currentShipment) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active shipment</Text>
        </View>
      </View>
    );
  }

  const handleComplete = () => {
    Alert.alert(
      'Complete Shipment',
      'Are you sure you want to complete this shipment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => {
            dispatch(completeShipment());
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Shipment',
      'Are you sure you want to cancel this shipment? All data will be lost.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            dispatch(cancelShipment());
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleExport = async (type: 'all' | 'discrepancies' | 'overages' | 'shortages') => {
    let success = false;
    const date = currentShipment.date;

    switch (type) {
      case 'all':
        success = await exportReceivedItems(currentShipment.receivedItems, `received_${date}.csv`);
        break;
      case 'discrepancies':
        success = await exportDiscrepancies(currentShipment.receivedItems, `discrepancies_${date}.csv`);
        break;
      case 'overages':
        success = await exportOverages(currentShipment.receivedItems, `overages_${date}.csv`);
        break;
      case 'shortages':
        success = await exportShortages(currentShipment.receivedItems, `shortages_${date}.csv`);
        break;
    }

    if (success) {
      Alert.alert('Success', 'Export completed successfully');
    } else {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const handleEditQuantity = (item: ReceivedItem) => {
    setEditingItem(item.upc);
    setEditQuantity(item.qtyReceived.toString());
  };

  const handleSaveQuantity = (upc: string) => {
    const qty = parseInt(editQuantity);
    if (qty && qty > 0) {
      dispatch(updateReceivedItemQuantity({ upc, qtyReceived: qty }));
    }
    setEditingItem(null);
    setEditQuantity('');
  };

  const getDiscrepancyStyle = (discrepancy: number) => {
    if (discrepancy > 0) return styles.overageText;
    if (discrepancy < 0) return styles.shortageText;
    return styles.matchText;
  };

  const getDiscrepancyLabel = (discrepancy: number) => {
    if (discrepancy > 0) return `+${discrepancy} Overage`;
    if (discrepancy < 0) return `${discrepancy} Shortage`;
    return 'Match';
  };

  const stats = {
    total: currentShipment.receivedItems.length,
    discrepancies: currentShipment.receivedItems.filter(item => item.discrepancy !== 0).length,
    overages: currentShipment.receivedItems.filter(item => item.discrepancy > 0).length,
    shortages: currentShipment.receivedItems.filter(item => item.discrepancy < 0).length,
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Items Received</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, stats.discrepancies > 0 && styles.warningValue]}>
              {stats.discrepancies}
            </Text>
            <Text style={styles.statLabel}>Discrepancies</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, styles.overageValue]}>{stats.overages}</Text>
            <Text style={styles.statLabel}>Overages</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, styles.shortageValue]}>{stats.shortages}</Text>
            <Text style={styles.statLabel}>Shortages</Text>
          </View>
        </View>

        <View style={styles.exportSection}>
          <Text style={styles.sectionTitle}>Export Options</Text>
          <View style={styles.exportButtons}>
            <TouchableOpacity
              style={[styles.exportButton, styles.primaryExport]}
              onPress={() => handleExport('all')}
            >
              <Text style={styles.exportButtonText}>Export All</Text>
            </TouchableOpacity>
            {stats.discrepancies > 0 && (
              <TouchableOpacity
                style={[styles.exportButton, styles.warningExport]}
                onPress={() => handleExport('discrepancies')}
              >
                <Text style={styles.exportButtonText}>Export Discrepancies</Text>
              </TouchableOpacity>
            )}
            {stats.overages > 0 && (
              <TouchableOpacity
                style={[styles.exportButton, styles.overageExport]}
                onPress={() => handleExport('overages')}
              >
                <Text style={styles.exportButtonText}>Export Overages</Text>
              </TouchableOpacity>
            )}
            {stats.shortages > 0 && (
              <TouchableOpacity
                style={[styles.exportButton, styles.shortageExport]}
                onPress={() => handleExport('shortages')}
              >
                <Text style={styles.exportButtonText}>Export Shortages</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Received Items</Text>
          {currentShipment.receivedItems.length === 0 ? (
            <Text style={styles.emptyText}>No items received yet</Text>
          ) : (
            currentShipment.receivedItems.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <TouchableOpacity onPress={() => handleEditQuantity(item)}>
                    <Text style={styles.editText}>Edit</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.itemDetail}>Item: {item.itemNumber}</Text>
                {item.legacyItemNumber && (
                  <Text style={styles.itemDetail}>Legacy: {item.legacyItemNumber}</Text>
                )}
                <Text style={styles.itemDetail}>UPC: {item.upc}</Text>

                <View style={styles.quantityRow}>
                  <View style={styles.quantityBox}>
                    <Text style={styles.quantityLabel}>Expected</Text>
                    <Text style={styles.quantityValue}>{item.qtyExpected}</Text>
                  </View>
                  <View style={styles.quantityBox}>
                    <Text style={styles.quantityLabel}>Received</Text>
                    {editingItem === item.upc ? (
                      <View style={styles.editContainer}>
                        <TextInput
                          style={styles.editInput}
                          value={editQuantity}
                          onChangeText={setEditQuantity}
                          keyboardType="numeric"
                          autoFocus
                        />
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={() => handleSaveQuantity(item.upc)}
                        >
                          <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.quantityValue}>{item.qtyReceived}</Text>
                    )}
                  </View>
                  <View style={styles.quantityBox}>
                    <Text style={styles.quantityLabel}>Discrepancy</Text>
                    <Text style={[styles.quantityValue, getDiscrepancyStyle(item.discrepancy)]}>
                      {getDiscrepancyLabel(item.discrepancy)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.continueButton]}
            onPress={() => router.back()}
          >
            <Text style={styles.actionButtonText}>Continue Scanning</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={handleComplete}
          >
            <Text style={styles.actionButtonText}>Complete Shipment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel Shipment</Text>
          </TouchableOpacity>
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
    padding: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  warningValue: {
    color: '#FF9500',
  },
  overageValue: {
    color: '#34C759',
  },
  shortageValue: {
    color: '#FF3B30',
  },
  exportSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  exportButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exportButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  primaryExport: {
    backgroundColor: '#007AFF',
  },
  warningExport: {
    backgroundColor: '#FF9500',
  },
  overageExport: {
    backgroundColor: '#34C759',
  },
  shortageExport: {
    backgroundColor: '#FF3B30',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  itemsSection: {
    marginBottom: 20,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  editText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  itemDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  quantityRow: {
    flexDirection: 'row',
    marginTop: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  quantityBox: {
    flex: 1,
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  matchText: {
    color: '#34C759',
  },
  overageText: {
    color: '#FF9500',
  },
  shortageText: {
    color: '#FF3B30',
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  editInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 16,
    width: 60,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#34C759',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsSection: {
    gap: 10,
    marginBottom: 30,
  },
  actionButton: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#007AFF',
  },
  completeButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
