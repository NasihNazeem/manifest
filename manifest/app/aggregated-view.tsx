import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  ArrowLeftIcon,
  DownloadSimpleIcon,
  WarningIcon,
  CubeIcon,
} from "phosphor-react-native";
import { fetchReceivedItemsForMerge } from "../services/syncService";
import {
  exportReceivedItems,
  exportDiscrepancies,
  exportOverages,
  exportShortages,
} from "../utils/exportUtils";

interface AggregatedItem {
  itemNumber: string;
  legacyItemNumber?: string;
  description: string;
  upc: string;
  qtyReceived: number;
  qtyExpected: number;
  discrepancy: number;
  documentId?: string;
  scannedByUsers: string[]; // Array of usernames who scanned this item
  scannedAt?: number;
}

export default function AggregatedViewScreen() {
  const { shipmentId, shipmentDate } = useLocalSearchParams<{
    shipmentId: string;
    shipmentDate: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AggregatedItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAggregatedData();
  }, [shipmentId]);

  const loadAggregatedData = async () => {
    if (!shipmentId) {
      setError("No shipment ID provided");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await fetchReceivedItemsForMerge(shipmentId);

      if (result.success) {
        // Transform to aggregated format with user arrays
        const aggregated: AggregatedItem[] = result.receivedItems.map(
          (item: any) => {
            // Handle both array and single value for backwards compatibility
            let usernames: string[] = [];
            if (Array.isArray(item.scannedByUsername)) {
              usernames = item.scannedByUsername;
            } else if (item.scannedByUsername) {
              usernames = [item.scannedByUsername];
            }

            return {
              itemNumber: item.itemNumber,
              legacyItemNumber: item.legacyItemNumber,
              description: item.description,
              upc: item.upc,
              qtyReceived: item.qtyReceived,
              qtyExpected: item.qtyExpected,
              discrepancy: item.discrepancy,
              documentId: item.documentId,
              scannedByUsers: usernames,
              scannedAt: item.scannedAt,
            };
          }
        );

        setItems(aggregated);
      } else {
        setError(result.error || "Failed to load aggregated data");
      }
    } catch (err) {
      console.error("Error loading aggregated data:", err);
      setError("Failed to load aggregated data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'all' | 'discrepancies' | 'overages' | 'shortages') => {
    try {
      let success = false;
      const baseFilename = `aggregated_${shipmentDate || shipmentId}`;

      switch (type) {
        case 'all':
          success = await exportReceivedItems(items, `${baseFilename}_all.csv`);
          break;
        case 'discrepancies':
          success = await exportDiscrepancies(items, `${baseFilename}_discrepancies.csv`);
          break;
        case 'overages':
          success = await exportOverages(items, `${baseFilename}_overages.csv`);
          break;
        case 'shortages':
          success = await exportShortages(items, `${baseFilename}_shortages.csv`);
          break;
      }

      // Note: success will be true if share dialog was shown, but we can't detect if user cancelled
      if (!success) {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (err) {
      console.error("Error exporting:", err);
      Alert.alert("Error", "Failed to export data");
    }
  };

  const totalReceived = items.reduce((sum, item) => sum + item.qtyReceived, 0);
  const totalExpected = items.reduce((sum, item) => sum + item.qtyExpected, 0);
  const totalDiscrepancy = totalReceived - totalExpected;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeftIcon size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aggregated View</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading aggregated data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeftIcon size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Aggregated View</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <WarningIcon size={64} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={loadAggregatedData}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeftIcon size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aggregated View</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>
          Shipment: {shipmentDate || shipmentId}
        </Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Expected</Text>
            <Text style={styles.summaryValue}>{totalExpected}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Received</Text>
            <Text style={styles.summaryValue}>{totalReceived}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Discrepancy</Text>
            <Text
              style={[
                styles.summaryValue,
                totalDiscrepancy !== 0 && styles.discrepancyValue,
              ]}
            >
              {totalDiscrepancy > 0 ? "+" : ""}
              {totalDiscrepancy}
            </Text>
          </View>
        </View>
        <Text style={styles.itemCount}>{items.length} unique items</Text>
      </View>

      {/* Export Buttons */}
      <View style={styles.exportSection}>
        <Text style={styles.exportLabel}>Export Options:</Text>
        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => handleExport('all')}
          >
            <DownloadSimpleIcon size={18} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>All Items</Text>
          </TouchableOpacity>

          {items.filter(i => i.discrepancy !== 0).length > 0 && (
            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonWarning]}
              onPress={() => handleExport('discrepancies')}
            >
              <DownloadSimpleIcon size={18} color="#FFFFFF" />
              <Text style={styles.exportButtonText}>Discrepancies</Text>
            </TouchableOpacity>
          )}

          {items.filter(i => i.discrepancy > 0).length > 0 && (
            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonSuccess]}
              onPress={() => handleExport('overages')}
            >
              <DownloadSimpleIcon size={18} color="#FFFFFF" />
              <Text style={styles.exportButtonText}>Overages</Text>
            </TouchableOpacity>
          )}

          {items.filter(i => i.discrepancy < 0).length > 0 && (
            <TouchableOpacity
              style={[styles.exportButton, styles.exportButtonError]}
              onPress={() => handleExport('shortages')}
            >
              <DownloadSimpleIcon size={18} color="#FFFFFF" />
              <Text style={styles.exportButtonText}>Shortages</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Items List */}
      <ScrollView style={styles.scrollView}>
        {items.map((item, index) => (
          <View key={`${item.upc}-${index}`} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNumber}>#{item.itemNumber}</Text>
              {item.discrepancy !== 0 && (
                <View style={styles.discrepancyBadge}>
                  <Text style={styles.discrepancyBadgeText}>
                    {item.discrepancy > 0 ? "+" : ""}
                    {item.discrepancy}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.itemDescription}>{item.description}</Text>

            <View style={styles.itemDetails}>
              <Text style={styles.itemUPC}>UPC: {item.upc}</Text>
              {item.legacyItemNumber && (
                <Text style={styles.itemLegacy}>
                  Legacy: {item.legacyItemNumber}
                </Text>
              )}
            </View>

            <View style={styles.itemQuantities}>
              <View style={styles.quantityBox}>
                <Text style={styles.quantityLabel}>Expected</Text>
                <Text style={styles.quantityValue}>{item.qtyExpected}</Text>
              </View>
              <View style={styles.quantityBox}>
                <Text style={styles.quantityLabel}>Received</Text>
                <Text style={styles.quantityValue}>{item.qtyReceived}</Text>
              </View>
            </View>

            {item.scannedByUsers.length > 0 && (
              <View style={styles.scannedBySection}>
                <Text style={styles.scannedByLabel}>Scanned by:</Text>
                <View style={styles.usersList}>
                  {item.scannedByUsers.map((user, idx) => (
                    <View key={idx} style={styles.userChip}>
                      <Text style={styles.userChipText}>{user}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        ))}

        {items.length === 0 && (
          <View style={styles.emptyState}>
            <CubeIcon size={64} color="#C7C7CC" />
            <Text style={styles.emptyText}>No items scanned yet</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
  },
  summary: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
  },
  discrepancyValue: {
    color: "#FF3B30",
  },
  itemCount: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
  },
  exportSection: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  exportLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  exportButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  exportButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  exportButtonWarning: {
    backgroundColor: "#FF9500",
  },
  exportButtonSuccess: {
    backgroundColor: "#34C759",
  },
  exportButtonError: {
    backgroundColor: "#FF3B30",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93",
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  discrepancyBadge: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discrepancyBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  itemDescription: {
    fontSize: 15,
    color: "#000000",
    marginBottom: 8,
  },
  itemDetails: {
    marginBottom: 12,
  },
  itemUPC: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 2,
  },
  itemLegacy: {
    fontSize: 13,
    color: "#8E8E93",
  },
  itemQuantities: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  quantityBox: {
    flex: 1,
    backgroundColor: "#F2F2F7",
    padding: 12,
    borderRadius: 8,
  },
  quantityLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 4,
  },
  quantityValue: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
  },
  scannedBySection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  scannedByLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 8,
  },
  usersList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  userChip: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  userChipText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93",
  },
});
