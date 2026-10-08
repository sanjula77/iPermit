// The DMT vehicle categories, in the order printed on the licence. Check the
// names against the DMT's current category definitions before release.
export type VehicleCategory =
  | 'A1'
  | 'A'
  | 'B1'
  | 'B'
  | 'C1'
  | 'C'
  | 'CE'
  | 'D1'
  | 'D'
  | 'DE'
  | 'G1'
  | 'G'
  | 'J';

export const VEHICLE_CATEGORIES: { code: VehicleCategory; label: string }[] = [
  { code: 'A1', label: 'Light motorcycle' },
  { code: 'A', label: 'Motorcycle' },
  { code: 'B1', label: 'Three-wheeler' },
  { code: 'B', label: 'Car, van, jeep' },
  { code: 'C1', label: 'Light lorry' },
  { code: 'C', label: 'Lorry' },
  { code: 'CE', label: 'Lorry with trailer' },
  { code: 'D1', label: 'Light bus' },
  { code: 'D', label: 'Bus' },
  { code: 'DE', label: 'Bus with trailer' },
  { code: 'G1', label: 'Hand tractor' },
  { code: 'G', label: 'Tractor' },
  { code: 'J', label: 'Special vehicle' },
];
