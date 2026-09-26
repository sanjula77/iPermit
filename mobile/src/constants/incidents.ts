import type { Ionicons } from '@expo/vector-icons';

import type { RoadIncidentSeverity, RoadIncidentType } from '@/types/road-incident';

export const INCIDENT_TYPES: RoadIncidentType[] = [
  'ACCIDENT',
  'TRAFFIC',
  'ROAD_BLOCK',
  'FLOOD',
  'CONSTRUCTION',
  'BREAKDOWN',
  'HAZARD',
  'OTHER',
];

export const INCIDENT_LABEL: Record<RoadIncidentType, string> = {
  ACCIDENT: 'Accident',
  TRAFFIC: 'Traffic',
  ROAD_BLOCK: 'Road block',
  FLOOD: 'Flood',
  CONSTRUCTION: 'Construction',
  BREAKDOWN: 'Breakdown',
  HAZARD: 'Hazard',
  OTHER: 'Other',
};

export const INCIDENT_ICON: Record<RoadIncidentType, keyof typeof Ionicons.glyphMap> = {
  ACCIDENT: 'car-sport',
  TRAFFIC: 'trail-sign',
  ROAD_BLOCK: 'hand-left',
  FLOOD: 'water',
  CONSTRUCTION: 'construct',
  BREAKDOWN: 'build',
  HAZARD: 'alert-circle',
  OTHER: 'ellipsis-horizontal-circle-outline',
};

// Incidents and danger zones share the same three severities.
export const SEVERITIES: RoadIncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH'];

export const SEVERITY_LABEL: Record<RoadIncidentSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export const ZONE_RADIUS_OPTIONS: { label: string; value: number }[] = [
  { label: '100 m', value: 100 },
  { label: '250 m', value: 250 },
  { label: '500 m', value: 500 },
  { label: '1 km', value: 1000 },
];
