export type BadgeTier = 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'AT_RISK' | 'SUSPENDED';

export interface Badge {
  tier: BadgeTier;
  safety_score: number;
  updated_at: string;
}
