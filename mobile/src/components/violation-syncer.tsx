import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { syncPending } from '@/lib/violation-sync';

const RETRY_EVERY_MS = 30_000;

// Delivers an officer's queued violations in the background: when the phone
// regains a connection, when the app comes back to the front, and every 30
// seconds in case neither fired. Renders nothing; mounted once for police.
export function ViolationSyncer() {
  const { user } = useAuth();
  const officerId = user?.role === 'POLICE' ? user.id : null;

  useEffect(() => {
    if (!officerId) return;
    const run = () => {
      syncPending(officerId).catch(() => {});
    };
    run();
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) run();
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') run();
    });
    const timer = setInterval(run, RETRY_EVERY_MS);
    return () => {
      unsubscribeNet();
      appState.remove();
      clearInterval(timer);
    };
  }, [officerId]);

  return null;
}
