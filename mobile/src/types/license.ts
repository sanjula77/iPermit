export type LicenseStatus = 'ACTIVE' | 'SUSPENDED';

export interface License {
  id: string;
  license_no: string;
  qr_token: string;
  status: LicenseStatus;
  points: number;
  issued_at: string;
  expiry_at: string;
}
