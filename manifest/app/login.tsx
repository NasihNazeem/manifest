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
import { useAppDispatch } from "../store/store";
import { setAuth } from "../store/authSlice";
import { login } from "../services/authService";
import Screen from "../components/Screen";
import { Colors } from "../constants/theme";

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Validate inputs
    if (!username.trim() || !passcode.trim()) {
      Alert.alert("Error", "Please enter both username and passcode");
      return;
    }

    // Validate username format (4 digits)
    if (!/^\d{4}$/.test(username.trim())) {
      Alert.alert("Error", "Username must be exactly 4 digits");
      return;
    }

    // Validate passcode format (4 digits)
    if (!/^\d{4}$/.test(passcode.trim())) {
      Alert.alert("Error", "Passcode must be exactly 4 digits");
      return;
    }

    setLoading(true);

    try {
      const result = await login(username.trim(), passcode.trim());

      if (result.success && result.user && result.sessionToken) {
        // Update Redux state
        dispatch(
          setAuth({
            user: result.user,
            sessionToken: result.sessionToken,
          })
        );

        // Check if user needs to change passcode
        if (result.user.isTempPasscode) {
          Alert.alert(
            "Welcome!",
            "Please change your temporary passcode to continue.",
            [
              {
                text: "OK",
                onPress: () => router.replace("/change-passcode"),
              },
            ]
          );
        } else {
          // Navigate to home
          router.replace("/");
        }
      } else {
        Alert.alert("Login Failed", result.error || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.container}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Manifest</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="4-digit code"
              placeholderTextColor={Colors.placeholder}
              value={username}
              onChangeText={setUsername}
              keyboardType="numeric"
              maxLength={4}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Passcode</Text>
            <TextInput
              style={styles.input}
              placeholder="4-digit passcode"
              placeholderTextColor={Colors.placeholder}
              value={passcode}
              onChangeText={setPasscode}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              onSubmitEditing={handleLogin}
            />
          </View>

          <Pressable
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.textLight} />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </Pressable>
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
    marginBottom: 50,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
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
  loginButton: {
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
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: Colors.textLight,
    fontSize: 18,
    fontWeight: "bold",
  },
});
