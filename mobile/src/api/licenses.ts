import { apiClient } from '@/api/client';
import { getPhotoSource, type PhotoSource } from '@/api/photo-source';
import type { License } from '@/types/license';

export type { PhotoSource };

export async function getMyLicense(): Promise<License> {
  return apiClient.get<License>('/licenses/me');
}

// The driver's own registration photo, shown on their card.
export function getLicensePhotoSource(): Promise<PhotoSource | null> {
  return getPhotoSource('/licenses/me/photo');
}
