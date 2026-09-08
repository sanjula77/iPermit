import { apiClient } from '@/lib/api-client';
import type { BadgeDistribution } from '@/types/badge';

export async function getBadgeDistribution(): Promise<BadgeDistribution> {
  return apiClient.get<BadgeDistribution>('/admin/badges');
}
