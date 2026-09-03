import type { LicenseStatus } from '@/types/license';

export type ViolationType = 'WHITE_LINE' | 'SPEEDING' | 'RED_LIGHT' | 'DRUNK_DRIVING';
export type FineStatus = 'UNPAID' | 'PAID' | 'REVERSED';

export interface ViolationRead {
  id: string;
  type: ViolationType;
  points_deducted: number;
  evidence_ref: string | null;
  confirmed_at: string;
}

export interface FineRead {
  id: string;
  amount: number;
  status: FineStatus;
  created_at: string;
  paid_at: string | null;
}

export interface DriverSummary {
  driver_id: string;
  email: string;
  nic: string;
  license_no: string | null;
  license_status: LicenseStatus | null;
  points: number | null;
  violations: ViolationRead[];
}

export interface FaceMatchCandidate {
  driver: DriverSummary;
  similarity: number;
}

export interface VerifyFaceResponse {
  requires_manual_confirmation: boolean;
  best_match: FaceMatchCandidate | null;
  candidates: FaceMatchCandidate[];
}

export interface RecordViolationResponse {
  violation: ViolationRead;
  fine: FineRead;
  driver_points: number;
  license_status: LicenseStatus;
}
