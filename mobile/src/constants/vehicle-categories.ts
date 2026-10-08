import type { MaterialCommunityIcons } from '@expo/vector-icons';

import type { VehicleCategory } from '@/types/license';

// The DMT vehicle categories in the order printed on the card, with a short
// plain-English name and an icon. Check the names against the DMT's current
// category definitions before release.
export const VEHICLE_CATEGORIES: VehicleCategory[] = [
  'A1',
  'A',
  'B1',
  'B',
  'C1',
  'C',
  'CE',
  'D1',
  'D',
  'DE',
  'G1',
  'G',
  'J',
];

export const CATEGORY_INFO: Record<
  VehicleCategory,
  { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  A1: { label: 'Light motorcycle', icon: 'moped' },
  A: { label: 'Motorcycle', icon: 'motorbike' },
  B1: { label: 'Three-wheeler', icon: 'rickshaw' },
  B: { label: 'Car, van, jeep', icon: 'car' },
  C1: { label: 'Light lorry', icon: 'car-pickup' },
  C: { label: 'Lorry', icon: 'truck' },
  CE: { label: 'Lorry with trailer', icon: 'truck-trailer' },
  D1: { label: 'Light bus', icon: 'bus' },
  D: { label: 'Bus', icon: 'bus' },
  DE: { label: 'Bus with trailer', icon: 'bus-articulated-front' },
  G1: { label: 'Hand tractor', icon: 'tractor' },
  G: { label: 'Tractor', icon: 'tractor' },
  J: { label: 'Special vehicle', icon: 'excavator' },
};
