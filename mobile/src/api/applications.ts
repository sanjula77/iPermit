import { apiClient } from '@/api/client';
import { appendFilePart, type PickedFile } from '@/lib/file-upload';
import type { Application } from '@/types/application';

export interface SubmitApplicationPayload {
  facePhotos: PickedFile[];
  nicDocument: PickedFile;
  medicalCert: PickedFile;
  birthCert: PickedFile;
}

export async function submitApplication(payload: SubmitApplicationPayload): Promise<Application> {
  const formData = new FormData();
  for (const photo of payload.facePhotos) {
    appendFilePart(formData, 'face_photos', photo);
  }
  appendFilePart(formData, 'nic_document', payload.nicDocument);
  appendFilePart(formData, 'medical_cert', payload.medicalCert);
  appendFilePart(formData, 'birth_cert', payload.birthCert);

  return apiClient.postForm<Application>('/applications', formData);
}

export async function listApplications(): Promise<Application[]> {
  return apiClient.get<Application[]>('/applications');
}
