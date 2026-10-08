import { apiClient } from '@/lib/api-client';

export interface DemoResetResult {
  removed: Record<string, number>;
  kept: { ADMIN: number; POLICE: number };
}

// Whether this server allows the demo reset (ALLOW_DEMO_RESET on the backend).
export async function getDemoResetStatus(): Promise<{ enabled: boolean }> {
  return apiClient.get<{ enabled: boolean }>('/admin/demo-reset/status');
}

// Deletes every driver and all enforcement and activity data; administrator and
// police accounts stay. `confirm` must be the word CLEAR.
export async function clearDemoData(confirm: string): Promise<DemoResetResult> {
  return apiClient.post<DemoResetResult>('/admin/demo-reset', { confirm });
}
