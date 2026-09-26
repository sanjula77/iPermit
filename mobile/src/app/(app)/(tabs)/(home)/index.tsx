import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { getMyBadge } from '@/api/badges';
import { listApplications } from '@/api/applications';
import { ApiError, extractErrorMessage } from '@/api/client';
import { getMyLicense } from '@/api/licenses';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { LicenseCard } from '@/components/license-card';
import { ScreenState } from '@/components/screen-state';
import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import type { Application } from '@/types/application';
import type { Badge } from '@/types/badge';
import type { License } from '@/types/license';

export default function HomeScreen() {
  const { user } = useAuth();

  if (user?.role === 'POLICE') {
    return <PoliceHomeScreen />;
  }

  return <DriverHomeScreen />;
}

function PoliceHomeScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <ThemedView style={styles.form}>
        <ThemedText themeColor="textSecondary">
          Use the Verify tab to check a driver&apos;s license by face or QR code.
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

function DriverHomeScreen() {
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // undefined = not loaded yet; null = loaded, driver has no license.
  const [license, setLicense] = useState<License | null | undefined>(undefined);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [badge, setBadge] = useState<Badge | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadApplications = useCallback(async () => {
    try {
      setApplications(await listApplications());
      setLoadError(null);
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }, []);

  const loadLicense = useCallback(async () => {
    try {
      setLicense(await getMyLicense());
      setLicenseError(null);
    } catch (err) {
      // No license yet is expected (not every driver has one) -- only
      // surface genuine errors, not the routine 404.
      if (err instanceof ApiError && err.status === 404) {
        setLicense(null);
        setLicenseError(null);
      } else {
        setLicenseError(extractErrorMessage(err));
      }
    }
  }, []);

  const loadBadge = useCallback(async () => {
    // No badge yet (e.g. no license) is a routine 404 -- fail silently,
    // the chip just doesn't render, same tolerance as the license fetch above.
    try {
      setBadge(await getMyBadge());
    } catch {
      // keep whatever badge value was already there rather than flashing it away
    }
  }, []);

  const loadAll = useCallback(
    () => Promise.all([loadApplications(), loadLicense(), loadBadge()]),
    [loadApplications, loadLicense, loadBadge],
  );

  useEffect(() => {
    // Fetch-on-mount, not a state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <ThemedView style={styles.form}>
        <DriverHomeContent
          license={license}
          applications={applications}
          badge={badge}
          // While a retry/refresh is in flight, show the spinner instead of the
          // stale error (also removes the Retry button, so taps can't overlap).
          error={refreshing ? null : (licenseError ?? loadError)}
          onRetry={handleRefresh}
        />
      </ThemedView>
    </ScrollView>
  );
}

// Home shows exactly one primary thing, chosen by where the driver is in the
// license journey: loading/error -> license -> latest application -> nothing yet.
function DriverHomeContent({
  license,
  applications,
  badge,
  error,
  onRetry,
}: {
  license: License | null | undefined;
  applications: Application[] | null;
  badge: Badge | null;
  error: string | null;
  onRetry: () => void;
}) {
  const theme = useTheme();

  // A license is the goal of the whole journey, so show it even if the
  // applications request failed.
  if (license) {
    return <LicenseCard license={license} badge={badge} />;
  }

  if (error) {
    return <ScreenState error={error} onRetry={onRetry} testID="home" />;
  }

  if (license === undefined || applications === null) {
    return <ScreenState testID="home" />;
  }

  const latest = [...applications].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  const goToApply = () => router.push('/(app)/apply');

  if (!latest) {
    return (
      <EmptyState
        testID="applications-empty"
        icon="id-card-outline"
        title="Get your digital driving license"
        message="Apply in a few minutes with 4 clear face photos and your NIC, medical certificate, and birth certificate."
        action={{ label: 'Apply for License', icon: 'add-circle-outline', onPress: goToApply, testID: 'apply-link' }}
      />
    );
  }

  const submitted = new Date(latest.created_at).toLocaleDateString();

  if (latest.status === 'REJECTED') {
    return (
      <Card style={styles.statusCard}>
        <StatusBadge testID="application-status" tone="danger" icon="close-circle" label="Rejected" />
        <ThemedText type="subtitle">Application not approved</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Submitted {submitted}
        </ThemedText>
        {latest.reason ? (
          <ThemedText selectable testID="application-reason">
            {latest.reason}
          </ThemedText>
        ) : null}
        <Button variant="primary" onPress={goToApply} testID="apply-link" style={styles.statusAction}>
          <Ionicons name="refresh" size={18} color={theme.onPrimary} />
          <ThemedText type="smallBold" themeColor="onPrimary">
            Apply again
          </ThemedText>
        </Button>
      </Card>
    );
  }

  // PENDING, or APPROVED while the license is still being issued (normally
  // the license exists by the time approval is visible; pull to refresh).
  const isPending = latest.status === 'PENDING';
  return (
    <Card style={styles.statusCard}>
      <StatusBadge
        testID="application-status"
        tone={isPending ? 'info' : 'success'}
        icon={isPending ? 'time-outline' : 'checkmark-circle'}
        label={isPending ? 'Pending' : 'Approved'}
      />
      <ThemedText type="subtitle">
        {isPending ? 'Application under review' : 'Application approved'}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Submitted {submitted}
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        {isPending
          ? "We'll notify you as soon as an officer reviews your documents."
          : 'Your digital license is being issued. Pull down to refresh.'}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  form: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  statusCard: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  statusAction: { marginTop: Spacing.two },
});
