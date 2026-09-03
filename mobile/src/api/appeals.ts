import { apiClient } from '@/api/client';
import type { Appeal } from '@/types/fine';

export async function getMyAppeals(): Promise<Appeal[]> {
  return apiClient.get<Appeal[]>('/appeals/me');
}

export async function submitAppeal(fineId: string, reason: string): Promise<Appeal> {
  return apiClient.post<Appeal>('/appeals', { fine_id: fineId, reason });
}
