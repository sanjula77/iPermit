import { ThemedText } from '@/components/themed-text';
import type { LatLng } from '@/hooks/use-current-location';

// react-native-maps has no web renderer; on web the report uses the browser's
// own location (see report.tsx), so there is nothing to pick here.
export function LocationPicker(_props: {
  start: LatLng;
  userLocation: LatLng | null;
  onPick: (point: LatLng) => void;
}) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      Choosing a place on the map is only available in the mobile app.
    </ThemedText>
  );
}
