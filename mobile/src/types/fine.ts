import type { ViolationRead } from '@/types/police';

export type FineStatus = 'UNPAID' | 'PAID' | 'REVERSED';
export type PaymentMethod = 'CARD' | 'BANK' | 'WALLET';
export type AppealStatus = 'PENDING' | 'UPHELD' | 'OVERTURNED';

export interface FineWithViolation {
  id: string;
  amount: number;
  status: FineStatus;
  created_at: string;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  violation: ViolationRead;
}

export interface Appeal {
  id: string;
  driver: { email: string; nic: string };
  fine: FineWithViolation;
  reason: string;
  status: AppealStatus;
  created_at: string;
  resolved_at: string | null;
}
