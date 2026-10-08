import type { FineStatus } from '@/types/fine';
import type { ViolationType } from '@/types/police';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type Trend = 'IMPROVING' | 'STEADY' | 'WORSENING' | 'NOT_ENOUGH_DATA';

export interface BehaviourTimelineItem {
  type: ViolationType;
  description: string | null;
  points: number;
  confirmed_at: string;
  // When this violation's points stop counting.
  points_expire_at: string;
  fine_status: FineStatus | null;
}

export interface Behaviour {
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
  // How long each violation's points count towards suspension.
  points_validity_days: number;
  unpaid_fines: number;
  tips: string[];
  timeline: BehaviourTimelineItem[];
}
