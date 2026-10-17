export type ViolationType = 'WHITE_LINE' | 'SPEEDING' | 'RED_LIGHT' | 'DRUNK_DRIVING' | 'OTHER';
export type FineStatus = 'UNPAID' | 'PAID' | 'REVERSED';
export type PaymentMethod = 'CARD' | 'BANK' | 'WALLET';
export type AppealStatus = 'PENDING' | 'UPHELD' | 'OVERTURNED';

export interface ViolationRead {
  id: string;
  type: ViolationType;
  points_deducted: number;
  evidence_ref: string | null;
  // What the officer wrote, for an OTHER violation.
  description: string | null;
  confirmed_at: string;
}

export interface FineWithViolation {
  id: string;
  amount: number;
  status: FineStatus;
  created_at: string;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  violation: ViolationRead;
}

export interface DriverSummary {
  email: string;
  nic: string;
}

export interface Appeal {
  id: string;
  driver: DriverSummary;
  fine: FineWithViolation;
  reason: string;
  status: AppealStatus;
  created_at: string;
  resolved_at: string | null;
}
