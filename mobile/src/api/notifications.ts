import { apiClient } from '@/api/client';
import type { AppNotification } from '@/types/notification';

export async function getMyNotifications(): Promise<AppNotification[]> {
  return apiClient.get<AppNotification[]>('/notifications/me');
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  return apiClient.post<AppNotification>(`/notifications/${id}/read`);
}

export async function registerPushToken(token: string): Promise<void> {
  await apiClient.post('/notifications/register-push-token', { token });
}
