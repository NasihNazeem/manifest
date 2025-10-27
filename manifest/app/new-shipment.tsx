import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
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
import Screen from "../components/Screen";
import { Colors } from "../constants/theme";
import BackButton from "../components/BackButton";

export default function NewShipmentScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [pdfSelected, setPdfSelected] = useState(false);
  const [expectedItems, setExpectedItems] = useState<ExpectedItem[]>([]);
  const [documentIds, setDocumentIds] = useState<string[]>([]);

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
      date: new Date().toISOString().split("T")[0],
      documentIds,
      expectedItems,
      status: "in-progress" as const,
      createdAt: Date.now(),
    };

    dispatch(createShipment({ id: shipmentId, documentIds, expectedItems }));

    // Sync to server in background (don't block user)
    console.log("Syncing new shipment to server with ID:", shipmentId);
    syncShipmentToServer(shipmentId, shipmentData)
      .then((result) => {
        if (result.success) {
          console.log("✅ Successfully synced shipment to server");
        } else {
          console.error("❌ Failed to sync shipment to server:", result.error);
        }
      })
      .catch((error) => {
        console.error("❌ Error syncing shipment to server:", error);
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
    <Screen style={styles.container}>
      <View style={styles.backButtonContainer}>
        <BackButton />
        <Text style={styles.title}>New Shipment</Text>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Step 1: Upload Purchase Order PDF
          </Text>
          <Pressable
            style={styles.uploadButton}
            onPress={handlePickPDF}
            disabled={loading}
          >
            <Text style={styles.uploadButtonText}>
              {pdfSelected ? "PDF Selected ✓" : "Select PDF File"}
            </Text>
          </Pressable>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Processing PDF...</Text>
            </View>
          )}
        </View>

        {pdfSelected && !loading && (
          <>
            {documentIds.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Packing Lists Found ({documentIds.length})
                </Text>
                {documentIds.map((id, index) => (
                  <View key={index} style={styles.documentIdRow}>
                    <Text style={styles.documentIdText}>{id}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Expected Items ({expectedItems.length})
                </Text>
                <Pressable onPress={handleAddItem}>
                  <Text style={styles.addItemText}>+ Add Item</Text>
                </Pressable>
              </View>

              {expectedItems.map((item, index) => (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemNumber}>Item #{index + 1}</Text>
                    <Pressable onPress={() => handleRemoveItem(index)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </Pressable>
                  </View>

                  {item.documentId && (
                    <View style={styles.documentIdBadge}>
                      <Text style={styles.documentIdBadgeText}>
                        Packing List: {item.documentId}
                      </Text>
                    </View>
                  )}

                  <TextInput
                    style={styles.itemInput}
                    placeholder="Item Number *"
                    placeholderTextColor={Colors.placeholder}
                    value={item.itemNumber}
                    onChangeText={(value) =>
                      handleUpdateItem(index, "itemNumber", value)
                    }
                  />

                  <TextInput
                    style={styles.itemInput}
                    placeholder="Legacy Item Number (optional)"
                    placeholderTextColor={Colors.placeholder}
                    value={item.legacyItemNumber || ""}
                    onChangeText={(value) =>
                      handleUpdateItem(index, "legacyItemNumber", value)
                    }
                  />

                  <TextInput
                    style={styles.itemInput}
                    placeholder="Description *"
                    placeholderTextColor={Colors.placeholder}
                    value={item.description}
                    onChangeText={(value) =>
                      handleUpdateItem(index, "description", value)
                    }
                  />

                  <TextInput
                    style={styles.itemInput}
                    placeholder="UPC *"
                    placeholderTextColor={Colors.placeholder}
                    value={item.upc}
                    onChangeText={(value) =>
                      handleUpdateItem(index, "upc", value)
                    }
                    keyboardType="numeric"
                  />

                  <TextInput
                    style={styles.itemInput}
                    placeholder="Quantity Expected *"
                    placeholderTextColor={Colors.placeholder}
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
          <Pressable
            style={styles.floatingButton}
            onPress={handleStartShipment}
          >
            <Text style={styles.floatingButtonText}>Start Receiving Items</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 10,
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
    color: Colors.textPrimary,
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: Colors.textPrimary,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  uploadButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  uploadButtonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: "600",
  },
  demoButton: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: "center",
  },
  demoButtonText: {
    color: Colors.primary,
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
    color: Colors.textSecondary,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.surfaceElevated,
  },
  addButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: "center",
  },
  addButtonText: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: "600",
  },
  documentIdRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  documentIdText: {
    fontSize: 16,
    color: Colors.textPrimary,
    fontFamily: "monospace",
  },
  removeText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: "600",
  },
  addItemText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  itemCard: {
    backgroundColor: Colors.surfaceElevated,
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
    color: Colors.textSecondary,
  },
  documentIdBadge: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  documentIdBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textLight,
  },
  itemInput: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
    color: Colors.textPrimary,
  },
  startButton: {
    backgroundColor: Colors.success,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  startButtonText: {
    color: Colors.textLight,
    fontSize: 18,
    fontWeight: "bold",
  },
  floatingButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  floatingButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: Colors.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingButtonText: {
    color: Colors.textLight,
    fontSize: 18,
    fontWeight: "bold",
  },
});
