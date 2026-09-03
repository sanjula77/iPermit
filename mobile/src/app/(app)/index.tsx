import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';

import { listApplications } from '@/api/applications';
import { ApiError, extractErrorMessage } from '@/api/client';
import { getMyLicense } from '@/api/licenses';
import { LicenseCard } from '@/components/license-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import type { Application, ApplicationStatus } from '@/types/application';
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
  const { user, logout } = useAuth();
  const theme = useTheme();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <ThemedView style={styles.form}>
        <ThemedText type="title">Officer Console</ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Email</ThemedText>
          <ThemedText testID="home-email" selectable>
            {user?.email}
          </ThemedText>
          <ThemedText type="smallBold">Role</ThemedText>
          <ThemedText testID="home-role" selectable>
            {user?.role}
          </ThemedText>
        </ThemedView>

        <Link href="/(app)/police-verify" asChild>
          <Pressable
            style={StyleSheet.flatten([styles.button, { backgroundColor: theme.primary }])}
            testID="police-verify-link"
          >
            <ThemedText type="smallBold" themeColor="onPrimary">
              Verify Driver
            </ThemedText>
          </Pressable>
        </Link>

        <Pressable
          style={[styles.button, { backgroundColor: theme.danger }]}
          onPress={logout}
          testID="logout-button"
        >
          <ThemedText type="smallBold" themeColor="onPrimary">
            Log out
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ScrollView>
  );
}

function DriverHomeScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [license, setLicense] = useState<License | null>(null);
  const [licenseError, setLicenseError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listApplications()
      .then((data) => {
        if (!cancelled) setApplications(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(extractErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMyLicense()
      .then((data) => {
        if (!cancelled) setLicense(data);
      })
      .catch((err) => {
        // No license yet is expected (not every driver has one) -- only
        // surface genuine errors, not the routine 404.
        if (!cancelled && !(err instanceof ApiError && err.status === 404)) {
          setLicenseError(extractErrorMessage(err));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <ThemedView style={styles.form}>
        <ThemedText type="title">Welcome</ThemedText>

        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold">Email</ThemedText>
          <ThemedText testID="home-email" selectable>
            {user?.email}
          </ThemedText>
          <ThemedText type="smallBold">NIC</ThemedText>
          <ThemedText testID="home-nic" selectable>
            {user?.nic}
          </ThemedText>
          <ThemedText type="smallBold">Role</ThemedText>
          <ThemedText testID="home-role" selectable>
            {user?.role}
          </ThemedText>
        </ThemedView>

        {license ? (
          <LicenseCard license={license} />
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
              <ThemedView key={application.id} type="backgroundElement" style={styles.appCard}>
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
              </ThemedView>
            ))
          )}

          <Link href="/(app)/apply" asChild>
            <Pressable
              style={StyleSheet.flatten([styles.button, { backgroundColor: theme.primary }])}
              testID="apply-link"
            >
              <ThemedText type="smallBold" themeColor="onPrimary">
                Apply for License
              </ThemedText>
            </Pressable>
          </Link>
        </ThemedView>

        <Link href="/(app)/fines" asChild>
          <Pressable
            style={StyleSheet.flatten([styles.button, { backgroundColor: theme.backgroundSelected }])}
            testID="fines-link"
          >
            <ThemedText type="smallBold">Fines &amp; Appeals</ThemedText>
          </Pressable>
        </Link>

        <Pressable
          style={[styles.button, { backgroundColor: theme.danger }]}
          onPress={logout}
          testID="logout-button"
        >
          <ThemedText type="smallBold" themeColor="onPrimary">
            Log out
          </ThemedText>
        </Pressable>
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
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.one,
  },
  applicationsSection: {
    gap: Spacing.two,
  },
  appCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  button: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
