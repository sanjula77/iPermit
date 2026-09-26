import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { useUnreadNotificationCount } from '@/hooks/use-unread-notification-count';

export default function TabLayout() {
  const { user } = useAuth();
  const unreadCount = useUnreadNotificationCount();
  const theme = useTheme();
  const isDriver = user?.role === 'DRIVER';
  const isPolice = user?.role === 'POLICE';

  return (
    <NativeTabs
      // Android: show every tab's label (not only the selected one) and use the
      // app's neutral surface instead of Material's default seeded tint.
      labelVisibilityMode="labeled"
      backgroundColor={theme.backgroundElement}
      tintColor={theme.primary}
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(fines)" hidden={!isDriver}>
        <NativeTabs.Trigger.Icon sf={{ default: 'doc.text', selected: 'doc.text.fill' }} md="receipt_long" />
        <NativeTabs.Trigger.Label>Fines</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(police-verify)" hidden={!isPolice}>
        <NativeTabs.Trigger.Icon sf="qrcode.viewfinder" md="qr_code_scanner" />
        <NativeTabs.Trigger.Label>Verify</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(incidents)">
        <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} md="map" />
        <NativeTabs.Trigger.Label>Incidents</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(notifications)">
        <NativeTabs.Trigger.Icon sf={{ default: 'bell', selected: 'bell.fill' }} md="notifications" />
        <NativeTabs.Trigger.Label>Alerts</NativeTabs.Trigger.Label>
        {unreadCount > 0 ? (
          <NativeTabs.Trigger.Badge>{unreadCount > 9 ? '9+' : String(unreadCount)}</NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(profile)">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="account_circle"
        />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
