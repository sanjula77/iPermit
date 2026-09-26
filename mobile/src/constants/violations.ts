import type { Ionicons } from '@expo/vector-icons';

import type { ViolationType } from '@/types/police';

// Human-readable names and icons for violation types, shared by every screen
// that shows a violation (driver fines, police driver details).
export const VIOLATION_LABEL: Record<ViolationType, string> = {
  WHITE_LINE: 'Crossing white line',
  SPEEDING: 'Speeding',
  RED_LIGHT: 'Red light',
  DRUNK_DRIVING: 'Drunk driving',
};

export const VIOLATION_ICON: Record<ViolationType, keyof typeof Ionicons.glyphMap> = {
  WHITE_LINE: 'remove-circle-outline',
  SPEEDING: 'speedometer-outline',
  RED_LIGHT: 'stop-circle-outline',
  DRUNK_DRIVING: 'alert-circle',
};
