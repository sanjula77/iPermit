import { apiClient } from '@/api/client';
import type { License } from '@/types/license';

export async function getMyLicense(): Promise<License> {
  return apiClient.get<License>('/licenses/me');
}
