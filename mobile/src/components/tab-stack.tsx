import { Stack } from 'expo-router';

// Header configuration shared by every tab's stack: large title on iOS,
// standard Material top app bar on Android. No shadow line -- the header
// already uses the screen background color (see the root navigation theme).
export function TabStack({ title }: { title: string }) {
  return <Stack screenOptions={{ title, headerLargeTitleEnabled: true, headerShadowVisible: false }} />;
}
