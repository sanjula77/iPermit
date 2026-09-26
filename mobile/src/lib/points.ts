// Mirrors the backend's SUSPENSION_POINTS_THRESHOLD (violation_service.py):
// the license is suspended once cumulative demerit points reach this value.
export const SUSPENSION_POINTS = 10;

// Bar color as points approach the suspension threshold. These names are
// both status tones and theme color keys.
export function pointsColorKey(points: number): 'success' | 'warning' | 'danger' {
  if (points >= 8) return 'danger';
  if (points >= 5) return 'warning';
  return 'success';
}
