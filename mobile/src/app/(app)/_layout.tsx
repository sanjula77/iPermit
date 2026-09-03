import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';

export default function AppLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="apply" options={{ headerShown: true, title: 'Apply for License' }} />
      <Stack.Screen
        name="police-verify"
        options={{ headerShown: true, title: 'Verify Driver' }}
      />
      <Stack.Screen
        name="police-driver"
        options={{ headerShown: true, title: 'Driver Details' }}
      />
      <Stack.Screen name="fines" options={{ headerShown: true, title: 'Fines' }} />
    </Stack>
  );
}
