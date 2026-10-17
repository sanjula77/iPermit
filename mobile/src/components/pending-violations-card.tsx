import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Card } from '@/components/card';
import { IconTile } from '@/components/icon-tile';
import { ListRow } from '@/components/list-row';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { useViolationQueue } from '@/hooks/use-violation-queue';

// Police Home: violations saved on this phone that have not reached the server
// yet (or were refused). Hidden when there is nothing waiting.
export function PendingViolationsCard() {
  const theme = useTheme();
  const { user } = useAuth();
  const { pending, rejected } = useViolationQueue(user?.id);
  if (pending.length === 0 && rejected.length === 0) return null;

  const title =
    pending.length > 0
      ? `${pending.length} violation${pending.length === 1 ? '' : 's'} waiting to send`
      : `${rejected.length} violation${rejected.length === 1 ? '' : 's'} refused`;
  const meta =
    pending.length > 0
      ? 'Saved on this phone. Sent automatically when you are online.' +
        (rejected.length ? ` ${rejected.length} refused.` : '')
      : 'Open to see why.';

  return (
    <Card variant="raised" style={styles.card} testID="pending-violations-card">
      <ListRow
        leading={
          <IconTile
            icon={pending.length > 0 ? 'cloud-upload-outline' : 'alert-circle-outline'}
            color={pending.length > 0 ? theme.warning : theme.danger}
          />
        }
        title={title}
        meta={meta}
        chevron
        onPress={() => router.push('/(app)/pending-violations')}
        accessibilityLabel={`${title}. Open the list`}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 0 },
});
