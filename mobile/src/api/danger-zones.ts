import { apiClient } from '@/api/client';
import type { DangerZone, DangerZoneSeverity } from '@/types/danger-zone';

export async function listNearbyDangerZones(
  lat: number,
  lng: number,
  radiusKm?: number,
): Promise<DangerZone[]> {
  const params = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  if (radiusKm) params.set('radius_km', String(radiusKm));
  return apiClient.get<DangerZone[]>(`/danger-zones?${params.toString()}`);
}

export async function markDangerZone(
  lat: number,
  lng: number,
  radiusM: number,
  severity: DangerZoneSeverity,
  reason?: string,
): Promise<DangerZone> {
  return apiClient.post<DangerZone>('/danger-zones', {
    lat,
    lng,
    radius_m: radiusM,
    severity,
    reason: reason || undefined,
  });
}

export async function confirmDangerZone(id: string): Promise<DangerZone> {
  return apiClient.post<DangerZone>(`/danger-zones/${id}/confirm`);
}

export async function clearDangerZone(id: string): Promise<DangerZone> {
  return apiClient.post<DangerZone>(`/danger-zones/${id}/clear`);
}
