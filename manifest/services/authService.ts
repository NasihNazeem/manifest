import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_CONFIG } from "../config/api";

const SESSION_TOKEN_KEY = "session_token";
const USER_DATA_KEY = "user_data";

export interface User {
  id: string;
  username: string;
  name: string;
  isTempPasscode: boolean;
  lastLogin: number | null;
}

export interface LoginResponse {
  success: boolean;
  sessionToken?: string;
  expiresAt?: number;
  user?: User;
  error?: string;
}

export interface ChangePasscodeResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function login(
  username: string,
  passcode: string
): Promise<LoginResponse> {
  try {
    console.log("🔐 Login attempt:", { username, passcodeLength: passcode.length });
    console.log("📡 API URL:", `${API_CONFIG.BASE_URL}/api/auth/login`);

    const response = await fetch(`${API_CONFIG.BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, passcode }),
    });

    console.log("📥 Response status:", response.status);

    const result = await response.json();
    console.log("📦 Response data:", { success: result.success, hasToken: !!result.sessionToken, error: result.error });

    if (result.success && result.sessionToken) {
      await AsyncStorage.setItem(SESSION_TOKEN_KEY, result.sessionToken);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(result.user));
      console.log("✅ Login successful, session stored");
    } else {
      console.log("❌ Login failed:", result.error);
    }

    return result;
  } catch (error) {
    console.error("💥 Error during login:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function logout(): Promise<{ success: boolean }> {
  try {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);

    if (sessionToken) {
      await fetch(`${API_CONFIG.BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionToken }),
      });
    }

    // Clear local storage regardless of server response
    await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);

    return { success: true };
  } catch (error) {
    console.error("Error during logout:", error);
    await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_DATA_KEY);
    return { success: true };
  }
}

export async function changePasscode(
  currentPasscode: string,
  newPasscode: string
): Promise<ChangePasscodeResponse> {
  try {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);

    if (!sessionToken) {
      return {
        success: false,
        error: "Not logged in",
      };
    }

    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/auth/change-passcode`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionToken,
          currentPasscode,
          newPasscode,
        }),
      }
    );

    const result = await response.json();

    if (result.success) {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      if (userData) {
        const user = JSON.parse(userData);
        user.isTempPasscode = false;
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
      }
    }

    return result;
  } catch (error) {
    console.error("Error changing passcode:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

export async function getSessionToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  } catch (error) {
    console.error("Error getting session token:", error);
    return null;
  }
}

export async function getStoredUser(): Promise<User | null> {
  try {
    const userData = await AsyncStorage.getItem(USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  const sessionToken = await getSessionToken();
  return !!sessionToken;
}
