import type { ReactNode } from 'react';
import { Stack } from 'expo-router';

import { useBrandHeaderOptions } from '@/hooks/use-brand-header';

// Header configuration shared by every tab's stack: the style-B blue app bar.
//
// Pass <Stack.Screen> children to configure extra screens in the tab (e.g. a
// modal). Declare the tab's main screen first: the first declared screen is the
// stack's initial route.
export function TabStack({ title, children }: { title: string; children?: ReactNode }) {
  const brandHeader = useBrandHeaderOptions();
  return <Stack screenOptions={{ title, ...brandHeader }}>{children}</Stack>;
}
