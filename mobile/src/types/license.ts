export type LicenseStatus = 'ACTIVE' | 'SUSPENDED';

// The DMT vehicle categories, in the order they are printed on the card.
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

export interface LicenseCategory {
  category: VehicleCategory;
  issued_at: string;
  expiry_at: string;
}

export interface License {
  id: string;
  license_no: string;
  qr_token: string;
  status: LicenseStatus;
  points: number;
  issued_at: string;
  expiry_at: string;
  categories: LicenseCategory[];
  // When the earliest points still counting drop off; null if none count.
  points_expire_at: string | null;
}
