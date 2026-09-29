import { useEffect, useRef } from 'react';
import MapView, { Circle, Marker } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';

import { LocateButton, MAP_TYPE, MapAttribution, MapTiles, UserDot } from '@/components/map-parts';
import { INCIDENT_LABEL, SEVERITY_COLOR, SEVERITY_LABEL } from '@/constants/incidents';
import { Radius, tint } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DangerZone } from '@/types/danger-zone';
import type { RoadIncident } from '@/types/road-incident';

export function IncidentsMap({
  center,
  incidents,
  zones = [],
  focus,
  userLocation,
}: {
  center: { lat: number; lng: number };
  /** The device's real position (not the Colombo fallback): drawn as a dot, with a locate button. */
  userLocation?: { lat: number; lng: number } | null;
  incidents: RoadIncident[];
  zones?: DangerZone[];
  /** When set, the map pans and zooms to this point (e.g. a tapped list row). */
  focus?: { lat: number; lng: number } | null;
}) {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);

  function goToUser() {
    if (!userLocation) return;
    mapRef.current?.animateToRegion(
      { latitude: userLocation.lat, longitude: userLocation.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      400,
    );
  }

  useEffect(() => {
    if (focus) {
      mapRef.current?.animateToRegion(
        { latitude: focus.lat, longitude: focus.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        400,
      );
    }
  }, [focus]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapType={MAP_TYPE}
        initialRegion={{
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        testID="incidents-map"
      >
        <MapTiles />
        {zones.map((zone) => (
          <Circle
            key={zone.id}
            center={{ latitude: zone.lat, longitude: zone.lng }}
            radius={zone.radius_m}
            strokeColor={theme[SEVERITY_COLOR[zone.severity]]}
            fillColor={tint(theme[SEVERITY_COLOR[zone.severity]], 'strong')}
            strokeWidth={2}
          />
        ))}
        {incidents.map((incident) => (
          <Marker
            key={incident.id}
            coordinate={{ latitude: incident.lat, longitude: incident.lng }}
            title={INCIDENT_LABEL[incident.type]}
            description={`${SEVERITY_LABEL[incident.severity]} severity`}
            pinColor={theme[SEVERITY_COLOR[incident.severity]]}
          />
        ))}
        {userLocation ? <UserDot lat={userLocation.lat} lng={userLocation.lng} /> : null}
      </MapView>
      {userLocation ? <LocateButton onPress={goToUser} /> : null}
      <MapAttribution />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 280,
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
});
