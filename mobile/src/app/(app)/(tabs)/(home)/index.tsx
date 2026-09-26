import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { getMyBadge } from '@/api/badges';
import { listApplications } from '@/api/applications';
import { ApiError, extractErrorMessage } from '@/api/client';
import { getMyLicense } from '@/api/licenses';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { LicenseCard } from '@/components/license-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import type { Application, ApplicationStatus } from '@/types/application';
import type { Badge } from '@/types/badge';
import type { License } from '@/types/license';

const STATUS_COLOR: Record<ApplicationStatus, 'primary' | 'danger' | 'textSecondary'> = {
  PENDING: 'textSecondary',
  APPROVED: 'primary',
  REJECTED: 'danger',
};

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
  const theme = useTheme();
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [license, setLicense] = useState<License | null>(null);
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

  useEffect(() => {
    // Fetch-on-mount, not a state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLicense();
  }, [loadLicense]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBadge();
  }, [loadBadge]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadApplications(), loadLicense(), loadBadge()]);
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
        {license ? (
          <LicenseCard license={license} badge={badge} />
        ) : licenseError ? (
          <ThemedText type="small" themeColor="danger" selectable testID="license-error">
            {licenseError}
          </ThemedText>
        ) : null}

        <ThemedView style={styles.applicationsSection}>
          <ThemedText type="subtitle">Your Applications</ThemedText>

          {loadError ? (
            <ThemedText type="small" themeColor="danger" selectable testID="applications-error">
              {loadError}
            </ThemedText>
          ) : applications === null ? (
            <ActivityIndicator testID="applications-loading" />
          ) : applications.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" testID="applications-empty">
              No applications yet — apply for your license below.
            </ThemedText>
          ) : (
            applications.map((application) => (
              <Card key={application.id}>
                <ThemedText type="small">
                  Submitted {new Date(application.created_at).toLocaleDateString()}
                </ThemedText>
                <ThemedText
                  type="smallBold"
                  themeColor={STATUS_COLOR[application.status]}
                  testID="application-status"
                >
                  {application.status}
                </ThemedText>
                {application.reason ? (
                  <ThemedText type="small" selectable>
                    {application.reason}
                  </ThemedText>
                ) : null}
              </Card>
            ))
          )}

          <Button variant="primary" onPress={() => router.push('/(app)/apply')} testID="apply-link">
            <Ionicons name="add-circle-outline" size={18} color={theme.onPrimary} />
            <ThemedText type="smallBold" themeColor="onPrimary">
              Apply for License
            </ThemedText>
          </Button>
        </ThemedView>
      </ThemedView>
    </ScrollView>
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
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  applicationsSection: {
    gap: Spacing.two,
  },
});
