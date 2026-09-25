import MapView, { Circle, Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';

import type { DangerZone } from '@/types/danger-zone';
import type { RoadIncident } from '@/types/road-incident';

const SEVERITY_PIN_COLOR: Record<RoadIncident['severity'], string> = {
  HIGH: '#d92d20',
  MEDIUM: '#208AEF',
  LOW: '#60646C',
};

export function IncidentsMap({
  center,
  incidents,
  zones = [],
}: {
  center: { lat: number; lng: number };
  incidents: RoadIncident[];
  zones?: DangerZone[];
}) {
  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }}
      testID="incidents-map"
    >
      {zones.map((zone) => (
        <Circle
          key={zone.id}
          center={{ latitude: zone.lat, longitude: zone.lng }}
          radius={zone.radius_m}
          strokeColor={SEVERITY_PIN_COLOR[zone.severity]}
          fillColor={`${SEVERITY_PIN_COLOR[zone.severity]}33`}
          strokeWidth={2}
        />
      ))}
      {incidents.map((incident) => (
        <Marker
          key={incident.id}
          coordinate={{ latitude: incident.lat, longitude: incident.lng }}
          title={incident.type.replace('_', ' ')}
          description={`${incident.severity} severity`}
          pinColor={SEVERITY_PIN_COLOR[incident.severity]}
        />
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 220,
    borderRadius: 16,
  },
});
