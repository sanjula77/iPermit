import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <ThemedView style={styles.form}>
        <ThemedText type="title">Welcome</ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Email</ThemedText>
          <ThemedText testID="home-email" selectable>
            {user?.email}
          </ThemedText>
          <ThemedText type="smallBold">NIC</ThemedText>
          <ThemedText testID="home-nic" selectable>
            {user?.nic}
          </ThemedText>
          <ThemedText type="smallBold">Role</ThemedText>
          <ThemedText testID="home-role" selectable>
            {user?.role}
          </ThemedText>
        </ThemedView>

        <Pressable
          style={[styles.button, { backgroundColor: theme.danger }]}
          onPress={logout}
          testID="logout-button"
        >
          <ThemedText type="smallBold" themeColor="onPrimary">
            Log out
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
