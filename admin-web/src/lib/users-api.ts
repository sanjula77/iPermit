import { apiClient } from '@/lib/api-client';
import type { AdminUserDetail, AdminUserListItem, UserRole } from '@/types/user';
import type { VehicleCategory } from '@/types/vehicle-category';

export async function listUsers(role?: Exclude<UserRole, 'ADMIN'>): Promise<AdminUserListItem[]> {
  return apiClient.get<AdminUserListItem[]>(`/admin/users${role ? `?role=${role}` : ''}`);
}

export async function getUser(userId: string): Promise<AdminUserDetail> {
  return apiClient.get<AdminUserDetail>(`/admin/users/${userId}`);
}

export async function deleteUser(userId: string): Promise<void> {
  return apiClient.delete(`/admin/users/${userId}`);
}

// Replaces the vehicle categories an issued licence holds.
export async function updateLicenseCategories(
  licenseId: string,
  categories: VehicleCategory[],
): Promise<void> {
  await apiClient.put(`/admin/licenses/${licenseId}/categories`, { categories });
}
