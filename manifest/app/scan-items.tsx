import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  Clipboard,
} from "react-native";
import { useRouter } from "expo-router";
import { Camera, CameraView, BarcodeScanningResult } from "expo-camera";
import { useAppSelector, useAppDispatch } from "../store/store";
import {
  addExpectedReceivedItem,
  addUnexpectedReceivedItem,
} from "../store/shipmentSlice";
import { ExpectedItem } from "../types/shipment";
import { pushReceivedItem } from "../services/syncService";
import Screen from "../components/Screen";

export default function ScanItemsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentShipment = useAppSelector(
    (state) => state.shipment.currentShipment
  );

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const isProcessingScanRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
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
      isProcessingScanRef.current = false;
      setIsProcessingScan(false);
      setScannerActive(true);
    }
  };

  const handleCopyShipmentId = () => {
    if (currentShipment) {
      Clipboard.setString(currentShipment.id);
      Alert.alert(
        "Copied!",
        `Shipment ID ${currentShipment.id} copied to clipboard`
      );
    }
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (isProcessingScanRef.current) {
      return;
    }

    isProcessingScanRef.current = true;
    setIsProcessingScan(true);
    setScannerActive(false);

    const item = currentShipment?.expectedItems.find(
      (item) => item.upc === data
    );

    if (item) {
      // Just populate search field, don't auto-select
      setSearchQuery(data);
      setTimeout(() => {
        isProcessingScanRef.current = false;
        setIsProcessingScan(false);
      }, 500);
    } else {
      Alert.alert(
        "Item Not Found",
        `UPC ${data} not found in expected items. Would you like to add it as an unexpected item?`,
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              isProcessingScanRef.current = false;
              setIsProcessingScan(false);
            },
          },
          {
            text: "Add Unexpected Item",
            onPress: () => {
              setShowUnexpectedItemForm(true);
              setUnexpectedItem((prev) => ({ ...prev, upc: data }));
              isProcessingScanRef.current = false;
              setIsProcessingScan(false);
            },
          },
        ],
        {
          onDismiss: () => {
            isProcessingScanRef.current = false;
            setIsProcessingScan(false);
          },
        }
      );
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Don't auto-select - user must manually select from results
    setSelectedItem(null);
  };

  const handleDocumentFilterChange = (docId: string) => {
    setSelectedDocumentId(docId);
    // Clear selected item when filter changes
    setSelectedItem(null);
  };

  const handleAddReceived = async () => {
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
      addExpectedReceivedItem({
        upc: selectedItem.upc,
        qtyReceived: qty,
      })
    );

    if (currentShipment) {
      pushReceivedItem(currentShipment.id, selectedItem.upc, qty).catch(
        (error) => {
          console.error("Failed to sync to server:", error);
        }
      );
    }

    Alert.alert("Success", `Added ${qty} of ${selectedItem.description}`);
    setSearchQuery("");
    setSelectedItem(null);
    setQuantity("");
  };

  const handleAddUnexpectedItem = async () => {
    if (!unexpectedItem.upc.trim()) {
      Alert.alert("Error", "Please enter a UPC");
      return;
    }

    const qty = parseInt(unexpectedItem.qtyReceived);
    if (!qty || qty <= 0) {
      Alert.alert("Error", "Please enter a valid quantity");
      return;
    }

    const upc = unexpectedItem.upc.trim();

    dispatch(
      addUnexpectedReceivedItem({
        upc,
        qtyReceived: qty,
        itemNumber: unexpectedItem.itemNumber,
        legacyItemNumber: unexpectedItem.legacyItemNumber,
        description: unexpectedItem.description,
      })
    );

    if (currentShipment) {
      pushReceivedItem(currentShipment.id, upc, qty).catch((error) => {
        console.error("Failed to sync to server:", error);
      });
    }

    const itemDesc = unexpectedItem.description.trim() || "Unexpected Item";
    Alert.alert("Success", `Added ${itemDesc} with UPC ${upc} (Qty: ${qty})`);

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

  // Get unique document IDs for filter
  const uniqueDocumentIds = Array.from(
    new Set(currentShipment?.expectedItems.map(item => item.documentId).filter(Boolean))
  ).sort();

  const filteredItems =
    currentShipment?.expectedItems.filter(
      (item) => {
        // Filter by document ID if selected
        if (selectedDocumentId && item.documentId !== selectedDocumentId) {
          return false;
        }

        // Filter by search query
        return (
          item.upc.includes(searchQuery) ||
          item.itemNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.legacyItemNumber
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
    ) || [];

  if (!currentShipment) {
    return null;
  }

  return (
    <Screen style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Scan or Search Items</Text>
          <Pressable
            style={styles.viewReceivedButton}
            onPress={() => router.push("/received-items")}
          >
            <Text style={styles.viewReceivedText}>
              View Received ({currentShipment.receivedItems.length})
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.shipmentIdBanner}
          onPress={handleCopyShipmentId}
        >
          <View style={styles.shipmentIdContent}>
            <Text style={styles.shipmentIdLabel}>
              Shipment ID (tap to copy):
            </Text>
            <Text style={styles.shipmentIdValue}>{currentShipment.id}</Text>
            <Text style={styles.shipmentIdHint}>
              Share this with other devices to join
            </Text>
          </View>
        </Pressable>

        <View style={styles.scanSection}>
          <Pressable
            style={styles.scanButton}
            onPress={requestCameraPermission}
          >
            <Text style={styles.scanButtonText}>📷 Scan Barcode</Text>
          </Pressable>
        </View>

        <View style={styles.searchSection}>
          <Text style={styles.sectionLabel}>Or Search Manually</Text>

          {uniqueDocumentIds.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Filter by Packing List:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.documentFilterScroll}
              >
                <Pressable
                  style={[
                    styles.documentFilterChip,
                    !selectedDocumentId && styles.documentFilterChipActive,
                  ]}
                  onPress={() => handleDocumentFilterChange("")}
                >
                  <Text
                    style={[
                      styles.documentFilterChipText,
                      !selectedDocumentId && styles.documentFilterChipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>
                {uniqueDocumentIds.map((docId) => (
                  <Pressable
                    key={docId}
                    style={[
                      styles.documentFilterChip,
                      selectedDocumentId === docId && styles.documentFilterChipActive,
                    ]}
                    onPress={() => handleDocumentFilterChange(docId as string)}
                  >
                    <Text
                      style={[
                        styles.documentFilterChipText,
                        selectedDocumentId === docId && styles.documentFilterChipTextActive,
                      ]}
                    >
                      {docId}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

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
              <Pressable
                key={index}
                style={[
                  styles.resultItem,
                  selectedItem?.upc === item.upc && styles.selectedResultItem,
                ]}
                onPress={() => setSelectedItem(item)}
              >
                <View style={styles.resultInfo}>
                  <Text style={styles.resultTitle}>{item.description}</Text>
                  {item.documentId && (
                    <Text style={styles.resultDocumentId}>
                      Packing List: {item.documentId}
                    </Text>
                  )}
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
              </Pressable>
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

              <Pressable style={styles.addButton} onPress={handleAddReceived}>
                <Text style={styles.addButtonText}>Add to Received</Text>
              </Pressable>
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
              <Pressable
                style={styles.addUnexpectedButton}
                onPress={() => setShowUnexpectedItemForm(true)}
              >
                <Text style={styles.addUnexpectedButtonText}>
                  + Add as Unexpected Item
                </Text>
              </Pressable>
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
                <Pressable
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
                </Pressable>

                <Pressable
                  style={styles.confirmButton}
                  onPress={handleAddUnexpectedItem}
                >
                  <Text style={styles.confirmButtonText}>Add to Received</Text>
                </Pressable>
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
                onBarcodeScanned={
                  scannerActive && !isProcessingScan
                    ? handleBarCodeScanned
                    : undefined
                }
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
                <Pressable
                  style={styles.closeButton}
                  onPress={() => setScannerActive(false)}
                >
                  <Text style={styles.closeButtonText}>Close Scanner</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </Modal>
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
  shipmentIdBanner: {
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#2196F3",
  },
  shipmentIdContent: {
    alignItems: "center",
  },
  shipmentIdLabel: {
    fontSize: 12,
    color: "#1976D2",
    fontWeight: "600",
    marginBottom: 5,
  },
  shipmentIdValue: {
    fontSize: 18,
    color: "#0D47A1",
    fontWeight: "bold",
    marginBottom: 5,
    fontFamily: "monospace",
  },
  shipmentIdHint: {
    fontSize: 11,
    color: "#1976D2",
    fontStyle: "italic",
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
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#666",
  },
  documentFilterScroll: {
    marginBottom: 8,
  },
  documentFilterChip: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  documentFilterChipActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  documentFilterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  documentFilterChipTextActive: {
    color: "white",
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
  resultDocumentId: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
    backgroundColor: "#E3F2FD",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 6,
    alignSelf: "flex-start",
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
