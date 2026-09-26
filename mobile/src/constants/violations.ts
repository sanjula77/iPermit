import type { Ionicons } from '@expo/vector-icons';

import type { ViolationType } from '@/types/police';

export const VIOLATION_TYPES: ViolationType[] = ['WHITE_LINE', 'SPEEDING', 'RED_LIGHT', 'DRUNK_DRIVING'];

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

// Copies of the backend's VIOLATION_POINTS (models/violation.py) and
// VIOLATION_FINE_AMOUNT (models/fine.py), used only to tell an officer the
// consequence *before* recording. The backend computes the real values; if
// these drift, only that preview is wrong. Keep them in sync.
export const VIOLATION_POINTS: Record<ViolationType, number> = {
  WHITE_LINE: 3,
  SPEEDING: 4,
  RED_LIGHT: 6,
  DRUNK_DRIVING: 10,
};

export const VIOLATION_FINE: Record<ViolationType, number> = {
  WHITE_LINE: 2000,
  SPEEDING: 5000,
  RED_LIGHT: 10000,
  DRUNK_DRIVING: 25000,
};
