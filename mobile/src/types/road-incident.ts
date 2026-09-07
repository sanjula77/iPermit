export type RoadIncidentType =
  | 'ACCIDENT'
  | 'TRAFFIC'
  | 'ROAD_BLOCK'
  | 'FLOOD'
  | 'CONSTRUCTION'
  | 'BREAKDOWN'
  | 'HAZARD'
  | 'OTHER';

export type RoadIncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type RoadIncidentStatus = 'ACTIVE' | 'CLEARED' | 'EXPIRED';

export interface RoadIncident {
  id: string;
  type: RoadIncidentType;
  severity: RoadIncidentSeverity;
  lat: number;
  lng: number;
  status: RoadIncidentStatus;
  confirmation_count: number;
  created_at: string;
  expires_at: string;
}
