import type { ReactNode } from 'react';
import { Stack } from 'expo-router';

// Header configuration shared by every tab's stack: large title on iOS,
// standard Material top app bar on Android. No shadow line -- the header
// already uses the screen background color (see the root navigation theme).
//
// Pass <Stack.Screen> children to configure extra screens in the tab (e.g. a
// modal). Declare the tab's main screen first: the first declared screen is the
// stack's initial route.
export function TabStack({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Stack screenOptions={{ title, headerLargeTitleEnabled: true, headerShadowVisible: false }}>
      {children}
    </Stack>
  );
}
