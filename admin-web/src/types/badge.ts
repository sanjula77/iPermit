import type { DriverSummary } from '@/types/fine';

export type BadgeTier = 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'AT_RISK' | 'SUSPENDED';

export interface AdminBadge {
  driver: DriverSummary;
  tier: BadgeTier;
  safety_score: number;
  updated_at: string;
}

export interface BadgeDistribution {
  distribution: Record<BadgeTier, number>;
  attention_queue: AdminBadge[];
}
