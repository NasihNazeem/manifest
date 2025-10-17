import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Camera, CameraView, BarcodeScanningResult } from "expo-camera";
import { useAppSelector, useAppDispatch } from "../store/store";
import { addReceivedItem } from "../store/shipmentSlice";
import { ExpectedItem } from "../types/shipment";

export default function ScanItemsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentShipment = useAppSelector(
    (state) => state.shipment.currentShipment
  );

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<ExpectedItem | null>(null);
  const [quantity, setQuantity] = useState("");
  const [showUnexpectedItemForm, setShowUnexpectedItemForm] = useState(false);
  const [unexpectedItem, setUnexpectedItem] = useState({
    itemNumber: "",
    legacyItemNumber: "",
    description: "",
    upc: "",
    qtyReceived: "",
  });

  useEffect(() => {
    if (!currentShipment) {
      Alert.alert("Error", "No active shipment found");
      router.back();
    }
  }, [currentShipment]);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
    if (status === "granted") {
      setScannerActive(true);
    }
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    setScannerActive(false);
    const item = currentShipment?.expectedItems.find(
      (item) => item.upc === data
    );

    if (item) {
      setSelectedItem(item);
      setSearchQuery(data);
    } else {
      // Item not found - offer to add as unexpected item
      Alert.alert(
        "Item Not Found",
        `UPC ${data} not found in expected items. Would you like to add it as an unexpected item?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add Unexpected Item",
            onPress: () => {
              setShowUnexpectedItemForm(true);
              setUnexpectedItem((prev) => ({ ...prev, upc: data }));
            },
          },
        ]
      );
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSelectedItem(null);
      return;
    }

    // Search for items containing the query (UPC, Item Number, Legacy Number, or Description)
    const item = currentShipment?.expectedItems.find(
      (item) =>
        item.upc.includes(query) ||
        item.itemNumber.toLowerCase().includes(query.toLowerCase()) ||
        item.legacyItemNumber?.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
    );

    if (item) {
      setSelectedItem(item);
    } else {
      setSelectedItem(null);
    }
  };

  const handleAddReceived = () => {
    if (!selectedItem) {
      Alert.alert("Error", "No item selected");
      return;
    }

    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      Alert.alert("Error", "Please enter a valid quantity");
      return;
    }

    dispatch(
      addReceivedItem({
        upc: selectedItem.upc,
        qtyReceived: qty,
      })
    );

    Alert.alert("Success", `Added ${qty} of ${selectedItem.description}`);
    setSearchQuery("");
    setSelectedItem(null);
    setQuantity("");
  };

  const handleAddUnexpectedItem = () => {
    // Validate required fields - UPC is mandatory as single source of truth
    if (!unexpectedItem.upc.trim()) {
      Alert.alert("Error", "Please enter a UPC");
      return;
    }

    const qty = parseInt(unexpectedItem.qtyReceived);
    if (!qty || qty <= 0) {
      Alert.alert("Error", "Please enter a valid quantity");
      return;
    }

    dispatch(
      addReceivedItem({
        upc: unexpectedItem.upc.trim(),
        qtyReceived: qty,
      })
    );

    Alert.alert(
      "Success",
      `Added unexpected item with UPC ${unexpectedItem.upc.trim()} (Qty: ${qty})`
    );

    // Reset form
    setShowUnexpectedItemForm(false);
    setUnexpectedItem({
      itemNumber: "",
      legacyItemNumber: "",
      description: "",
      upc: "",
      qtyReceived: "",
    });
    setSearchQuery("");
  };

  const filteredItems =
    currentShipment?.expectedItems.filter(
      (item) =>
        item.upc.includes(searchQuery) ||
        item.itemNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.legacyItemNumber
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  if (!currentShipment) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Scan or Search Items</Text>
          <TouchableOpacity
            style={styles.viewReceivedButton}
            onPress={() => router.push("/received-items")}
          >
            <Text style={styles.viewReceivedText}>
              View Received ({currentShipment.receivedItems.length})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.scanSection}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={requestCameraPermission}
          >
            <Text style={styles.scanButtonText}>📷 Scan Barcode</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchSection}>
          <Text style={styles.sectionLabel}>Or Search Manually</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by UPC, Item #, Legacy #, or Description"
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
        </View>

        {searchQuery && filteredItems.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionLabel}>Search Results</Text>
            {filteredItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.resultItem,
                  selectedItem?.upc === item.upc && styles.selectedResultItem,
                ]}
                onPress={() => setSelectedItem(item)}
              >
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle}>{item.description}</Text>
                  <Text style={styles.resultDetail}>
                    Item: {item.itemNumber}
                  </Text>
                  {item.legacyItemNumber && (
                    <Text style={styles.resultDetail}>
                      Legacy: {item.legacyItemNumber}
                    </Text>
                  )}
                  <Text style={styles.resultDetail}>UPC: {item.upc}</Text>
                  <Text style={styles.resultDetail}>
                    Expected Qty: {item.qtyExpected}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {selectedItem && (
          <View style={styles.quantitySection}>
            <Text style={styles.sectionLabel}>Selected Item</Text>
            <View style={styles.selectedItemCard}>
              <Text style={styles.selectedItemTitle}>
                {selectedItem.description}
              </Text>
              <Text style={styles.selectedItemDetail}>
                UPC: {selectedItem.upc}
              </Text>
              <Text style={styles.selectedItemDetail}>
                Expected: {selectedItem.qtyExpected}
              </Text>

              <Text style={styles.quantityLabel}>Quantity Received:</Text>
              <TextInput
                style={styles.quantityInput}
                placeholder="Enter quantity"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddReceived}
              >
                <Text style={styles.addButtonText}>Add to Received</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {searchQuery &&
          filteredItems.length === 0 &&
          !showUnexpectedItemForm && (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>
                No items found matching "{searchQuery}"
              </Text>
              <TouchableOpacity
                style={styles.addUnexpectedButton}
                onPress={() => setShowUnexpectedItemForm(true)}
              >
                <Text style={styles.addUnexpectedButtonText}>
                  + Add as Unexpected Item
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {showUnexpectedItemForm && (
          <View style={styles.unexpectedItemSection}>
            <Text style={styles.sectionLabel}>Add Unexpected Item</Text>
            <View style={styles.unexpectedItemCard}>
              <Text style={styles.unexpectedItemHint}>
                Item not in expected shipment - UPC is required
              </Text>

              <TextInput
                style={styles.unexpectedInput}
                placeholder="UPC * (required)"
                value={unexpectedItem.upc}
                onChangeText={(text) =>
                  setUnexpectedItem((prev) => ({ ...prev, upc: text }))
                }
                keyboardType="numeric"
              />

              <TextInput
                style={styles.unexpectedInput}
                placeholder="Quantity Received * (required)"
                value={unexpectedItem.qtyReceived}
                onChangeText={(text) =>
                  setUnexpectedItem((prev) => ({ ...prev, qtyReceived: text }))
                }
                keyboardType="numeric"
              />

              <TextInput
                style={styles.unexpectedInput}
                placeholder="Item Number (optional)"
                value={unexpectedItem.itemNumber}
                onChangeText={(text) =>
                  setUnexpectedItem((prev) => ({ ...prev, itemNumber: text }))
                }
              />

              <TextInput
                style={styles.unexpectedInput}
                placeholder="Legacy Number (optional)"
                value={unexpectedItem.legacyItemNumber}
                onChangeText={(text) =>
                  setUnexpectedItem((prev) => ({
                    ...prev,
                    legacyItemNumber: text,
                  }))
                }
              />

              <TextInput
                style={styles.unexpectedInput}
                placeholder="Description (optional)"
                value={unexpectedItem.description}
                onChangeText={(text) =>
                  setUnexpectedItem((prev) => ({ ...prev, description: text }))
                }
              />

              <View style={styles.unexpectedButtonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowUnexpectedItemForm(false);
                    setUnexpectedItem({
                      itemNumber: "",
                      legacyItemNumber: "",
                      description: "",
                      upc: "",
                      qtyReceived: "",
                    });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleAddUnexpectedItem}
                >
                  <Text style={styles.confirmButtonText}>Add to Received</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={scannerActive}
        animationType="slide"
        onRequestClose={() => setScannerActive(false)}
      >
        <View style={styles.cameraContainer}>
          {hasPermission === false ? (
            <View style={styles.permissionContainer}>
              <Text style={styles.permissionText}>
                Camera permission denied
              </Text>
            </View>
          ) : (
            <>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: [
                    "upc_a",
                    "upc_e",
                    "ean13",
                    "ean8",
                    "code128",
                    "code39",
                  ],
                }}
              />
              <View style={styles.cameraOverlay}>
                <Text style={styles.cameraInstructions}>
                  Point camera at barcode
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setScannerActive(false)}
                >
                  <Text style={styles.closeButtonText}>Close Scanner</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  viewReceivedButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  viewReceivedText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  scanSection: {
    marginBottom: 20,
  },
  scanButton: {
    backgroundColor: "#34C759",
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  scanButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  searchSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  searchInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  resultsSection: {
    marginBottom: 20,
  },
  resultItem: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedResultItem: {
    borderColor: "#007AFF",
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  resultDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  quantitySection: {
    marginBottom: 20,
  },
  selectedItemCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  selectedItemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  selectedItemDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 8,
    color: "#333",
  },
  quantityInput: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 18,
    marginBottom: 15,
  },
  addButton: {
    backgroundColor: "#34C759",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  noResultsContainer: {
    padding: 20,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginBottom: 15,
  },
  addUnexpectedButton: {
    backgroundColor: "#FF9500",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addUnexpectedButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  unexpectedItemSection: {
    marginBottom: 20,
  },
  unexpectedItemCard: {
    backgroundColor: "#FFF5E6",
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: "#FF9500",
  },
  unexpectedItemHint: {
    fontSize: 14,
    color: "#FF9500",
    marginBottom: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  unexpectedInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 12,
  },
  unexpectedButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#FF9500",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
  },
  cameraInstructions: {
    color: "white",
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  closeButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionText: {
    color: "white",
    fontSize: 18,
  },
});
