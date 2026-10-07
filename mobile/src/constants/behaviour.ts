import type { Ionicons } from '@expo/vector-icons';

import type { StatusTone } from '@/components/status-badge';
import type { RiskLevel, Trend } from '@/types/behaviour';

export const RISK_INFO: Record<RiskLevel, { label: string; tone: StatusTone; icon: keyof typeof Ionicons.glyphMap }> = {
  HIGH: { label: 'High risk', tone: 'danger', icon: 'alert-circle' },
  MEDIUM: { label: 'Medium risk', tone: 'warning', icon: 'warning' },
  LOW: { label: 'Low risk', tone: 'success', icon: 'checkmark-circle' },
};

export const TREND_INFO: Record<Trend, { label: string; tone: StatusTone; icon: keyof typeof Ionicons.glyphMap }> = {
  WORSENING: { label: 'Getting worse', tone: 'danger', icon: 'trending-up' },
  STEADY: { label: 'Steady', tone: 'neutral', icon: 'remove' },
  IMPROVING: { label: 'Improving', tone: 'success', icon: 'trending-down' },
  NOT_ENOUGH_DATA: { label: 'Not enough history', tone: 'neutral', icon: 'help-circle-outline' },
};
