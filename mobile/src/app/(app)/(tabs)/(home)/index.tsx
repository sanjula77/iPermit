import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { getMyBadge } from '@/api/badges';
import { listApplications } from '@/api/applications';
import { ApiError, extractErrorMessage } from '@/api/client';
import { getMyLicense } from '@/api/licenses';
import { getMyNotifications } from '@/api/notifications';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { FadeInItem } from '@/components/fade-in-item';
import { HeroScreen } from '@/components/hero-screen';
import { IconTile } from '@/components/icon-tile';
import { PoliceHome } from '@/components/police-home';
import { LicenseCard, TIER_LABEL, TIER_TONE } from '@/components/license-card';
import { ListRow } from '@/components/list-row';
import { ScreenState } from '@/components/screen-state';
import { Skeleton } from '@/components/skeleton';
import { StatTile } from '@/components/stat-tile';
import { StatusBadge, type StatusTone } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { KIND_COLOR, TYPE_INFO } from '@/constants/notifications';
import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useMyFines } from '@/hooks/use-my-fines';
import { useTheme } from '@/hooks/use-theme';
import { summarizeFines } from '@/lib/fine-summary';
import { formatDate, formatLkr } from '@/lib/format';
import { greeting } from '@/lib/greeting';
import { relativeTime } from '@/lib/relative-time';
import type { Application } from '@/types/application';
import type { Badge } from '@/types/badge';
import type { License } from '@/types/license';
import type { AppNotification } from '@/types/notification';

export default function HomeScreen() {
  const { user } = useAuth();

  if (user?.role === 'POLICE') {
    return <PoliceHome />;
  }

  return <DriverHomeScreen />;
}

// Badge tier tone as a text colour for the stat tile figure.
const TONE_TEXT: Record<StatusTone, ThemeColor> = {
  neutral: 'textSecondary',
  info: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};
const TIER_TONE_COLOR = Object.fromEntries(
  Object.entries(TIER_TONE).map(([tier, tone]) => [tier, TONE_TEXT[tone]]),
) as Record<keyof typeof TIER_TONE, ThemeColor>;

function DriverHomeScreen() {
  const { user } = useAuth();
  const theme = useTheme();
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // undefined = not loaded yet; null = loaded, driver has no license.
  const [license, setLicense] = useState<License | null | undefined>(undefined);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [badge, setBadge] = useState<Badge | null>(null);
  const [recent, setRecent] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // Fines reload on focus, so the outstanding tile reflects a payment just made.
  const { fines, appeals, reload: reloadFines } = useMyFines();

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
    // the tile just doesn't render, same tolerance as the license fetch above.
    try {
      setBadge(await getMyBadge());
    } catch {
      // keep whatever badge value was already there rather than flashing it away
    }
  }, []);

  const loadRecent = useCallback(async () => {
    // A courtesy preview of the Alerts tab: a failure just leaves it empty.
    try {
      setRecent((await getMyNotifications()).slice(0, 3));
    } catch {
      // keep the last good list
    }
  }, []);

  const loadAll = useCallback(
    () => Promise.all([loadApplications(), loadLicense(), loadBadge(), loadRecent()]),
    [loadApplications, loadLicense, loadBadge, loadRecent],
  );

  useEffect(() => {
    // Fetch-on-mount, not a state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadAll(), reloadFines()]);
    setRefreshing(false);
  }

  const outstanding = fines ? summarizeFines(fines, appeals).outstanding : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <HeroScreen
        title={greeting()}
        summary={license ? 'Your digital driving license' : 'Welcome to iPermit'}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.brand]} tintColor={theme.onBrand} />
        }
      >
        <DriverHomeContent
          license={license}
          nic={user?.nic}
          applications={applications}
          badge={badge}
          outstanding={outstanding}
          recent={recent}
          // While a retry/refresh is in flight, show the spinner instead of the
          // stale error (also removes the Retry button, so taps can't overlap).
          error={refreshing ? null : (licenseError ?? loadError)}
          onRetry={handleRefresh}
        />
      </HeroScreen>
    </>
  );
}

// Home shows one primary thing, chosen by where the driver is in the license
// journey: loading/error -> license -> latest application -> nothing yet.
function DriverHomeContent({
  license,
  nic,
  applications,
  badge,
  outstanding,
  recent,
  error,
  onRetry,
}: {
  license: License | null | undefined;
  nic?: string;
  applications: Application[] | null;
  badge: Badge | null;
  outstanding: number | null;
  recent: AppNotification[];
  error: string | null;
  onRetry: () => void;
}) {
  const theme = useTheme();

  // A license is the goal of the whole journey, so show it even if the
  // applications request failed.
  if (license) {
    return (
      <>
        {/* Lifted over the hero's lower edge, as in the approved mockup. */}
        <View style={styles.overlap}>
          <LicenseCard license={license} nic={nic} />
        </View>
        <View style={styles.stats}>
          {badge ? (
            <StatTile
              label="Safety badge"
              value={`${TIER_LABEL[badge.tier]} · ${badge.safety_score}`}
              valueColor={TIER_TONE_COLOR[badge.tier]}
              testID="home-badge"
            />
          ) : null}
          {outstanding !== null ? (
            <StatTile
              label="Outstanding fines"
              value={formatLkr(outstanding)}
              valueColor={outstanding > 0 ? 'danger' : 'success'}
              testID="home-outstanding"
            />
          ) : null}
        </View>
        <RecentAlerts items={recent} />
      </>
    );
  }

  if (error) {
    return <ScreenState error={error} onRetry={onRetry} testID="home" />;
  }

  if (license === undefined || applications === null) {
    return (
      <View style={styles.skeleton} testID="home-loading">
        <Skeleton height={240} radius={Radius.large} style={styles.overlap} />
        <View style={styles.stats}>
          <Skeleton height={64} radius={Radius.medium} style={styles.flex} />
          <Skeleton height={64} radius={Radius.medium} style={styles.flex} />
        </View>
      </View>
    );
  }

  const latest = [...applications].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  const goToApply = () => router.push('/(app)/apply');

  if (!latest) {
    return (
      <Card variant="raised" style={[styles.overlap, styles.statusCard]}>
        <EmptyState
          testID="applications-empty"
          icon="id-card-outline"
          title="Get your digital driving license"
          message="Apply in a few minutes with 4 clear face photos and your NIC, medical certificate, and birth certificate."
          action={{ label: 'Apply for License', icon: 'add-circle-outline', onPress: goToApply, testID: 'apply-link' }}
        />
      </Card>
    );
  }

  const submitted = formatDate(latest.created_at);

  if (latest.status === 'REJECTED') {
    return (
      <Card variant="raised" style={[styles.overlap, styles.statusCard]}>
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
    <Card variant="raised" style={[styles.overlap, styles.statusCard]}>
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

// The last few alerts, each opening the screen it's about.
function RecentAlerts({ items }: { items: AppNotification[] }) {
  const theme = useTheme();
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel} accessibilityRole="header">
          Recent
        </ThemedText>
        <Pressable
          onPress={() => router.navigate('/(app)/(tabs)/(notifications)/notifications')}
          accessibilityRole="button"
          hitSlop={12}
          testID="home-see-all-alerts"
        >
          <ThemedText type="smallBold" themeColor="primary">
            See all
          </ThemedText>
        </Pressable>
      </View>
      {items.map((item, i) => {
        const info = TYPE_INFO[item.type];
        return (
          <FadeInItem key={item.id} index={i}>
            <Card style={styles.rowCard}>
              <ListRow
                testID={`home-recent-${item.id}`}
                onPress={() => router.navigate(info.target)}
                leading={<IconTile icon={info.icon} color={theme[KIND_COLOR[info.kind]]} />}
                title={info.title}
                meta={item.message}
                value={relativeTime(item.created_at)}
                chevron
              />
            </Card>
          </FadeInItem>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  statusAction: { marginTop: Spacing.two },
  // Negative margin lifts the first card over the hero's lower edge.
  overlap: { marginTop: -(Spacing.four + Spacing.three) },
  stats: { flexDirection: 'row', gap: Spacing.three },
  flex: { flex: 1 },
  skeleton: { gap: Spacing.three },
  section: { gap: Spacing.two },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { textTransform: 'uppercase', letterSpacing: 0.5 },
  rowCard: { paddingVertical: 0 },
});
