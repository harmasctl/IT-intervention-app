import { Stack } from "expo-router";

export default function DevicesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="categories" options={{ headerShown: false }} />
      <Stack.Screen name="models" options={{ headerShown: false }} />
      <Stack.Screen name="scan" options={{ headerShown: false }} />
      <Stack.Screen name="bulk-import" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
      <Stack.Screen name="create" options={{ headerShown: false }} />
      <Stack.Screen name="edit/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="maintenance" options={{ headerShown: false }} />
      <Stack.Screen name="maintenance/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="qr-codes" options={{ headerShown: false }} />
      <Stack.Screen name="transfers" options={{ headerShown: false }} />
    </Stack>
  );
}
