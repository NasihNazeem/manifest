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
import { Colors } from "../constants/theme";
import BackButton from "../components/BackButton";

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
  const searchInputRef = useRef<TextInput>(null);
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
      // Blur the search input to dismiss keyboard
      searchInputRef.current?.blur();
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
        documentId: selectedItem.documentId, // Include documentId for unique identification
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
    new Set(
      currentShipment?.expectedItems
        .map((item) => item.documentId)
        .filter(Boolean)
    )
  ).sort();

  const filteredItems =
    currentShipment?.expectedItems.filter((item) => {
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
    }) || [];

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
        <View style={styles.headerRow}>
          <BackButton />
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
                      !selectedDocumentId &&
                        styles.documentFilterChipTextActive,
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
                      selectedDocumentId === docId &&
                        styles.documentFilterChipActive,
                    ]}
                    onPress={() => handleDocumentFilterChange(docId as string)}
                  >
                    <Text
                      style={[
                        styles.documentFilterChipText,
                        selectedDocumentId === docId &&
                          styles.documentFilterChipTextActive,
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
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search by UPC, Item #, Legacy #, or Description"
            placeholderTextColor={Colors.placeholder}
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
                  selectedItem?.upc === item.upc &&
                    selectedItem?.documentId === item.documentId &&
                    styles.selectedResultItem,
                ]}
                onPress={() => {
                  setSelectedItem(item);
                  // Blur search input to dismiss keyboard
                  searchInputRef.current?.blur();
                }}
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
                placeholderTextColor={Colors.placeholder}
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
                placeholderTextColor={Colors.placeholder}
                value={unexpectedItem.upc}
                onChangeText={(text) =>
                  setUnexpectedItem((prev) => ({ ...prev, upc: text }))
                }
                keyboardType="numeric"
              />

              <TextInput
                style={styles.unexpectedInput}
                placeholder="Quantity Received * (required)"
                placeholderTextColor={Colors.placeholder}
                value={unexpectedItem.qtyReceived}
                onChangeText={(text) =>
                  setUnexpectedItem((prev) => ({ ...prev, qtyReceived: text }))
                }
                keyboardType="numeric"
              />

              <TextInput
                style={styles.unexpectedInput}
                placeholder="Item Number (optional)"
                placeholderTextColor={Colors.placeholder}
                value={unexpectedItem.itemNumber}
                onChangeText={(text) =>
                  setUnexpectedItem((prev) => ({ ...prev, itemNumber: text }))
                }
              />

              <TextInput
                style={styles.unexpectedInput}
                placeholder="Legacy Number (optional)"
                placeholderTextColor={Colors.placeholder}
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
                placeholderTextColor={Colors.placeholder}
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
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
  },
  header: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  viewReceivedButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  viewReceivedText: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: "600",
  },
  shipmentIdBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  shipmentIdContent: {
    alignItems: "center",
  },
  shipmentIdLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: "600",
    marginBottom: 5,
  },
  shipmentIdValue: {
    fontSize: 18,
    color: Colors.textLight,
    fontWeight: "bold",
    marginBottom: 5,
    fontFamily: "monospace",
  },
  shipmentIdHint: {
    fontSize: 11,
    color: Colors.textMuted,
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
    color: Colors.textPrimary,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: Colors.textSecondary,
  },
  documentFilterScroll: {
    marginBottom: 8,
  },
  documentFilterChip: {
    backgroundColor: Colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  documentFilterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  documentFilterChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  documentFilterChipTextActive: {
    color: Colors.textLight,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  resultsSection: {
    marginBottom: 20,
  },
  resultItem: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedResultItem: {
    borderColor: Colors.primary,
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  resultDocumentId: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textLight,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  resultDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  quantitySection: {
    marginBottom: 20,
  },
  selectedItemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  selectedItemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  selectedItemDetail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 8,
    color: Colors.textPrimary,
  },
  quantityInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 18,
    marginBottom: 15,
    color: Colors.textPrimary,
  },
  addButton: {
    backgroundColor: Colors.success,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: "bold",
  },
  noResultsContainer: {
    padding: 20,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 15,
  },
  addUnexpectedButton: {
    backgroundColor: Colors.warning,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addUnexpectedButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: "600",
  },
  unexpectedItemSection: {
    marginBottom: 20,
  },
  unexpectedItemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.warning,
  },
  unexpectedItemHint: {
    fontSize: 14,
    color: Colors.warning,
    marginBottom: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  unexpectedInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 12,
    color: Colors.textPrimary,
  },
  unexpectedButtonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.warning,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: {
    color: Colors.textLight,
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
    backgroundColor: Colors.error,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  closeButtonText: {
    color: Colors.textLight,
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
