import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface User {
  id: string;
  username: string;
  name: string;
  isTempPasscode: boolean;
  lastLogin: number | null;
}

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  sessionToken: null,
  isAuthenticated: false,
  isLoading: true, // Start as loading to check stored session
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Set user and session after successful login
    setAuth: (
      state,
      action: PayloadAction<{ user: User; sessionToken: string }>
    ) => {
      state.user = action.payload.user;
      state.sessionToken = action.payload.sessionToken;
      state.isAuthenticated = true;
      state.isLoading = false;
    },

    // Clear auth state on logout
    clearAuth: (state) => {
      state.user = null;
      state.sessionToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },

    // Update user data (e.g., after changing passcode)
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },

    // Set loading state
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Initialize auth from stored session
    initializeAuth: (
      state,
      action: PayloadAction<{
        user: User | null;
        sessionToken: string | null;
      }>
    ) => {
      state.user = action.payload.user;
      state.sessionToken = action.payload.sessionToken;
      state.isAuthenticated = !!(
        action.payload.user && action.payload.sessionToken
      );
      state.isLoading = false;
    },
  },
});

export const {
  setAuth,
  clearAuth,
  updateUser,
  setAuthLoading,
  initializeAuth,
} = authSlice.actions;

export default authSlice.reducer;
