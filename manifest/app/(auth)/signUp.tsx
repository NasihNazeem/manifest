import * as React from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth, useSignUp } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import {
  ArrowLeft,
  Eye,
  EyeSlash,
  Spinner,
  WarningCircle,
} from "phosphor-react-native";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import axios from "axios";
import { getSupabaseClient } from "@/lib/supabase";
import { useAppDispatch } from "@/state/hooks";
import { setUser } from "@/state/slices/userSlice";
import { CurrentUser } from "@/types/user";

const schema = yup.object({
  email: yup
    .string()
    .required("Email is required")
    .email("Enter a valid email address"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must be at least 8 characters"),
});

type SignUpFormData = {
  email: string;
  password: string;
};

const SignUp = () => {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [hidePassword, setHidePassword] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState();
  const { getToken } = useAuth();
  const dispatch = useAppDispatch();

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<SignUpFormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onSubmit",
  });

  // Handle submission of sign-up form
  const onSignUpPress = async (data: SignUpFormData) => {
    const { email, password } = data;
    if (!isLoaded) return;

    console.log(email, password);

    // Start sign-up process using email and password provided
    try {
      await signUp.create({
        emailAddress: email,
        password,
      });

      // Send user an email with verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // Set 'pendingVerification' to true to display second form
      // and capture OTP code
      setPendingVerification(true);
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2));
    }
  };

  // Handle submission of verification form
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

  if (pendingVerification) {
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
  }

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
            <Text className="app-h1 text-base-white">Sign up</Text>
          </View>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => {
              return (
                <>
                  <Text className="app-body-sm mb-1.5 text-base-white">
                    Email
                  </Text>
                  <View
                    className={`mb-2 min-h-14 w-full flex-row items-center rounded-xl border ${errors.email ? "border-red-600" : "border-base-white"} px-2 py-2`}
                  >
                    <TextInput
                      autoCapitalize="none"
                      keyboardType="email-address"
                      className="flex-1 text-base-white placeholder:app-body"
                      onChangeText={(text) => {
                        onChange(text);
                        setErrorMessage("");
                        clearErrors();
                      }}
                      placeholder="Enter email"
                      placeholderTextColor="gray"
                      value={value}
                    />
                    {errors.email && (
                      <WarningCircle color="#dc2626" size={20} weight="bold" />
                    )}
                  </View>
                </>
              );
            }}
          />
          {errors.email && (
            <Text className="app-body-sm mb-4 text-red-600">
              {errors.email.message}
            </Text>
          )}

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <>
                <Text className="app-body-sm mb-1.5 text-base-white">
                  Password
                </Text>
                <View
                  className={`mb-2 min-h-14 flex-row items-center justify-between rounded-xl border ${errors.password || errorMessage ? "border-red-600" : "border-base-white"} px-3 py-2`}
                >
                  <TextInput
                    className="flex-1 text-base-white placeholder:app-body"
                    onChangeText={(text) => {
                      onChange(text);
                      setErrorMessage("");
                      clearErrors();
                    }}
                    autoCapitalize="none"
                    placeholder="Enter password"
                    placeholderTextColor="gray"
                    secureTextEntry={hidePassword}
                    value={value}
                  />
                  <Pressable
                    className="ml-2 flex-row gap-2"
                    onPress={() => setHidePassword(!hidePassword)}
                  >
                    {hidePassword ? (
                      <EyeSlash color="gray" size={20} weight="bold" />
                    ) : (
                      <Eye color="gray" size={20} weight="bold" />
                    )}
                    {(errors.password || errorMessage) && (
                      <WarningCircle color="#dc2626" size={20} weight="bold" />
                    )}
                  </Pressable>
                </View>
              </>
            )}
          />
          <View className="mb-5">
            <Text
              className={`app-body ${errors.password || errorMessage ? "text-red-600" : "text-gray-600"}`}
            >
              {errors.password
                ? errors.password.message
                : "Password must be at least 8 characters"}
            </Text>
            {errorMessage && (
              <Text className="app-body mb-4 text-red-600">{errorMessage}</Text>
            )}
          </View>

          <Pressable
            className="min-h-12 w-full items-center justify-center rounded-md bg-emerald-600"
            disabled={isLoading}
            onPress={handleSubmit(onSignUpPress)}
          >
            {isLoading ? (
              <Spinner />
            ) : (
              <Text className="app-h4 text-center text-base-white">
                SIGN UP
              </Text>
            )}
          </Pressable>

          <Text className="app-body my-5 flex-row flex-wrap text-gray-600">
            By signing up, you agree to our
            <Text className="text-emerald-600">{` Terms of Service `}</Text> and
            <Text className="text-emerald-600">{` Privacy Policy`}</Text>.
          </Text>

          <View className="flex-row items-center gap-2 pb-5">
            <View className="h-px flex-1 bg-gray-800" />
            <Text className="app-body-lg text-center text-gray-800">or</Text>
            <View className="h-px flex-1 bg-gray-800" />
          </View>
        </KeyboardAvoidingView>
      </Pressable>
    </SafeAreaView>
  );
};

export default SignUp;
