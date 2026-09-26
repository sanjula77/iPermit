import { apiClient } from '@/api/client';
import type { FineWithViolation, PaymentMethod } from '@/types/fine';
import type { LicenseStatus } from '@/types/license';

export async function getMyFines(): Promise<FineWithViolation[]> {
  return apiClient.get<FineWithViolation[]>('/fines/me');
}

export async function payFine(
  fineId: string,
  paymentMethod: PaymentMethod,
): Promise<{ fine: FineWithViolation; driver_points: number; license_status: LicenseStatus }> {
  return apiClient.post(`/fines/${fineId}/pay`, { payment_method: paymentMethod });
}
