import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title">Welcome</ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Email</ThemedText>
          <ThemedText testID="home-email">{user?.email}</ThemedText>
          <ThemedText type="smallBold">NIC</ThemedText>
          <ThemedText testID="home-nic">{user?.nic}</ThemedText>
          <ThemedText type="smallBold">Role</ThemedText>
          <ThemedText testID="home-role">{user?.role}</ThemedText>
        </ThemedView>

        <Pressable style={styles.button} onPress={logout} testID="logout-button">
          <ThemedText type="smallBold" style={styles.buttonText}>
            Log out
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.four,
    width: '100%',
    maxWidth: 800,
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
    backgroundColor: '#d92d20',
  },
  buttonText: { color: '#ffffff' },
});
