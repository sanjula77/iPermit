import type { ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

// The standard screen body: the same side padding, section gap and bottom
// breathing room on every screen, with content capped at MaxContentWidth.
// Pass `ref` to scroll programmatically (e.g. back up to a result banner).
export function ScreenScroll({
  ref,
  gap = Spacing.four,
  children,
  ...rest
}: Omit<ScrollViewProps, 'style' | 'contentContainerStyle' | 'children'> & {
  ref?: Ref<ScrollView>;
  gap?: number;
  children: ReactNode;
}) {
  return (
    <ScrollView
      ref={ref}
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      {...rest}
    >
      <ThemedView style={[styles.body, { gap }]}>{children}</ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  body: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
});
