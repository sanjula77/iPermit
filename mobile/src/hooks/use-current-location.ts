import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

export type LatLng = { lat: number; lng: number };

// Colombo, Sri Lanka -- fallback only, used when location permission is
// denied or unavailable, so the screen still functions for a demo/preview.
const FALLBACK_LOCATION: LatLng = { lat: 6.9271, lng: 79.8612 };

// The device's location, asked for once on mount. `note` explains when the
// Colombo fallback is being used instead.
export function useCurrentLocation() {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) {
            setNote('Location permission denied. Showing the area around Colombo instead.');
            setLocation(FALLBACK_LOCATION);
          }
          return;
        }
        const position = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        }
      } catch {
        if (!cancelled) {
          setNote('Could not determine your location. Showing the area around Colombo instead.');
          setLocation(FALLBACK_LOCATION);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { location, note };
}
