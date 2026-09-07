export type NotificationType =
  | 'LICENSE_APPROVED'
  | 'LICENSE_REJECTED'
  | 'FINE_ISSUED'
  | 'LICENSE_SUSPENDED'
  | 'PAYMENT_CONFIRMED'
  | 'APPEAL_UPHELD'
  | 'APPEAL_OVERTURNED'
  | 'BADGE_CHANGED'
  | 'NEARBY_INCIDENT';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  read_at: string | null;
  created_at: string;
}
