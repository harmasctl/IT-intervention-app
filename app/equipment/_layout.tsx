import React from "react";
import { Stack } from "expo-router";

export default function EquipmentLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="history" options={{ headerShown: false }} />
      <Stack.Screen name="suppliers" options={{ headerShown: false }} />
      <Stack.Screen name="warehouses" options={{ headerShown: false }} />
      <Stack.Screen name="types" options={{ headerShown: false }} />
      <Stack.Screen name="bulk-movement" options={{ headerShown: false }} />
      <Stack.Screen name="reports" options={{ headerShown: false }} />
      <Stack.Screen name="low-stock" options={{ headerShown: false }} />
      <Stack.Screen name="purchase-order" options={{ headerShown: false }} />
    </Stack>
  );
}
