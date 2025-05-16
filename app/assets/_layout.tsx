import { Stack } from "expo-router";

export default function AssetsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="create" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
      <Stack.Screen name="maintenance" options={{ headerShown: false }} />
      <Stack.Screen name="bulk-import" options={{ headerShown: false }} />
    </Stack>
  );
}
