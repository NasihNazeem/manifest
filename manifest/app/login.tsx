import { useState, useRef } from "react";
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
  Image,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { useAppDispatch } from "../store/store";
import { setAuth } from "../store/authSlice";
import { login } from "../services/authService";
import Screen from "../components/Screen";
import { Colors } from "../constants/theme";
import { TouchableWithoutFeedback } from "react-native-gesture-handler";

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [username1, setUsername1] = useState("");
  const [username2, setUsername2] = useState("");
  const [username3, setUsername3] = useState("");
  const [username4, setUsername4] = useState("");
  const [passcode1, setPasscode1] = useState("");
  const [passcode2, setPasscode2] = useState("");
  const [passcode3, setPasscode3] = useState("");
  const [passcode4, setPasscode4] = useState("");
  const [loading, setLoading] = useState(false);

  // Refs for auto-focus
  const username2Ref = useRef<TextInput>(null);
  const username3Ref = useRef<TextInput>(null);
  const username4Ref = useRef<TextInput>(null);
  const passcode1Ref = useRef<TextInput>(null);
  const passcode2Ref = useRef<TextInput>(null);
  const passcode3Ref = useRef<TextInput>(null);
  const passcode4Ref = useRef<TextInput>(null);

  const handleUsernameChange = (value: string, position: number) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    switch (position) {
      case 1:
        setUsername1(value);
        if (value) username2Ref.current?.focus();
        break;
      case 2:
        setUsername2(value);
        if (value) username3Ref.current?.focus();
        break;
      case 3:
        setUsername3(value);
        if (value) username4Ref.current?.focus();
        break;
      case 4:
        setUsername4(value);
        if (value) passcode1Ref.current?.focus();
        break;
    }
  };

  const handleUsernameKeyPress = (key: string, position: number) => {
    if (key === 'Backspace') {
      switch (position) {
        case 2:
          if (!username2) {
            setUsername1('');
            // Focus handled by ref in setTimeout for reliability
            setTimeout(() => username2Ref.current?.blur(), 0);
          }
          break;
        case 3:
          if (!username3) {
            setUsername2('');
            username2Ref.current?.focus();
          }
          break;
        case 4:
          if (!username4) {
            setUsername3('');
            username3Ref.current?.focus();
          }
          break;
      }
    }
  };

  const handlePasscodeChange = (value: string, position: number) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    switch (position) {
      case 1:
        setPasscode1(value);
        if (value) passcode2Ref.current?.focus();
        break;
      case 2:
        setPasscode2(value);
        if (value) passcode3Ref.current?.focus();
        break;
      case 3:
        setPasscode3(value);
        if (value) passcode4Ref.current?.focus();
        break;
      case 4:
        setPasscode4(value);
        break;
    }
  };

  const handlePasscodeKeyPress = (key: string, position: number) => {
    if (key === 'Backspace') {
      switch (position) {
        case 1:
          // Don't jump back to username fields - just stay on passcode 1
          break;
        case 2:
          if (!passcode2) {
            setPasscode1('');
            passcode1Ref.current?.focus();
          }
          break;
        case 3:
          if (!passcode3) {
            setPasscode2('');
            passcode2Ref.current?.focus();
          }
          break;
        case 4:
          if (!passcode4) {
            setPasscode3('');
            passcode3Ref.current?.focus();
          }
          break;
      }
    }
  };

  const handleLogin = async () => {
    const username = username1 + username2 + username3 + username4;
    const passcode = passcode1 + passcode2 + passcode3 + passcode4;

    // Validate inputs
    if (username.length !== 4 || passcode.length !== 4) {
      Alert.alert("Error", "Please enter both username and passcode");
      return;
    }

    setLoading(true);

    try {
      const result = await login(username, passcode);

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
      <Pressable
        onPress={Keyboard.dismiss}
        style={styles.touchableWithoutFeedback}
      >
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.header}>
            <Image
              source={require("../assets/manifest-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Manifest</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.digitInputContainer}>
                <TextInput
                  style={styles.digitInput}
                  value={username1}
                  onChangeText={(value) => handleUsernameChange(value, 1)}
                  onKeyPress={({ nativeEvent }) => handleUsernameKeyPress(nativeEvent.key, 1)}
                  keyboardType="numeric"
                  maxLength={1}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  selectTextOnFocus
                />
                <TextInput
                  ref={username2Ref}
                  style={styles.digitInput}
                  value={username2}
                  onChangeText={(value) => handleUsernameChange(value, 2)}
                  onKeyPress={({ nativeEvent }) => handleUsernameKeyPress(nativeEvent.key, 2)}
                  keyboardType="numeric"
                  maxLength={1}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  selectTextOnFocus
                />
                <TextInput
                  ref={username3Ref}
                  style={styles.digitInput}
                  value={username3}
                  onChangeText={(value) => handleUsernameChange(value, 3)}
                  onKeyPress={({ nativeEvent }) => handleUsernameKeyPress(nativeEvent.key, 3)}
                  keyboardType="numeric"
                  maxLength={1}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  selectTextOnFocus
                />
                <TextInput
                  ref={username4Ref}
                  style={styles.digitInput}
                  value={username4}
                  onChangeText={(value) => handleUsernameChange(value, 4)}
                  onKeyPress={({ nativeEvent }) => handleUsernameKeyPress(nativeEvent.key, 4)}
                  keyboardType="numeric"
                  maxLength={1}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  selectTextOnFocus
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Passcode</Text>
              <View style={styles.digitInputContainer}>
                <TextInput
                  ref={passcode1Ref}
                  style={styles.digitInput}
                  value={passcode1}
                  onChangeText={(value) => handlePasscodeChange(value, 1)}
                  onKeyPress={({ nativeEvent }) => handlePasscodeKeyPress(nativeEvent.key, 1)}
                  keyboardType="numeric"
                  maxLength={1}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  selectTextOnFocus
                />
                <TextInput
                  ref={passcode2Ref}
                  style={styles.digitInput}
                  value={passcode2}
                  onChangeText={(value) => handlePasscodeChange(value, 2)}
                  onKeyPress={({ nativeEvent }) => handlePasscodeKeyPress(nativeEvent.key, 2)}
                  keyboardType="numeric"
                  maxLength={1}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  selectTextOnFocus
                />
                <TextInput
                  ref={passcode3Ref}
                  style={styles.digitInput}
                  value={passcode3}
                  onChangeText={(value) => handlePasscodeChange(value, 3)}
                  onKeyPress={({ nativeEvent }) => handlePasscodeKeyPress(nativeEvent.key, 3)}
                  keyboardType="numeric"
                  maxLength={1}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  selectTextOnFocus
                />
                <TextInput
                  ref={passcode4Ref}
                  style={styles.digitInput}
                  value={passcode4}
                  onChangeText={(value) => handlePasscodeChange(value, 4)}
                  onKeyPress={({ nativeEvent }) => handlePasscodeKeyPress(nativeEvent.key, 4)}
                  keyboardType="numeric"
                  maxLength={1}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  selectTextOnFocus
                  onSubmitEditing={handleLogin}
                />
              </View>
            </View>

            <Pressable
              style={[
                styles.loginButton,
                loading && styles.loginButtonDisabled,
              ]}
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
      </Pressable>
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
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
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
    marginHorizontal: 24,
    marginBottom: 8,
  },
  digitInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 24,
    gap: 28,
  },
  digitInput: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 18,
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.textPrimary,
    textAlign: "center",
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
  touchableWithoutFeedback: {
    flex: 1,
  },
});
