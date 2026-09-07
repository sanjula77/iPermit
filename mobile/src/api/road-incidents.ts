import { apiClient } from '@/api/client';
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
