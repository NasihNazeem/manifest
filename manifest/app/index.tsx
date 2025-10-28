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
import {
  completeShipment,
  createShipment,
  cancelShipment,
  deleteShipment,
} from "../store/shipmentSlice";
import { clearAuth } from "../store/authSlice";
import { logout } from "../services/authService";
import { API_CONFIG } from "../config/api";
import {
  deleteShipmentOnServer,
  syncShipmentToServer,
} from "../services/syncService";
import Screen from "../components/Screen";
import { Colors } from "../constants/theme";

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
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
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
      // Create local shipment from server data with the same ID
      dispatch(
        createShipment({
          id: shipment.id,
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

  const handleComplete = () => {
    Alert.alert(
      "Complete Shipment",
      "Are you sure you want to complete this shipment? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            if (!currentShipment) return;

            console.log("Completing shipment with ID:", currentShipment.id);

            // First, ensure the shipment is synced to the server with latest data
            const syncResult = await syncShipmentToServer(currentShipment.id, {
              id: currentShipment.id,
              date: currentShipment.date,
              documentIds: currentShipment.documentIds,
              expectedItems: currentShipment.expectedItems,
              receivedItems: currentShipment.receivedItems,
              status: "completed",
              createdAt: currentShipment.createdAt,
              completedAt: Date.now(),
            });

            if (!syncResult.success) {
              console.error(
                "Failed to sync shipment completion to server:",
                syncResult.error
              );
              Alert.alert(
                "Warning",
                `Failed to sync completion to server: ${syncResult.error}\n\nShipment was completed locally.`
              );
            } else {
              console.log("Successfully synced completed shipment to server");
            }

            // Update local state
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

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
            dispatch(clearAuth());
            Alert.alert("Success", "Logged out successfully");
          },
        },
      ]
    );
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
        <View style={styles.header}>
          <Text style={styles.title}>Manifest</Text>
          {isAuthenticated && (
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </Pressable>
          )}
        </View>

        {isAuthenticated && user && (
          <View style={styles.userInfo}>
            <Text style={styles.userInfoText}>Logged in as: {user.name}</Text>
          </View>
        )}

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
                    <ActivityIndicator size="large" color={Colors.primary} />
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
      {currentShipment && (
        <View style={styles.fabContainer}>
          <Pressable
            style={[styles.fab, styles.cancelFab]}
            onPress={handleCancel}
          >
            <Text style={styles.fabText}>Cancel Shipment</Text>
          </Pressable>
          <Pressable
            style={[styles.fab, styles.completeFab]}
            onPress={handleComplete}
          >
            <Text style={styles.fabText}>Complete Shipment</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: Colors.error,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
  },
  logoutButtonText: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: "600",
  },
  userInfo: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  userInfoText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  fabContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "column",
    paddingTop: 10,
    paddingBottom: 40,
    paddingHorizontal: 30,
    gap: 10,
  },
  fab: {
    paddingVertical: 14,
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
  cancelFab: {
    backgroundColor: Colors.error,
  },
  completeFab: {
    backgroundColor: Colors.success,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 140,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.secondary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 15,
    color: Colors.textPrimary,
  },
  activeShipmentContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  shipmentInfo: {
    fontSize: 16,
    marginBottom: 8,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buttonText: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTextSecondary: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 30,
  },
  historySection: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  shipmentCount: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  joinButton: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.success,
  },
  joinButtonText: {
    color: Colors.success,
    fontSize: 16,
    fontWeight: "600",
  },
  joinForm: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    marginTop: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  joinFormTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: Colors.textPrimary,
  },
  joinFormHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 15,
  },
  loadingContainer: {
    padding: 30,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyHint: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: "center",
  },
  shipmentList: {
    marginBottom: 10,
  },
  shipmentCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.textPrimary,
  },
  statusBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: Colors.textLight,
    fontSize: 12,
    fontWeight: "600",
  },
  shipmentIdSmall: {
    fontSize: 11,
    color: Colors.textMuted,
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
