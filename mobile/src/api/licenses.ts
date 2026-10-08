import { API_URL, apiClient } from '@/api/client';
import { getToken } from '@/lib/token-storage';
import type { License } from '@/types/license';

export async function getMyLicense(): Promise<License> {
  return apiClient.get<License>('/licenses/me');
}

// Where an image component loads the driver's registration photo from.
export interface PhotoSource {
  uri: string;
  headers?: Record<string, string>;
}

// The photo needs the bearer token, which an image URL can't carry on its own.
// Native image components accept request headers; the web <img> doesn't, so
// there the bytes are fetched and handed over as a local blob URL (revoke it
// with URL.revokeObjectURL when done). null when there's no photo to show.
export async function getLicensePhotoSource(): Promise<PhotoSource | null> {
  const token = await getToken();
  if (!token) return null;
  const uri = `${API_URL}/licenses/me/photo`;
  const headers = { Authorization: `Bearer ${token}` };
  if (process.env.EXPO_OS === 'web') {
    const response = await fetch(uri, { headers });
    if (!response.ok) return null;
    return { uri: URL.createObjectURL(await response.blob()) };
  }
  return { uri, headers };
}
