import { Redirect } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { ThemedView } from '@/components/themed-view';

export default function RootIndex() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return <Redirect href={user ? '/(app)' : '/(auth)/login'} />;
}
