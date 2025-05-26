import { Stack } from "expo-router";

export default function RestaurantsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
      <Stack.Screen name="create" options={{ headerShown: false }} />
      <Stack.Screen name="bulk-import" options={{ headerShown: false }} />
      <Stack.Screen name="edit/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="device-map" options={{ headerShown: false }} />
      <Stack.Screen name="simple-map" options={{ headerShown: false }} />
    </Stack>
  );
}
