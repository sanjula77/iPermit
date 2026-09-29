import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Marker, UrlTile } from 'react-native-maps';

import { PressableScale } from '@/components/pressable-scale';
import { Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Shared by every map in the app (incidents map, report location picker).
//
// Android's Google base map needs a Maps API key (and a custom build) to load
// tiles; without one it renders blank grey. So Android draws its own tiles:
// Esri's World Street Map, which serves apps without a key. (Tried first and
// refused on the phone: OSM's own servers, which block apps that don't
// identify themselves, and CARTO, which now needs an API key.) Fine for a
// prototype; Esri's terms need an ArcGIS account for production use. Esri's
// URL takes the row before the column: {z}/{y}/{x}.
// iOS keeps Apple Maps, which works without a key.
export const USE_CUSTOM_TILES = Platform.OS === 'android';
const TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

export const MAP_TYPE = USE_CUSTOM_TILES ? 'none' : 'standard';

// Place inside <MapView>.
export function MapTiles() {
  return USE_CUSTOM_TILES ? <UrlTile urlTemplate={TILE_URL} maximumZ={19} shouldReplaceMapContent /> : null;
}

// Place after <MapView>, inside the map's container.
export function MapAttribution() {
  if (!USE_CUSTOM_TILES) return null;
  return (
    <View style={styles.attribution} pointerEvents="none">
      <Text style={styles.attributionText} numberOfLines={2}>
        Tiles © Esri · Esri, HERE, Garmin, © OpenStreetMap contributors and others
      </Text>
    </View>
  );
}

// "You are here": a brand dot with a white ring. Drawn as a marker because the
// platform location layer needs Google Play map services on Android.
export function UserDot({ lat, lng }: { lat: number; lng: number }) {
  const theme = useTheme();
  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={false}
      title="You are here"
    >
      <View style={[styles.dotHalo, { backgroundColor: `${theme.primary}33` }]}>
        <View style={[styles.dot, { backgroundColor: theme.primary }]} />
      </View>
    </Marker>
  );
}

// Round button in the map's top-right corner that re-centres on the user.
export function LocateButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Show my location"
      hitSlop={4}
      style={styles.locateOuter}
      contentStyle={[styles.locate, { backgroundColor: theme.backgroundElement, boxShadow: Shadows.raised }]}
      testID="map-locate"
    >
      <Ionicons name="locate" size={22} color={theme.primary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  attribution: {
    position: 'absolute',
    // The Esri credit is long: keep it inside the map, wrapping to two lines.
    maxWidth: '100%',
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderTopLeftRadius: 6,
  },
  attributionText: { fontSize: 10, color: '#333333' },
  dotHalo: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: '#ffffff' },
  locateOuter: { position: 'absolute', top: 12, right: 12 },
  locate: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
