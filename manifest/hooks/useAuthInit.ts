import { useEffect } from 'react';
import { useAppDispatch } from '../store/store';
import { initializeAuth } from '../store/authSlice';
import { getSessionToken, getStoredUser } from '../services/authService';

/**
 * Hook to initialize auth state from AsyncStorage on app start
 * Call this in your root layout or app component
 */
export function useAuthInit() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get stored session and user data
        const sessionToken = await getSessionToken();
        const user = await getStoredUser();

        // Initialize Redux auth state
        dispatch(initializeAuth({ user, sessionToken }));
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Initialize with null values if error
        dispatch(initializeAuth({ user: null, sessionToken: null }));
      }
    };

    initAuth();
  }, [dispatch]);
}
