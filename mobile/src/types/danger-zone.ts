export type DangerZoneSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type DangerZoneStatus = 'ACTIVE' | 'CLEARED';

export interface DangerZone {
  id: string;
  lat: number;
  lng: number;
  radius_m: number;
  severity: DangerZoneSeverity;
  reason: string | null;
  status: DangerZoneStatus;
  confirmation_count: number;
  created_at: string;
  cleared_at: string | null;
}
