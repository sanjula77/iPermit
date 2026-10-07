import { apiClient } from '@/lib/api-client';
import type { AdminUserDetail, AdminUserListItem, UserRole } from '@/types/user';

export async function listUsers(role?: Exclude<UserRole, 'ADMIN'>): Promise<AdminUserListItem[]> {
  return apiClient.get<AdminUserListItem[]>(`/admin/users${role ? `?role=${role}` : ''}`);
}

export async function getUser(userId: string): Promise<AdminUserDetail> {
  return apiClient.get<AdminUserDetail>(`/admin/users/${userId}`);
}

export async function deleteUser(userId: string): Promise<void> {
  return apiClient.delete(`/admin/users/${userId}`);
}
