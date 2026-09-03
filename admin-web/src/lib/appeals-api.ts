import { apiClient } from '@/lib/api-client';
import type { Appeal, AppealStatus } from '@/types/fine';

export async function listAppeals(status?: AppealStatus): Promise<Appeal[]> {
  const query = status ? `?status_filter=${status}` : '';
  return apiClient.get<Appeal[]>(`/admin/appeals${query}`);
}

export async function resolveAppeal(
  appealId: string,
  resolution: 'UPHELD' | 'OVERTURNED',
): Promise<Appeal> {
  return apiClient.post<Appeal>(`/admin/appeals/${appealId}/resolve`, { resolution });
}
