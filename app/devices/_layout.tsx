import { Stack } from "expo-router";

export default function DevicesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Restaurant Devices" }} />
      <Stack.Screen name="scan" options={{ headerShown: false }} />
      <Stack.Screen
        name="bulk-import"
        options={{ title: "Bulk Device Import" }}
      />
      <Stack.Screen
        name="categories"
        options={{ title: "Device Categories" }}
      />
    </Stack>
  );
}
