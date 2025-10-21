import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppSelector, useAppDispatch } from "../store/store";
import { createShipment } from "../store/shipmentSlice";
import { API_CONFIG } from "../config/api";
import Screen from "../components/Screen";

interface ActiveShipment {
  id: string;
  date: string;
  documentIds: string[];
  expectedItems: any[];
  status: string;
  createdAt: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentShipment = useAppSelector(
    (state) => state.shipment.currentShipment
  );
  const shipments = useAppSelector((state) => state.shipment.shipments);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [activeShipments, setActiveShipments] = useState<ActiveShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingShipments, setFetchingShipments] = useState(false);

  // Fetch active shipments from server
  const fetchActiveShipments = async () => {
    setFetchingShipments(true);
    console.log(
      "🔍 Fetching active shipments from:",
      `${API_CONFIG.BASE_URL}/api/shipments`
    );

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/shipments`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Received shipments:", result);

      if (result.success && result.shipments) {
        // Filter for active (in-progress) shipments only
        const active = result.shipments.filter(
          (s: ActiveShipment) => s.status === "in-progress"
        );
        console.log("Active shipments found:", active.length);
        setActiveShipments(active);
      } else {
        console.log("No shipments in response");
        setActiveShipments([]);
      }
    } catch (error) {
      console.error("Error fetching active shipments:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert(
        "Connection Error",
        `Failed to fetch shipments: ${errorMessage}\n\nAPI: ${API_CONFIG.BASE_URL}`,
        [{ text: "OK" }]
      );
      setActiveShipments([]);
    } finally {
      setFetchingShipments(false);
    }
  };

  // Join a specific shipment
  const handleJoinShipment = async (shipment: ActiveShipment) => {
    setLoading(true);

    try {
      // Create local shipment from server data
      dispatch(
        createShipment({
          documentIds: shipment.documentIds,
          expectedItems: shipment.expectedItems,
        })
      );

      Alert.alert("Success", `Joined shipment from ${shipment.date}!`);
      setShowJoinForm(false);
      router.push("/scan-items");
    } catch (error) {
      console.error("Error joining shipment:", error);
      Alert.alert("Error", "Failed to join shipment.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch active shipments when join form is opened
  useEffect(() => {
    if (showJoinForm) {
      fetchActiveShipments();
    }
  }, [showJoinForm]);

  return (
    <Screen style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Manifest</Text>

        {currentShipment ? (
          <View style={styles.activeShipmentContainer}>
            <Text style={styles.sectionTitle}>Active Shipment</Text>
            <Text style={styles.shipmentInfo}>
              Date: {currentShipment.date}
            </Text>
            <Text style={styles.shipmentInfo}>
              Expected Items: {currentShipment.expectedItems.length}
            </Text>
            <Text style={styles.shipmentInfo}>
              Received Items: {currentShipment.receivedItems.length}
            </Text>

            <Pressable
              style={[styles.button, styles.primaryButton]}
              onPress={() => router.push("/scan-items")}
            >
              <Text style={styles.buttonText}>Continue Scanning</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.secondaryButton]}
              onPress={() => router.push("/received-items")}
            >
              <Text style={styles.buttonTextSecondary}>
                View Received Items
              </Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Pressable
              style={[styles.button, styles.primaryButton, styles.largeButton]}
              onPress={() => router.push("/new-shipment")}
            >
              <Text style={styles.buttonText}>Start New Shipment</Text>
            </Pressable>

            <Pressable
              style={[styles.button, styles.joinButton, styles.largeButton]}
              onPress={() => setShowJoinForm(!showJoinForm)}
            >
              <Text style={styles.joinButtonText}>
                {showJoinForm ? "Cancel" : "Join Existing Shipment"}
              </Text>
            </Pressable>

            {showJoinForm && (
              <View style={styles.joinForm}>
                <Text style={styles.joinFormTitle}>Active Shipments</Text>
                <Text style={styles.joinFormHint}>
                  Select a shipment to join and start receiving items
                </Text>

                {fetchingShipments ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>
                      Loading active shipments...
                    </Text>
                  </View>
                ) : activeShipments.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      No active shipments found
                    </Text>
                    <Text style={styles.emptyHint}>
                      Ask another device to upload a PDF and create a shipment
                    </Text>
                  </View>
                ) : (
                  <View style={styles.shipmentList}>
                    {activeShipments.map((shipment) => (
                      <Pressable
                        key={shipment.id}
                        style={styles.shipmentCard}
                        onPress={() => handleJoinShipment(shipment)}
                        disabled={loading}
                      >
                        <View style={styles.shipmentCardHeader}>
                          <Text style={styles.shipmentDate}>
                            {shipment.date}
                          </Text>
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>Active</Text>
                          </View>
                        </View>
                        <Text style={styles.shipmentInfo}>
                          Packing Lists: {shipment.documentIds.join(", ")}
                        </Text>
                        <Text style={styles.shipmentInfo}>
                          Expected Items: {shipment.expectedItems.length}
                        </Text>
                        <Text style={styles.shipmentIdSmall}>
                          ID: {shipment.id}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                <Pressable
                  style={[
                    styles.button,
                    styles.secondaryButton,
                    { marginTop: 15 },
                  ]}
                  onPress={fetchActiveShipments}
                  disabled={fetchingShipments}
                >
                  <Text style={styles.buttonTextSecondary}>
                    {fetchingShipments ? "Refreshing..." : "Refresh List"}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Recent Shipments</Text>
          {shipments.length > 0 ? (
            <>
              <Text style={styles.shipmentCount}>
                {shipments.length} completed shipment
                {shipments.length !== 1 ? "s" : ""}
              </Text>
              <Pressable
                style={[styles.button, styles.secondaryButton]}
                onPress={() => router.push("/history")}
              >
                <Text style={styles.buttonTextSecondary}>View History</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.emptyText}>No shipments yet</Text>
          )}
        </View>
      </ScrollView>
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    color: "#333",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333",
  },
  activeShipmentContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shipmentInfo: {
    fontSize: 16,
    marginBottom: 8,
    color: "#666",
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  largeButton: {
    paddingVertical: 20,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
  },
  secondaryButton: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextSecondary: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#ddd",
    marginVertical: 30,
  },
  historySection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shipmentCount: {
    fontSize: 16,
    color: "#666",
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    fontStyle: "italic",
  },
  joinButton: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#34C759",
  },
  joinButtonText: {
    color: "#34C759",
    fontSize: 16,
    fontWeight: "600",
  },
  joinForm: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginTop: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  joinFormTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  joinFormHint: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
  },
  loadingContainer: {
    padding: 30,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyHint: {
    fontSize: 13,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  shipmentList: {
    marginBottom: 10,
  },
  shipmentCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  shipmentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  shipmentDate: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  statusBadge: {
    backgroundColor: "#34C759",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  shipmentIdSmall: {
    fontSize: 11,
    color: "#999",
    marginTop: 5,
    fontFamily: "monospace",
  },
  disabledButton: {
    opacity: 0.6,
  },
  debugContainer: {
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ffc107",
  },
  debugText: {
    fontSize: 12,
    color: "#856404",
    fontFamily: "monospace",
  },
});
