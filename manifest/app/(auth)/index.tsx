import { useRouter } from "expo-router";
import { View, Text, Pressable } from "react-native";

const Onboarding = () => {
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center bg-gray-950">
      <Text className="app-h2 text-base-white">Auth</Text>
      <View className="my-30 h-16" />
      <View className="flex w-full gap-4 px-8 pb-8">
        <Pressable
          className="w-full bg-emerald-600 rounded-md min-h-12 items-center justify-center"
          onPress={() => router.push("/login")}
        >
          <Text className="text-base-white app-h4">Login</Text>
        </Pressable>
        <Pressable
          className="w-full bg-emerald-600 rounded-md min-h-12 items-center justify-center"
          onPress={() => router.push("/signUp")}
        >
          <Text className="text-base-white app-h4">Sign Up</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default Onboarding;
