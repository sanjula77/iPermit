import { apiClient } from '@/api/client';
import { getPhotoSource, type PhotoSource } from '@/api/photo-source';
import { appendFilePart, type PickedFile } from '@/lib/file-upload';
import type {
  RoadIncident,
  RoadIncidentSeverity,
  RoadIncidentType,
} from '@/types/road-incident';

export async function listNearbyIncidents(
  lat: number,
  lng: number,
  radiusKm?: number,
): Promise<RoadIncident[]> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (radiusKm) params.set('radius_km', String(radiusKm));
  return apiClient.get<RoadIncident[]>(`/road-incidents?${params.toString()}`);
}

export async function reportIncident(
  type: RoadIncidentType,
  severity: RoadIncidentSeverity,
  lat: number,
  lng: number,
): Promise<RoadIncident> {
  return apiClient.post<RoadIncident>('/road-incidents', { type, severity, lat, lng });
}

export async function confirmIncident(id: string): Promise<RoadIncident> {
  return apiClient.post<RoadIncident>(`/road-incidents/${id}/confirm`);
}

export async function clearIncident(id: string): Promise<RoadIncident> {
  return apiClient.post<RoadIncident>(`/road-incidents/${id}/clear`);
}

// The reporter adds one scene photo after the incident exists.
export async function uploadIncidentPhoto(id: string, photo: PickedFile): Promise<RoadIncident> {
  const formData = new FormData();
  appendFilePart(formData, 'photo', photo);
  return apiClient.postForm<RoadIncident>(`/road-incidents/${id}/photo`, formData);
}

export function getIncidentPhotoSource(id: string): Promise<PhotoSource | null> {
  return getPhotoSource(`/road-incidents/${id}/photo`);
}
