import type { DriverSummary, ViolationType } from '@/types/fine';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type Trend = 'IMPROVING' | 'STEADY' | 'WORSENING' | 'NOT_ENOUGH_DATA';

export interface BehaviourMetrics {
  risk_level: RiskLevel;
  reasons: string[];
  trend: Trend;
  current_points: number;
  suspension_threshold: number;
  window_days: number;
  window_points: number;
  window_violations: number;
  recent_points: number;
  previous_points: number;
  recent_violations: number;
  days_since_last_violation: number | null;
  projected_days_to_suspension: number | null;
  oldest_leaves_window_at: string | null;
  dominant_type: ViolationType | null;
  prior_suspensions: number;
  unpaid_fines: number;
}

export interface AdminBehaviour extends BehaviourMetrics {
  driver: DriverSummary;
}

export interface BehaviourOverview {
  summary: { high: number; medium: number; low: number; worsening: number; near_threshold: number };
  drivers: AdminBehaviour[];
  monthly: { month: string; count: number; points: number }[];
  by_type: Partial<Record<ViolationType, number>>;
}

