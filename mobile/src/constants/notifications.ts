import type { Ionicons } from '@expo/vector-icons';
import type { Href } from 'expo-router';

import type { ThemeColor } from '@/constants/theme';
import type { NotificationType } from '@/types/notification';

export type Kind = 'good' | 'bad' | 'info';

// UPHELD means the fine stands (appeal rejected); OVERTURNED means it was
// reversed -- same plain wording as the Fine details screen.
export const TYPE_INFO: Record<
  NotificationType,
  { title: string; icon: keyof typeof Ionicons.glyphMap; kind: Kind; target: Href }
> = {
  LICENSE_APPROVED: { title: 'License approved', icon: 'checkmark-circle', kind: 'good', target: '/(app)/(tabs)/(home)' },
  LICENSE_REJECTED: { title: 'Application not approved', icon: 'close-circle', kind: 'bad', target: '/(app)/(tabs)/(home)' },
  FINE_ISSUED: { title: 'Fine issued', icon: 'receipt-outline', kind: 'bad', target: '/(app)/(tabs)/(fines)/fines' },
  LICENSE_SUSPENDED: { title: 'License suspended', icon: 'ban', kind: 'bad', target: '/(app)/(tabs)/(home)' },
  PAYMENT_CONFIRMED: { title: 'Payment confirmed', icon: 'card', kind: 'good', target: '/(app)/(tabs)/(fines)/fines' },
  APPEAL_UPHELD: { title: 'Appeal rejected', icon: 'close-circle', kind: 'bad', target: '/(app)/(tabs)/(fines)/fines' },
  APPEAL_OVERTURNED: { title: 'Appeal accepted', icon: 'arrow-undo-circle', kind: 'good', target: '/(app)/(tabs)/(fines)/fines' },
  BADGE_CHANGED: { title: 'Standing changed', icon: 'medal-outline', kind: 'info', target: '/(app)/(tabs)/(home)' },
  NEARBY_INCIDENT: { title: 'Nearby incident', icon: 'location', kind: 'info', target: '/(app)/(tabs)/(incidents)/incidents' },
};

export const KIND_COLOR: Record<Kind, ThemeColor> = { good: 'success', bad: 'danger', info: 'primary' };
