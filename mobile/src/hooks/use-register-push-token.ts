import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerPushToken } from '@/api/notifications';

/**
 * REQ-12 AC1: registers the device's Expo push token with the backend so
 * it can fan out push notifications alongside in-app ones. Best-effort and
 * silent on failure -- there is no physical device or EAS project
 * reachable from the sandbox this was built in, so this path is unverified
 * beyond its own error handling (see docs/tasks.md Phase 8).
 */
export function useRegisterPushToken(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    let cancelled = false;
    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted' || cancelled) return;

        const { data: token } = await Notifications.getExpoPushTokenAsync();
        if (!cancelled && token) {
          await registerPushToken(token);
        }
      } catch {
        // Best-effort -- see the module docstring above.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
