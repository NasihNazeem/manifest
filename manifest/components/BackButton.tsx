import { Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native";
import { Colors } from "../constants/theme";

interface BackButtonProps {
  onPress?: () => void;
}

export default function BackButton({ onPress }: BackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <Pressable style={styles.button} onPress={handlePress}>
      <CaretLeftIcon size={20} color={Colors.textPrimary} weight="bold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
});
