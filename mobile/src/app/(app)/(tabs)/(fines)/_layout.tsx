import { Stack } from 'expo-router';

import { TabStack } from '@/components/tab-stack';

export default function FinesLayout() {
  return (
    <TabStack title="Fines">
      {/* The list draws its own hero; fine details keep the blue app bar. */}
      <Stack.Screen name="fines" options={{ headerShown: false }} />
      <Stack.Screen name="fine/[id]" />
    </TabStack>
  );
}
