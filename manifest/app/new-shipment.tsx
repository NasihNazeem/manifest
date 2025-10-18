import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useAppDispatch } from "../store/store";
import { createShipment } from "../store/shipmentSlice";
import {
  parsePdfFile,
  createMockExpectedItems,
  createMockDocumentIds,
} from "../utils/pdfParser";
import { ExpectedItem } from "../types/shipment";
import { syncShipmentToServer } from "../services/syncService";

export default function NewShipmentScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [pdfSelected, setPdfSelected] = useState(false);
  const [expectedItems, setExpectedItems] = useState<ExpectedItem[]>([]);
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [manualDocId, setManualDocId] = useState("");

  const handlePickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      setLoading(true);
      setPdfSelected(true);

      const file = result.assets[0];
      const parsed = await parsePdfFile(file.uri);

      if (parsed.error) {
        // Since PDF parsing requires backend service, show demo option
        Alert.alert(
          "PDF Parsing Note",
          "PDF parsing requires a backend service. Would you like to use demo data for testing?",
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => {
                setPdfSelected(false);
                setLoading(false);
              },
            },
            {
              text: "Use Demo Data",
              onPress: () => {
                const mockItems = createMockExpectedItems();
                setExpectedItems(mockItems);
                setDocumentIds(createMockDocumentIds());
                setLoading(false);
              },
            },
          ]
        );
      } else {
        setExpectedItems(parsed.expectedItems);
        setDocumentIds(parsed.documentIds);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error picking PDF:", error);
      Alert.alert("Error", "Failed to load PDF file");
      setPdfSelected(false);
      setLoading(false);
    }
  };

  const handleAddDocumentId = () => {
    if (manualDocId.trim()) {
      setDocumentIds([...documentIds, manualDocId.trim()]);
      setManualDocId("");
    }
  };

  const handleRemoveDocumentId = (index: number) => {
    setDocumentIds(documentIds.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    const newItem: ExpectedItem = {
      itemNumber: "",
      description: "",
      upc: "",
      qtyExpected: 0,
    };
    setExpectedItems([...expectedItems, newItem]);
  };

  const handleUpdateItem = (
    index: number,
    field: keyof ExpectedItem,
    value: string
  ) => {
    const updated = [...expectedItems];
    if (field === "qtyExpected") {
      updated[index][field] = parseInt(value) || 0;
    } else {
      (updated[index] as any)[field] = value;
    }
    setExpectedItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setExpectedItems(expectedItems.filter((_, i) => i !== index));
  };

  const handleStartShipment = async () => {
    if (expectedItems.length === 0) {
      Alert.alert("Error", "Please add at least one expected item");
      return;
    }

    const invalidItems = expectedItems.filter(
      (item) =>
        !item.itemNumber ||
        !item.description ||
        !item.upc ||
        item.qtyExpected < 0
    );

    if (invalidItems.length > 0) {
      Alert.alert("Error", "Please fill in all fields for each item");
      return;
    }

    // Create shipment locally
    const shipmentId = Date.now().toString();
    const shipmentData = {
      id: shipmentId,
      date: new Date().toISOString().split('T')[0],
      documentIds,
      expectedItems,
      status: 'in-progress' as const,
      createdAt: Date.now(),
    };

    dispatch(createShipment({ documentIds, expectedItems }));

    // Sync to server in background (don't block user)
    syncShipmentToServer(shipmentId, shipmentData).catch(error => {
      console.error('Failed to sync shipment to server:', error);
      // Shipment still works locally even if sync fails
    });

    router.replace("/scan-items");
  };

  const handleUseDemoData = () => {
    const mockItems = createMockExpectedItems();
    setExpectedItems(mockItems);
    setDocumentIds(createMockDocumentIds());
    setPdfSelected(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>New Shipment</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Step 1: Upload Purchase Order PDF
          </Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handlePickPDF}
            disabled={loading}
          >
            <Text style={styles.uploadButtonText}>
              {pdfSelected ? "PDF Selected ✓" : "Select PDF File"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.demoButton}
            onPress={handleUseDemoData}
          >
            <Text style={styles.demoButtonText}>
              Or Use Demo Data for Testing
            </Text>
          </TouchableOpacity>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Processing PDF...</Text>
            </View>
          )}
        </View>

        {pdfSelected && !loading && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Document IDs</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Document ID"
                  value={manualDocId}
                  onChangeText={setManualDocId}
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={handleAddDocumentId}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>

              {documentIds.map((id, index) => (
                <View key={index} style={styles.documentIdRow}>
                  <Text style={styles.documentIdText}>{id}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveDocumentId(index)}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Expected Items ({expectedItems.length})
                </Text>
                <TouchableOpacity onPress={handleAddItem}>
                  <Text style={styles.addItemText}>+ Add Item</Text>
                </TouchableOpacity>
              </View>

              {expectedItems.map((item, index) => (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemNumber}>Item #{index + 1}</Text>
                    <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={styles.itemInput}
                    placeholder="Item Number *"
                    value={item.itemNumber}
                    onChangeText={(value) =>
                      handleUpdateItem(index, "itemNumber", value)
                    }
                  />

                  <TextInput
                    style={styles.itemInput}
                    placeholder="Legacy Item Number (optional)"
                    value={item.legacyItemNumber || ""}
                    onChangeText={(value) =>
                      handleUpdateItem(index, "legacyItemNumber", value)
                    }
                  />

                  <TextInput
                    style={styles.itemInput}
                    placeholder="Description *"
                    value={item.description}
                    onChangeText={(value) =>
                      handleUpdateItem(index, "description", value)
                    }
                  />

                  <TextInput
                    style={styles.itemInput}
                    placeholder="UPC *"
                    value={item.upc}
                    onChangeText={(value) =>
                      handleUpdateItem(index, "upc", value)
                    }
                    keyboardType="numeric"
                  />

                  <TextInput
                    style={styles.itemInput}
                    placeholder="Quantity Expected *"
                    value={item.qtyExpected.toString()}
                    onChangeText={(value) =>
                      handleUpdateItem(index, "qtyExpected", value)
                    }
                    keyboardType="numeric"
                  />
                </View>
              ))}
            </View>

            {/* Add bottom padding for floating button */}
            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {/* Floating Action Button - appears after PDF is parsed */}
      {pdfSelected && !loading && expectedItems.length > 0 && (
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={handleStartShipment}
          >
            <Text style={styles.floatingButtonText}>
              Start Receiving Items
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  uploadButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  uploadButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  demoButton: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007AFF",
    alignItems: "center",
  },
  demoButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: "center",
  },
  addButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  documentIdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  documentIdText: {
    fontSize: 16,
    color: "#333",
    fontFamily: "monospace",
  },
  removeText: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "600",
  },
  addItemText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  itemCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  itemInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  startButton: {
    backgroundColor: "#34C759",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  startButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  floatingButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "rgba(245, 245, 245, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingButton: {
    backgroundColor: "#34C759",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
