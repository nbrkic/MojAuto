import { StyleSheet, Text, View } from "react-native";

export default function ReminderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Servisi</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: { fontSize: 32, fontWeight: "bold" },
});
