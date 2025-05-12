import { Stack } from "expo-router";

export default function DevicesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Restaurant Devices" }} />
    </Stack>
  );
}
