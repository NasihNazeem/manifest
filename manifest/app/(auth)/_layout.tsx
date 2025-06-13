import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";

const AuthLayout = () => {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Redirect href={"/(protected)"} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signUp" />
    </Stack>
  );
};

export default AuthLayout;
