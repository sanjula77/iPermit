import { Redirect, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';
import { useBrandHeaderOptions } from '@/hooks/use-brand-header';
import { useRegisterPushToken } from '@/hooks/use-register-push-token';

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  useRegisterPushToken(!!user);
  const brandHeader = useBrandHeaderOptions();

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
    <>
      {/* Every signed-in screen has blue at the top (hero or app bar). */}
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="apply" options={{ ...brandHeader, headerShown: true, title: 'Apply for License' }} />
        <Stack.Screen name="police-driver" options={{ ...brandHeader, headerShown: true, title: 'Driver Details' }} />
      </Stack>
    </>
  );
}
