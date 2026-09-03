import { apiClient } from '@/api/client';
import type { FineWithViolation, PaymentMethod } from '@/types/fine';

export async function getMyFines(): Promise<FineWithViolation[]> {
  return apiClient.get<FineWithViolation[]>('/fines/me');
}

export async function payFine(
  fineId: string,
  paymentMethod: PaymentMethod,
): Promise<{ fine: FineWithViolation; driver_points: number; license_status: string }> {
  return apiClient.post(`/fines/${fineId}/pay`, { payment_method: paymentMethod });
}
