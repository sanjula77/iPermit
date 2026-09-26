import { Stack } from 'expo-router';

import { TabStack } from '@/components/tab-stack';

export default function IncidentsLayout() {
  return (
    <TabStack title="Incidents">
      <Stack.Screen name="incidents" />
      <Stack.Screen
        name="report"
        options={{ presentation: 'modal', title: 'Report', headerLargeTitleEnabled: false }}
      />
    </TabStack>
  );
}
