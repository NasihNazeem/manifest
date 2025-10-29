import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAppSelector, useAppDispatch } from "../store/store";
import {
  deleteShipment,
  loadShipmentsFromServer,
} from "../store/shipmentSlice";
import { exportReceivedItems, exportDiscrepancies } from "../utils/exportUtils";
import {
  deleteShipmentOnServer,
  fetchAllShipments,
} from "../services/syncService";
import Screen from "../components/Screen";
import BackButton from "../components/BackButton";
import { Colors } from "../constants/theme";

export default function HistoryScreen() {
  const dispatch = useAppDispatch();
  const shipments = useAppSelector((state) => state.shipment.shipments);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleDelete = (shipmentId: string) => {
    Alert.alert(
      "Delete Shipment",
      "Are you sure you want to delete this shipment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Delete from server first
            const result = await deleteShipmentOnServer(shipmentId);

            if (!result.success) {
              console.error(
                "Failed to delete shipment from server:",
                result.error
              );
              // Still delete locally even if server delete fails
            }

            // Delete from local state
            dispatch(deleteShipment(shipmentId));
          },
        },
      ]
    );
  };

  const handleExport = async (
    shipmentId: string,
    exportType: "all" | "discrepancies"
  ) => {
    const shipment = shipments.find((s) => s.id === shipmentId);
    if (!shipment || !shipment.receivedItems) return;

    const success =
      exportType === "all"
        ? await exportReceivedItems(
            shipment.receivedItems,
            `shipment_${shipment.date}_${shipment.id}.csv`
          )
        : await exportDiscrepancies(
            shipment.receivedItems,
            `discrepancies_${shipment.date}_${shipment.id}.csv`
          );

    // Only show error alert if export failed
    // Don't show success alert since we can't detect if user cancelled the share dialog
    if (!success) {
      Alert.alert("Error", "Failed to export shipment");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const calculateDiscrepancyCount = (shipment: any) => {
    if (!shipment.receivedItems || !Array.isArray(shipment.receivedItems)) {
      return 0;
    }
    return shipment.receivedItems.filter((item: any) => item.discrepancy !== 0)
      .length;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await fetchAllShipments();

      if (result.success && result.shipments) {
        // Ensure each shipment has the required arrays
        const completedShipments = result.shipments
          .filter((s) => s.status === "completed")
          .map((s) => ({
            ...s,
            expectedItems: s.expectedItems || [],
            receivedItems: s.receivedItems || [],
          }));

        dispatch(loadShipmentsFromServer(completedShipments));
        Alert.alert(
          "Success",
          `Refreshed ${completedShipments.length} completed shipment${
            completedShipments.length !== 1 ? "s" : ""
          }`
        );
      } else {
        Alert.alert("Error", result.error || "Failed to refresh shipments");
      }
    } catch (error) {
      console.error("Error refreshing shipments:", error);
      Alert.alert("Error", "Failed to refresh shipments from server");
    } finally {
      setIsRefreshing(false);
    }
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={styles.title}>Shipment History</Text>
        </View>
        {shipments.map((shipment) => (
          <View key={shipment.id} style={styles.shipmentCard}>
            <View style={styles.shipmentHeader}>
              <Text style={styles.shipmentDate}>{shipment.date}</Text>
              <Text style={styles.shipmentId}>#{shipment.id.slice(-6)}</Text>
            </View>

            <View style={styles.shipmentStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {shipment.expectedItems?.length || 0}
                </Text>
                <Text style={styles.statLabel}>Expected Items</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {shipment.receivedItems?.length || 0}
                </Text>
                <Text style={styles.statLabel}>Received Items</Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statValue,
                    calculateDiscrepancyCount(shipment) > 0 &&
                      styles.warningText,
                  ]}
                >
                  {calculateDiscrepancyCount(shipment)}
                </Text>
                <Text style={styles.statLabel}>Discrepancies</Text>
              </View>
            </View>

            {shipment.documentIds.length > 0 && (
              <View style={styles.documentIdsContainer}>
                <Text style={styles.documentIdsLabel}>Document IDs:</Text>
                <Text style={styles.documentIds}>
                  {shipment.documentIds.join(", ")}
                </Text>
              </View>
            )}

            <Text style={styles.timestamp}>
              Completed:{" "}
              {formatDate(shipment.completedAt || shipment.createdAt)}
            </Text>

            <View style={styles.actionsContainer}>
              <Pressable
                style={[styles.actionButton, styles.exportButton]}
                onPress={() => handleExport(shipment.id, "all")}
              >
                <Text style={styles.actionButtonText}>Export All</Text>
              </Pressable>

              {calculateDiscrepancyCount(shipment) > 0 && (
                <Pressable
                  style={[styles.actionButton, styles.warningButton]}
                  onPress={() => handleExport(shipment.id, "discrepancies")}
                >
                  <Text style={styles.actionButtonText}>
                    Export Discrepancies
                  </Text>
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

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        <Pressable
          style={styles.fab}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator color={Colors.textLight} size="small" />
          ) : (
            <Text style={styles.fabText}>Refresh Shipments</Text>
          )}
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Add padding to account for FAB
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.textMuted,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: "center",
  },
  shipmentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  shipmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  shipmentDate: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  shipmentId: {
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: "monospace",
  },
  shipmentStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  warningText: {
    color: Colors.warning,
  },
  documentIdsContainer: {
    marginBottom: 10,
  },
  documentIdsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  documentIds: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontFamily: "monospace",
  },
  timestamp: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 15,
  },
  actionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    flex: 1,
    minWidth: 100,
    alignItems: "center",
  },
  exportButton: {
    backgroundColor: Colors.primary,
  },
  warningButton: {
    backgroundColor: Colors.warning,
  },
  deleteButton: {
    backgroundColor: Colors.error,
  },
  actionButtonText: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: "600",
  },
  fabContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  fab: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: "600",
  },
});
