import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';

import { LocateButton, MAP_TYPE, MapAttribution, MapTiles, UserDot } from '@/components/map-parts';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LatLng } from '@/hooks/use-current-location';

// Choose where something happened: the pin stays in the middle and the user
// drags the map under it. Only the user's own gestures (or the locate button)
// report a point, so a starting position that is just the Colombo fallback is
// never picked by accident.
export function LocationPicker({
  start,
  userLocation,
  onPick,
}: {
  start: LatLng;
  // The device's real position (not the fallback), for the dot and locate button.
  userLocation: LatLng | null;
  onPick: (point: LatLng) => void;
}) {
  const theme = useTheme();
  const mapRef = useRef<MapView>(null);

  function goToUser() {
    if (!userLocation) return;
    mapRef.current?.animateToRegion(
      { latitude: userLocation.lat, longitude: userLocation.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 },
      300,
    );
    onPick(userLocation);
  }

  return (
    <View style={styles.container} testID="report-location-picker">
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapType={MAP_TYPE}
        initialRegion={{ latitude: start.lat, longitude: start.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
        onRegionChangeComplete={(region, details) => {
          if (details?.isGesture) onPick({ lat: region.latitude, lng: region.longitude });
        }}
      >
        <MapTiles />
        {userLocation ? <UserDot lat={userLocation.lat} lng={userLocation.lng} /> : null}
      </MapView>
      {/* The pin's tip marks the map centre, so it's lifted by half its height. */}
      <View pointerEvents="none" style={styles.pinWrap}>
        <Ionicons name="location" size={40} color={theme.danger} style={styles.pin} />
      </View>
      {userLocation ? <LocateButton onPress={goToUser} /> : null}
      <MapAttribution />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 240,
    borderRadius: Radius.medium,
    overflow: 'hidden',
  },
  pinWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  pin: { transform: [{ translateY: -20 }] },
});
