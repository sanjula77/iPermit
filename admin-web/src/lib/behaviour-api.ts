import { apiClient } from '@/lib/api-client';
import type { BehaviourOverview } from '@/types/behaviour';

export async function getBehaviourOverview(): Promise<BehaviourOverview> {
  return apiClient.get<BehaviourOverview>('/admin/behaviour');
}
