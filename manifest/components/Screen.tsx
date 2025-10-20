import React, { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ViewStyle,
} from "react-native";

interface ScreenProps {
  children: ReactNode;
  style?: ViewStyle;
  behavior?: "height" | "padding" | "position";
}

export default function Screen({ children, style, behavior }: ScreenProps) {
  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={behavior ?? (Platform.OS === "ios" ? "padding" : "height")}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
