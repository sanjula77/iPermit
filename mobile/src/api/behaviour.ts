import { apiClient } from '@/api/client';
import type { Behaviour } from '@/types/behaviour';

export async function getMyBehaviour(): Promise<Behaviour> {
  return apiClient.get<Behaviour>('/behaviour/me');
}
