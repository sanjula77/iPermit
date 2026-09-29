import { Stack } from 'expo-router';

import { TabStack } from '@/components/tab-stack';

export default function PoliceVerifyLayout() {
  return (
    <TabStack title="Verify">
      {/* The screen draws its own hero. */}
      <Stack.Screen name="police-verify" options={{ headerShown: false }} />
    </TabStack>
  );
}
