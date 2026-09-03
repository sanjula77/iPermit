import { apiClient } from '@/api/client';
import { appendFilePart, type PickedFile } from '@/lib/file-upload';
import type {
  DriverSummary,
  RecordViolationResponse,
  ViolationType,
  VerifyFaceResponse,
} from '@/types/police';

export async function verifyFace(photo: PickedFile): Promise<VerifyFaceResponse> {
  const formData = new FormData();
  appendFilePart(formData, 'photo', photo);
  return apiClient.postForm<VerifyFaceResponse>('/police/verify-face', formData);
}

export async function verifyQr(qrToken: string): Promise<DriverSummary> {
  return apiClient.get<DriverSummary>(`/police/verify-qr/${encodeURIComponent(qrToken)}`);
}

export async function lookupDriver(params: {
  nic?: string;
  licenseNo?: string;
}): Promise<DriverSummary> {
  const query = new URLSearchParams();
  if (params.nic) query.set('nic', params.nic);
  if (params.licenseNo) query.set('license_no', params.licenseNo);
  return apiClient.get<DriverSummary>(`/police/lookup?${query.toString()}`);
}

export async function recordViolation(payload: {
  driverId: string;
  type: ViolationType;
  evidenceRef?: string;
}): Promise<RecordViolationResponse> {
  return apiClient.post<RecordViolationResponse>('/police/violations', {
    driver_id: payload.driverId,
    type: payload.type,
    evidence_ref: payload.evidenceRef || undefined,
  });
}
