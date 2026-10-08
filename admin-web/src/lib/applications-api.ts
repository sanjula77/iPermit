import { apiClient } from '@/lib/api-client';
import type { Application, ApplicationStatus } from '@/types/application';
import type { VehicleCategory } from '@/types/vehicle-category';

export async function listApplications(status?: ApplicationStatus): Promise<Application[]> {
  const query = status ? `?status_filter=${status}` : '';
  return apiClient.get<Application[]>(`/admin/applications${query}`);
}

export async function getApplication(applicationId: string): Promise<Application> {
  return apiClient.get<Application>(`/admin/applications/${applicationId}`);
}

export function documentPath(applicationId: string, documentId: string): string {
  return `/admin/applications/${applicationId}/documents/${documentId}`;
}

// `categories` are the vehicle categories to grant (the driver's request, as the
// admin edited it).
export async function approveApplication(
  applicationId: string,
  categories: VehicleCategory[],
): Promise<Application> {
  return apiClient.post<Application>(`/admin/applications/${applicationId}/approve`, { categories });
}

export async function rejectApplication(
  applicationId: string,
  reason: string,
): Promise<Application> {
  return apiClient.post<Application>(`/admin/applications/${applicationId}/reject`, { reason });
}
