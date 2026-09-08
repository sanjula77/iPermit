import MapView, { Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native';

import type { RoadIncident } from '@/types/road-incident';

const SEVERITY_PIN_COLOR: Record<RoadIncident['severity'], string> = {
  HIGH: '#d92d20',
  MEDIUM: '#208AEF',
  LOW: '#60646C',
};

export function IncidentsMap({
  center,
  incidents,
}: {
  center: { lat: number; lng: number };
  incidents: RoadIncident[];
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
