import { useState } from "react";
import {
  Pressable,
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, WarningCircle } from "phosphor-react-native";
import { getSupabaseClient } from "@/lib/supabase";
import { setUser } from "@/state/slices/userSlice";
import { useAppDispatch } from "@/state/hooks";
import { useAuth, useSignUp } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";

const EmailVerification = () => {
  const { getToken } = useAuth();
  const { isLoaded, signUp, setActive } = useSignUp();
  const dispatch = useAppDispatch();
  const [code, setCode] = useState("");
  const router = useRouter();

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    try {
      // Use the code the user provided to attempt verification
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      });

      // If verification was completed, set the session to active
      // and redirect the user
      if (signUpAttempt.status === "complete") {
        await setActive({ session: signUpAttempt.createdSessionId });
        const token = await getToken({ template: "supabase" });

        if (!signUpAttempt.emailAddress) {
          console.error("Email address is null, cannot insert user.");
          return;
        }

        const user = {
          clerk_user_id: signUpAttempt.createdUserId,
          email: signUpAttempt.emailAddress,
          emailVerified: true,
          created_at: new Date().toISOString(),
          admin: true,
          username: signUpAttempt.emailAddress.split("@")[0],
        };

        if (token) {
          console.log("ID IS: " + signUpAttempt.createdUserId);
          console.log(token);

          const supabase = await getSupabaseClient(token);
          const { error } = await supabase.from("users").insert([user]);

          if (error) {
            console.error("Supabase insert error:", error.message);
          } else {
            console.log(user);
            dispatch(setUser(user));
          }
        }
      } else {
        // If the status is not complete, check why. User may need to
        // complete further steps.
        console.error(JSON.stringify(signUpAttempt, null, 2));
      }
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <SafeAreaView className="flex-1  bg-gray-950">
      <Pressable className="flex-1" onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          behavior="padding"
          className="flex-1 flex-col px-6 py-4"
        >
          <View className="my-20 flex-row items-center gap-4">
            <Pressable
              className="size-8 items-center justify-center rounded-md border border-gray-800 p-4"
              onPress={() => router.dismissAll()}
            >
              <ArrowLeft color="white" size={20} weight="bold" />
            </Pressable>
            <Text className="app-h1 text-base-white">Verify your email</Text>
          </View>
          <View
            className={`mb-2 min-h-14 w-full flex-row items-center rounded-xl border border-base-white px-2 py-2`}
          >
            <TextInput
              value={code}
              keyboardType="numeric"
              placeholder="Enter your verification code"
              onChangeText={(code) => setCode(code)}
              className="flex-1 text-base-white placeholder:app-body"
              placeholderClassName="flex-1 text-base-white app-body"
            />
          </View>
          <Pressable
            className="w-full rounded-md  min-h-10 justify-center items-center bg-emerald-600"
            onPress={onVerifyPress}
          >
            <Text className="app-h4 text-base-white">Verify</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </SafeAreaView>
  );
};

export default EmailVerification;
