import type { Ionicons } from '@expo/vector-icons';

import type { StatusTone } from '@/components/status-badge';
import type { Appeal, AppealStatus, FineWithViolation, PaymentMethod } from '@/types/fine';

export type BadgeSpec = { label: string; tone: StatusTone; icon: keyof typeof Ionicons.glyphMap };

// One badge per fine: a pending appeal is the most useful thing to show on an
// unpaid fine, since it's why the driver can't act on it right now.
export function fineBadge(fine: FineWithViolation, appeal: Appeal | null): BadgeSpec {
  if (fine.status === 'PAID') return { label: 'Paid', tone: 'success', icon: 'checkmark-circle' };
  if (fine.status === 'REVERSED') return { label: 'Reversed', tone: 'neutral', icon: 'arrow-undo-circle' };
  if (appeal?.status === 'PENDING') return { label: 'Appeal pending', tone: 'info', icon: 'time-outline' };
  return { label: 'Unpaid', tone: 'danger', icon: 'alert-circle' };
}

// UPHELD means the fine stands (the appeal failed); OVERTURNED means the fine
// was reversed. Labels say that outright instead of the legal terms.
export const APPEAL_STATUS_BADGE: Record<AppealStatus, BadgeSpec> = {
  PENDING: { label: 'Pending', tone: 'info', icon: 'time-outline' },
  UPHELD: { label: 'Rejected · fine stands', tone: 'danger', icon: 'close-circle' },
  OVERTURNED: { label: 'Accepted · fine reversed', tone: 'success', icon: 'checkmark-circle' },
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CARD: 'Card',
  BANK: 'Bank transfer',
  WALLET: 'Mobile wallet',
};

export const PAYMENT_METHOD_ICON: Record<PaymentMethod, keyof typeof Ionicons.glyphMap> = {
  CARD: 'card-outline',
  BANK: 'business-outline',
  WALLET: 'wallet-outline',
};

// Mirrors the backend: a fine can be paid while unpaid and not under review,
// but appealed only once ever (Appeal.fine_id is unique) -- so an unpaid fine
// whose appeal was rejected can still be paid, not appealed again.
export function canPayFine(fine: FineWithViolation, appeal: Appeal | null): boolean {
  return fine.status === 'UNPAID' && appeal?.status !== 'PENDING';
}

export function canAppealFine(fine: FineWithViolation, appeal: Appeal | null): boolean {
  return fine.status === 'UNPAID' && appeal === null;
}

export function appealForFine(appeals: Appeal[], fineId: string): Appeal | null {
  return appeals.find((a) => a.fine.id === fineId) ?? null;
}

export function formatLkr(amount: number): string {
  return `LKR ${amount.toLocaleString()}`;
}
