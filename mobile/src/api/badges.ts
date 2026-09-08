import { apiClient } from '@/api/client';
import type { Badge } from '@/types/badge';

export async function getMyBadge(): Promise<Badge> {
  return apiClient.get<Badge>('/badges/me');
}
