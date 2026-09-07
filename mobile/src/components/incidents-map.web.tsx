import type { RoadIncident } from '@/types/road-incident';

/**
 * react-native-maps has no functional web renderer -- the incidents screen
 * already shows a "map view is only available on the native app" note next
 * to the incident list, so this variant is deliberately a no-op rather
 * than shipping a broken/blank map on web.
 */
export function IncidentsMap(_props: {
  center: { lat: number; lng: number };
  incidents: RoadIncident[];
}) {
  return null;
}
