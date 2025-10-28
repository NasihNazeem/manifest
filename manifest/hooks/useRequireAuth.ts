import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAppSelector } from '../store/store';

/**
 * Hook to protect routes that require authentication
 * Redirects to login if user is not authenticated
 * After login, user will be redirected back to intended route
 */
export function useRequireAuth() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Don't do anything while auth is loading
    if (isLoading) return;

    const onLoginScreen = segments[0] === 'login';
    const onChangePasscodeScreen = segments[0] === 'change-passcode';
    const inProtectedRoute =
      segments[0] === 'scan-items' ||
      segments[0] === 'received-items' ||
      segments[0] === 'history' ||
      segments[0] === 'new-shipment';

    // If user is not authenticated and trying to access protected route
    if (!isAuthenticated && inProtectedRoute) {
      // Redirect to login
      router.replace('/login');
    }

    // If user is authenticated and on login screen, redirect home
    if (isAuthenticated && onLoginScreen) {
      router.replace('/');
    }

    // If user is authenticated on change-passcode screen, only redirect if they don't have temp passcode
    if (isAuthenticated && onChangePasscodeScreen && !user?.isTempPasscode) {
      // User doesn't need to change passcode, redirect home
      router.replace('/');
    }

    // If user has temp passcode and tries to go to home or protected routes, redirect to change-passcode
    if (isAuthenticated && user?.isTempPasscode && !onChangePasscodeScreen && !onLoginScreen) {
      router.replace('/change-passcode');
    }
  }, [isAuthenticated, isLoading, segments, user?.isTempPasscode]);
}
