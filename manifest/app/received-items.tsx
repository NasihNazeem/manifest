import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppSelector, useAppDispatch } from "../store/store";
import {
  completeShipment,
  cancelShipment,
  deleteShipment,
  updateReceivedItemQuantity,
  selectAllItemsWithStatus,
} from "../store/shipmentSlice";
import {
  exportReceivedItems,
  exportDiscrepancies,
  exportOverages,
  exportShortages,
} from "../utils/exportUtils";
import { ReceivedItem } from "../types/shipment";
import { deleteShipmentOnServer } from "../services/syncService";
import Screen from "../components/Screen";

export default function ReceivedItemsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentShipment = useAppSelector(
    (state) => state.shipment.currentShipment
  );
  const allItems = useAppSelector(selectAllItemsWithStatus); // For stats calculation
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState("");

  // Filter to only show items that have been received, sorted by most recent first
  const receivedItems = currentShipment?.receivedItems
    .filter((item) => item.qtyReceived > 0)
    .sort((a, b) => (b.scannedAt || 0) - (a.scannedAt || 0)) || [];

  if (!currentShipment) {
    return (
      <Screen style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active shipment</Text>
        </View>
      </Screen>
    );
  }

  const handleComplete = () => {
    Alert.alert(
      "Complete Shipment",
      "Are you sure you want to complete this shipment? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: () => {
            dispatch(completeShipment());
            router.replace("/");
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Shipment",
      "Are you sure you want to cancel this shipment? All data will be lost.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            if (!currentShipment) return;

            // Delete from server first
            const result = await deleteShipmentOnServer(currentShipment.id);

            if (!result.success) {
              console.error(
                "Failed to delete shipment from server:",
                result.error
              );
              // Still delete locally even if server delete fails
            }

            // Clear local state
            dispatch(cancelShipment()); // Clear current shipment
            dispatch(deleteShipment(currentShipment.id)); // Remove from history
            router.replace("/");
          },
        },
      ]
    );
  };

  const handleExport = async (
    type: "all" | "discrepancies" | "overages" | "shortages"
  ) => {
    const date = currentShipment.date;

    // Check if there's data to export for specific types
    if (type === "overages" && stats.overages === 0) {
      Alert.alert("No Overages", "There are no overages to export.");
      return;
    }

    if (type === "shortages" && stats.shortages === 0) {
      Alert.alert("No Shortages", "There are no shortages to export.");
      return;
    }

    if (type === "discrepancies" && stats.discrepancies === 0) {
      Alert.alert("No Discrepancies", "There are no discrepancies to export.");
      return;
    }

    let success = false;

    switch (type) {
      case "all":
        success = await exportReceivedItems(allItems, `received_${date}.csv`);
        break;
      case "discrepancies":
        success = await exportDiscrepancies(
          allItems,
          `discrepancies_${date}.csv`
        );
        break;
      case "overages":
        success = await exportOverages(allItems, `overages_${date}.csv`);
        break;
      case "shortages":
        success = await exportShortages(allItems, `shortages_${date}.csv`);
        break;
    }

    // Only show error alert if export failed
    // Don't show success alert since we can't detect if user cancelled the share dialog
    if (!success) {
      Alert.alert("Error", "Failed to export data");
    }
  };

  const handleEditQuantity = (item: ReceivedItem) => {
    setEditingItem(item.upc);
    setEditQuantity(item.qtyReceived.toString());
  };

  const handleQuantityChange = (text: string) => {
    // Allow empty string for user to clear input
    if (text === "") {
      setEditQuantity("");
      return;
    }

    // Only allow non-negative numbers
    const numericValue = text.replace(/[^0-9]/g, "");
    setEditQuantity(numericValue);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditQuantity("");
  };

  const handleSaveQuantity = (upc: string) => {
    const qty = parseInt(editQuantity);

    // Validate: must be a valid number and >= 0
    if (isNaN(qty) || qty < 0) {
      Alert.alert(
        "Invalid Quantity",
        "Please enter a valid quantity (0 or greater)"
      );
      return;
    }

    // Update the quantity
    dispatch(updateReceivedItemQuantity({ upc, qtyReceived: qty }));

    // Reset edit state
    setEditingItem(null);
    setEditQuantity("");
  };

  const getDiscrepancyStyle = (discrepancy: number) => {
    if (discrepancy > 0) return styles.overageText;
    if (discrepancy < 0) return styles.shortageText;
    return styles.matchText;
  };

  const getDiscrepancyLabel = (discrepancy: number) => {
    if (discrepancy > 0) return `+${discrepancy}`;
    if (discrepancy < 0) return `${discrepancy}`;
    return "Match";
  };

  const stats = {
    totalExpected: currentShipment.expectedItems.length,
    totalReceived: allItems.filter((item) => item.qtyReceived > 0).length,
    discrepancies: allItems.filter((item) => item.discrepancy !== 0).length,
    overages: allItems.filter((item) => item.discrepancy > 0).length,
    shortages: allItems.filter((item) => item.discrepancy < 0).length,
  };

  return (
    <Screen style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalExpected}</Text>
            <Text style={styles.statLabel}>Expected Items</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalReceived}</Text>
            <Text style={styles.statLabel}>Received Items</Text>
          </View>
          <View style={styles.statBox}>
            <Text
              style={[
                styles.statValue,
                stats.discrepancies > 0 && styles.warningValue,
              ]}
            >
              {stats.discrepancies}
            </Text>
            <Text style={styles.statLabel}>Discrepancies</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, styles.overageValue]}>
              {stats.overages}
            </Text>
            <Text style={styles.statLabel}>Overages</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, styles.shortageValue]}>
              {stats.shortages}
            </Text>
            <Text style={styles.statLabel}>Shortages</Text>
          </View>
        </View>

        <View style={styles.exportSection}>
          <Text style={styles.sectionTitle}>Export Options</Text>
          <View style={styles.exportButtons}>
            <Pressable
              style={[styles.exportButton, styles.primaryExport]}
              onPress={() => handleExport("all")}
            >
              <Text style={styles.exportButtonText}>Export All</Text>
            </Pressable>
            <Pressable
              style={[styles.exportButton, styles.warningExport]}
              onPress={() => handleExport("discrepancies")}
            >
              <Text style={styles.exportButtonText}>
                Export Discrepancies
              </Text>
            </Pressable>
            <Pressable
              style={[styles.exportButton, styles.overageExport]}
              onPress={() => handleExport("overages")}
            >
              <Text style={styles.exportButtonText}>Export Overages</Text>
            </Pressable>
            <Pressable
              style={[styles.exportButton, styles.shortageExport]}
              onPress={() => handleExport("shortages")}
            >
              <Text style={styles.exportButtonText}>Export Shortages</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Received Items ({receivedItems.length})</Text>
          {receivedItems.length === 0 ? (
            <Text style={styles.emptyText}>No items received yet</Text>
          ) : (
            receivedItems.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <Pressable onPress={() => handleEditQuantity(item)}>
                    <Text style={styles.editText}>Edit</Text>
                  </Pressable>
                </View>

                <Text style={styles.itemDetail}>Item: {item.itemNumber}</Text>
                {item.legacyItemNumber && (
                  <Text style={styles.itemDetail}>
                    Legacy: {item.legacyItemNumber}
                  </Text>
                )}
                <Text style={styles.itemDetail}>UPC: {item.upc}</Text>

                {editingItem === item.upc ? (
                  <View style={styles.editModeContainer}>
                    <View style={styles.editInputRow}>
                      <View style={styles.editLabelContainer}>
                        <Text style={styles.editLabel}>
                          Update Received Quantity:
                        </Text>
                        <Text style={styles.editSubLabel}>
                          Expected: {item.qtyExpected}
                        </Text>
                      </View>
                      <TextInput
                        style={styles.editInput}
                        value={editQuantity}
                        onChangeText={handleQuantityChange}
                        keyboardType="numeric"
                        autoFocus
                        placeholder="0"
                      />
                    </View>
                    <View style={styles.editButtonRow}>
                      <Pressable
                        style={styles.cancelEditButton}
                        onPress={handleCancelEdit}
                      >
                        <Text style={styles.cancelEditButtonText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        style={styles.saveButton}
                        onPress={() => handleSaveQuantity(item.upc)}
                      >
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.quantityRow}>
                    <View style={styles.quantityBox}>
                      <Text style={styles.quantityLabel}>Expected</Text>
                      <Text style={styles.quantityValue}>
                        {item.qtyExpected}
                      </Text>
                    </View>
                    <View style={styles.quantityBox}>
                      <Text style={styles.quantityLabel}>Received</Text>
                      <Text style={styles.quantityValue}>
                        {item.qtyReceived}
                      </Text>
                    </View>
                    <View style={styles.quantityBox}>
                      <Text style={styles.quantityLabel}>Discrepancy</Text>
                      <Text
                        style={[
                          styles.quantityValue,
                          getDiscrepancyStyle(item.discrepancy),
                        ]}
                      >
                        {getDiscrepancyLabel(item.discrepancy)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <Pressable
          style={[styles.fab, styles.cancelFab]}
          onPress={handleCancel}
        >
          <Text style={styles.fabText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={[styles.fab, styles.continueFab]}
          onPress={() => router.back()}
        >
          <Text style={styles.fabText}>Continue Scanning</Text>
        </Pressable>

        <Pressable
          style={[styles.fab, styles.completeFab]}
          onPress={handleComplete}
        >
          <Text style={styles.fabText}>Complete</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 100, // Add padding to account for FABs
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
  },
  warningValue: {
    color: "#FF9500",
  },
  overageValue: {
    color: "#34C759",
  },
  shortageValue: {
    color: "#FF3B30",
  },
  exportSection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  exportButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  exportButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
  },
  primaryExport: {
    backgroundColor: "#007AFF",
  },
  warningExport: {
    backgroundColor: "#FF9500",
  },
  overageExport: {
    backgroundColor: "#34C759",
  },
  shortageExport: {
    backgroundColor: "#FF3B30",
  },
  exportButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  itemsSection: {
    marginBottom: 20,
  },
  itemCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  itemDescription: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  editText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  itemDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  quantityRow: {
    flexDirection: "row",
    marginTop: 8,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flex: 1,
    justifyContent: "space-between",
  },
  quantityBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  quantityLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  matchText: {
    color: "#34C759",
  },
  overageText: {
    color: "#FF9500",
  },
  shortageText: {
    color: "#FF3B30",
  },
  editModeContainer: {
    marginTop: 15,
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    padding: 15,
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  editInputRow: {
    marginBottom: 15,
  },
  editLabelContainer: {
    marginBottom: 10,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  editSubLabel: {
    fontSize: 12,
    color: "#666",
  },
  editInput: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: "600",
    width: "100%",
    textAlign: "center",
  },
  editButtonRow: {
    flexDirection: "row",
    gap: 10,
  },
  cancelEditButton: {
    flex: 1,
    backgroundColor: "#FF3B30",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelEditButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#34C759",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  fabContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "white",
    paddingTop: 10,
    paddingBottom: 40,
    paddingHorizontal: 15,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  fab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cancelFab: {
    backgroundColor: "#FF3B30",
  },
  continueFab: {
    backgroundColor: "#007AFF",
  },
  completeFab: {
    backgroundColor: "#34C759",
  },
  fabText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
});
