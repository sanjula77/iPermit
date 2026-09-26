import Constants from 'expo-constants';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerPushToken } from '@/api/notifications';

/**
 * REQ-12 AC1: registers the device's Expo push token with the backend so
 * it can fan out push notifications alongside in-app ones. Best-effort and
 * silent on failure. Verified live via Expo Go on a physical Android
 * device (see docs/tasks.md Phase 8) -- which is exactly how the guard
 * below was found: expo-notifications throws an uncaught error at import
 * time on Android when running inside literal Expo Go (not a dev-client
 * build), since Expo Go dropped Android push support in SDK 53+. Importing
 * the module is skipped entirely in that case rather than caught, since the
 * throw happens as a module-level side effect before any try/catch here
 * would run.
 */
export function useRegisterPushToken(enabled: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    if (Platform.OS === 'android' && Constants.appOwnership === 'expo') return;

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
