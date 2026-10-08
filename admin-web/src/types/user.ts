import type { ApplicationStatus } from '@/types/application';
import type { BadgeTier } from '@/types/badge';
import type { RiskLevel } from '@/types/behaviour';
import type { FineStatus, ViolationType } from '@/types/fine';
import type { VehicleCategory } from '@/types/vehicle-category';

export type UserRole = 'DRIVER' | 'POLICE' | 'ADMIN';
export type LicenseStatus = 'ACTIVE' | 'SUSPENDED';

export interface AdminUserListItem {
  id: string;
  email: string;
  nic: string;
  role: UserRole;
  created_at: string;
  license_status: LicenseStatus | null;
  points: number | null;
  latest_application_status: ApplicationStatus | null;
  violation_count: number;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  nic: string;
  role: UserRole;
  created_at: string;
  license: {
    id: string;
    license_no: string;
    status: LicenseStatus;
    points: number;
    issued_at: string;
    expiry_at: string;
    categories: { category: VehicleCategory; issued_at: string; expiry_at: string }[];
  } | null;
  badge: { tier: BadgeTier; safety_score: number } | null;
  behaviour_risk: RiskLevel | null;
  applications: { id: string; status: ApplicationStatus; created_at: string; document_count: number }[];
  violations: {
    type: ViolationType;
    points_deducted: number;
    confirmed_at: string;
    fine_status: FineStatus | null;
    driver_email: string | null;
  }[];
  violation_count: number;
  can_delete: boolean;
  delete_blockers: string[];
}
