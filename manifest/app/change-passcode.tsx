import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "../store/store";
import { updateUser } from "../store/authSlice";
import { changePasscode } from "../services/authService";
import Screen from "../components/Screen";
import { Colors } from "../constants/theme";

export default function ChangePasscodeScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const [currentPasscode, setCurrentPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePasscode = async () => {
    // Validate inputs
    if (!currentPasscode.trim() || !newPasscode.trim() || !confirmPasscode.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // Validate passcode formats (4 digits)
    if (!/^\d{4}$/.test(currentPasscode.trim())) {
      Alert.alert("Error", "Current passcode must be exactly 4 digits");
      return;
    }

    if (!/^\d{4}$/.test(newPasscode.trim())) {
      Alert.alert("Error", "New passcode must be exactly 4 digits");
      return;
    }

    // Check if new passcode and confirmation match
    if (newPasscode.trim() !== confirmPasscode.trim()) {
      Alert.alert("Error", "New passcode and confirmation do not match");
      return;
    }

    // Check if new passcode is different from current
    if (newPasscode.trim() === currentPasscode.trim()) {
      Alert.alert("Error", "New passcode must be different from current passcode");
      return;
    }

    setLoading(true);

    try {
      const result = await changePasscode(currentPasscode.trim(), newPasscode.trim());

      if (result.success) {
        // Update Redux state to reflect passcode is no longer temporary
        dispatch(updateUser({ isTempPasscode: false }));

        Alert.alert(
          "Success",
          "Your passcode has been changed successfully",
          [
            {
              text: "OK",
              onPress: () => router.replace("/"),
            },
          ]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to change passcode");
      }
    } catch (error) {
      console.error("Change passcode error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (user?.isTempPasscode) {
      Alert.alert(
        "Required",
        "You must change your temporary passcode before continuing",
        [{ text: "OK" }]
      );
    } else {
      router.back();
    }
  };

  return (
    <Screen style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Change Passcode</Text>
          <Text style={styles.subtitle}>
            {user?.isTempPasscode
              ? "Please create a new 4-digit passcode"
              : "Update your security passcode"}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Current Passcode</Text>
            <TextInput
              style={styles.input}
              placeholder="****"
              placeholderTextColor={Colors.placeholder}
              value={currentPasscode}
              onChangeText={setCurrentPasscode}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Passcode</Text>
            <TextInput
              style={styles.input}
              placeholder="****"
              placeholderTextColor={Colors.placeholder}
              value={newPasscode}
              onChangeText={setNewPasscode}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm New Passcode</Text>
            <TextInput
              style={styles.input}
              placeholder="****"
              placeholderTextColor={Colors.placeholder}
              value={confirmPasscode}
              onChangeText={setConfirmPasscode}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              onSubmitEditing={handleChangePasscode}
            />
          </View>

          <Pressable
            style={[styles.changeButton, loading && styles.changeButtonDisabled]}
            onPress={handleChangePasscode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textLight} />
            ) : (
              <Text style={styles.changeButtonText}>Change Passcode</Text>
            )}
          </Pressable>

          {!user?.isTempPasscode && (
            <Pressable
              style={styles.cancelButton}
              onPress={handleSkip}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: "center",
    letterSpacing: 8,
  },
  changeButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  changeButtonDisabled: {
    opacity: 0.6,
  },
  changeButtonText: {
    color: Colors.textLight,
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
});
