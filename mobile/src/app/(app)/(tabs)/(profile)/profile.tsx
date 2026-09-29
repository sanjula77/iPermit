import { FieldGroup, Host, ListItem, Text } from '@expo/ui';
import Constants from 'expo-constants';
import { Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing, tint } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import type { UserRole } from '@/types/auth';

// FieldGroup.Section already wraps each row in its own Material list item on
// Android; a transparent row avoids drawing a second box inside it.
const ROW_COLORS = { containerColor: 'transparent' };

const ROLE_LABEL: Record<UserRole, string> = {
  DRIVER: 'Driver',
  POLICE: 'Police Officer',
  ADMIN: 'Administrator',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();

  function confirmLogout() {
    Alert.alert('Log out of iPermit?', 'You will need to log in again to use the app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }

  const initial = (user?.email ?? '?').charAt(0).toUpperCase();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Who is signed in, at a glance, above the settings rows. */}
      <View
        style={[styles.identity, { backgroundColor: theme.backgroundElement, boxShadow: Shadows.card }]}
        testID="profile-identity"
      >
        <View style={[styles.avatar, { backgroundColor: tint(theme.brand) }]}>
          <ThemedText type="subtitle" themeColor="brand">
            {initial}
          </ThemedText>
        </View>
        <View style={styles.identityText}>
          <ThemedText numberOfLines={1}>{user?.email ?? ''}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {user ? ROLE_LABEL[user.role] : ''}
          </ThemedText>
        </View>
      </View>
      <Host style={{ flex: 1 }} seedColor={theme.primary}>
        {/* FieldGroup defaults to Material `surface` on Android; match the header/screen background. */}
        <FieldGroup style={{ backgroundColor: theme.background }}>
          <FieldGroup.Section title="Account">
            <ListItem colors={ROW_COLORS} trailing={<Text>{user?.email ?? ''}</Text>}>Email</ListItem>
            <ListItem colors={ROW_COLORS} trailing={<Text>{user?.nic ?? ''}</Text>}>NIC</ListItem>
            <ListItem colors={ROW_COLORS} trailing={<Text>{user ? ROLE_LABEL[user.role] : ''}</Text>}>Role</ListItem>
          </FieldGroup.Section>
          <FieldGroup.Section title="App">
            <ListItem colors={ROW_COLORS} trailing={<Text>{Constants.expoConfig?.version ?? ''}</Text>}>Version</ListItem>
          </FieldGroup.Section>
          <FieldGroup.Section>
            <ListItem colors={ROW_COLORS} onPress={confirmLogout} testID="logout-button">
              <Text textStyle={{ color: theme.danger }}>Log out</Text>
            </ListItem>
          </FieldGroup.Section>
        </FieldGroup>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    margin: Spacing.three,
    marginBottom: 0,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: { flex: 1, minWidth: 0, gap: Spacing.half },
});
