import { useEffect, useRef } from 'react';
import MapView, { Circle, Marker, UrlTile } from 'react-native-maps';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { INCIDENT_LABEL, SEVERITY_COLOR, SEVERITY_LABEL } from '@/constants/incidents';
import { Radius, tint } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DangerZone } from '@/types/danger-zone';
import type { RoadIncident } from '@/types/road-incident';

// Android's Google base map needs a Maps API key (and a custom build) to load
// tiles; without one it renders blank grey. So Android draws its own tiles:
// CARTO's Voyager basemap (OpenStreetMap data). It needs no key; OSM's own tile
// servers refuse apps that don't identify themselves (the phone showed their
// "not following the tile usage policy" tile). CARTO's free tier suits a
// prototype and requires the attribution shown below.
// iOS keeps Apple Maps, which works without a key.
const USE_CUSTOM_TILES = Platform.OS === 'android';
const TILE_URL = 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

export function IncidentsMap({
  center,
  incidents,
  zones = [],
  focus,
}: {
  center: { lat: number; lng: number };
  incidents: RoadIncident[];
  zones?: DangerZone[];
  /** When set, the map pans and zooms to this point (e.g. a tapped list row). */
  focus?: { lat: number; lng: number } | null;
}) {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);

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
        mapType={USE_CUSTOM_TILES ? 'none' : 'standard'}
        initialRegion={{
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        testID="incidents-map"
      >
        {USE_CUSTOM_TILES ? <UrlTile urlTemplate={TILE_URL} maximumZ={19} shouldReplaceMapContent /> : null}
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
      </MapView>
      {USE_CUSTOM_TILES ? (
        <View style={styles.attribution} pointerEvents="none">
          <Text style={styles.attributionText}>© OpenStreetMap contributors © CARTO</Text>
        </View>
      ) : null}
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
  attribution: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopLeftRadius: 6,
  },
  attributionText: {
    fontSize: 10,
    color: '#333333',
  },
});
