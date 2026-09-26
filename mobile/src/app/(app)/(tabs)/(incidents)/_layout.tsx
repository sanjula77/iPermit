import { Stack } from 'expo-router';

import { TabStack } from '@/components/tab-stack';

// Keeps the list under the modal even when Report is opened directly (deep
// link), so closing it returns to Incidents instead of leaving the tab.
export const unstable_settings = { initialRouteName: 'incidents' };

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
