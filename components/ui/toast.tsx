import { Icon } from "@/components/ui/icon";
import { Colors, Radius, Spacing, Typography } from "@/constants/theme";
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error";
type ToastState = { message: string; type: ToastType } | null;

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastState>(null);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  const showToast = useCallback(
    (message: string, type: ToastType = "success") => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, type });
      opacity.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
      timer.current = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(-20, { duration: 200 });
      }, 2600);
    },
    [opacity, translateY],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const tone = toast?.type === "error" ? Colors.danger : Colors.accentBright;

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[styles.toast, { top: insets.top + Spacing.sm, borderColor: tone }, animatedStyle]}
        >
          <Icon
            name={toast.type === "error" ? "alert-circle-outline" : "check-circle-outline"}
            size={18}
            color={tone}
          />
          <Text style={styles.text}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
    zIndex: 999,
  },
  text: { ...Typography.bodyMedium, color: Colors.textPrimary, flexShrink: 1 },
});
