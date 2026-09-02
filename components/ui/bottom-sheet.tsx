import { Icon } from "@/components/ui/icon";
import { Colors, Spacing, Typography } from "@/constants/theme";
import { useEffect, type PropsWithChildren } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type BottomSheetProps = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title?: string;
}>;

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const progress = useSharedValue(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: 220 });
  }, [visible, progress]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * 400 }],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }, sheetStyle]}
      >
        <View style={styles.handle} />
        {title && (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
          </View>
        )}
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 2,
    borderTopColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    maxHeight: "85%",
  },
  handle: {
    alignSelf: "center",
    width: 32,
    height: 3,
    backgroundColor: Colors.lineStrong,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.h3, color: Colors.textPrimary },
});
