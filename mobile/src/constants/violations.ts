import type { Ionicons } from '@expo/vector-icons';

import type { ThemeColor } from '@/constants/theme';
import type { ViolationType } from '@/types/police';

export const VIOLATION_TYPES: ViolationType[] = ['WHITE_LINE', 'SPEEDING', 'RED_LIGHT', 'DRUNK_DRIVING', 'OTHER'];

// Human-readable names and icons for violation types, shared by every screen
// that shows a violation (driver fines, police driver details).
export const VIOLATION_LABEL: Record<ViolationType, string> = {
  WHITE_LINE: 'Crossing white line',
  SPEEDING: 'Speeding',
  RED_LIGHT: 'Red light',
  DRUNK_DRIVING: 'Drunk driving',
  OTHER: 'Other',
};

export const VIOLATION_ICON: Record<ViolationType, keyof typeof Ionicons.glyphMap> = {
  WHITE_LINE: 'remove-circle-outline',
  SPEEDING: 'speedometer-outline',
  RED_LIGHT: 'stop-circle-outline',
  DRUNK_DRIVING: 'alert-circle',
  OTHER: 'ellipsis-horizontal-circle-outline',
};

// Copies of the backend's VIOLATION_POINTS (models/violation.py) and
// VIOLATION_FINE_AMOUNT (models/fine.py), used only to tell an officer the
// consequence *before* recording. The backend computes the real values; if
// these drift, only that preview is wrong. Keep them in sync.
// OTHER has no fixed value: the officer picks its points (see OTHER_* below),
// so the entries for it are the smallest possible and only a floor.
export const VIOLATION_POINTS: Record<ViolationType, number> = {
  WHITE_LINE: 1,
  SPEEDING: 3,
  RED_LIGHT: 4,
  DRUNK_DRIVING: 6,
  OTHER: 1,
};

export const VIOLATION_FINE: Record<ViolationType, number> = {
  WHITE_LINE: 2000,
  SPEEDING: 5000,
  RED_LIGHT: 10000,
  DRUNK_DRIVING: 25000,
  OTHER: 1000,
};

// Icon-tile colour per violation, so rows are scannable at a glance.
export const VIOLATION_COLOR: Record<ViolationType, ThemeColor> = {
  WHITE_LINE: 'primary',
  SPEEDING: 'warning',
  RED_LIGHT: 'danger',
  DRUNK_DRIVING: 'danger',
  OTHER: 'textSecondary',
};

// An "other" violation: the officer writes what happened and picks the points; the
// fine is worked out from them. Mirrors the backend (models/violation.py, fine.py).
export const OTHER_MIN_POINTS = 1;
export const OTHER_MAX_POINTS = 5;
export const OTHER_FINE_PER_POINT = 1000;
export const OTHER_DESCRIPTION_MIN = 5;
export const OTHER_DESCRIPTION_MAX = 100;

// What to call a violation: the officer's own words for an OTHER one.
export function violationTitle(type: ViolationType, description?: string | null): string {
  return type === 'OTHER' && description ? description : VIOLATION_LABEL[type];
}
