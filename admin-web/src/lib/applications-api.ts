import { apiClient } from '@/lib/api-client';
import type { Application, ApplicationStatus } from '@/types/application';

export async function listApplications(status?: ApplicationStatus): Promise<Application[]> {
  const query = status ? `?status_filter=${status}` : '';
  return apiClient.get<Application[]>(`/admin/applications${query}`);
}

export async function approveApplication(applicationId: string): Promise<Application> {
  return apiClient.post<Application>(`/admin/applications/${applicationId}/approve`);
}

export async function rejectApplication(
  applicationId: string,
  reason: string,
): Promise<Application> {
  return apiClient.post<Application>(`/admin/applications/${applicationId}/reject`, { reason });
}
