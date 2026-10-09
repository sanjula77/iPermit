import { API_URL } from '@/api/client';
import { getToken } from '@/lib/token-storage';

// Where an image component loads a protected photo from.
export interface PhotoSource {
  uri: string;
  headers?: Record<string, string>;
}

// A photo behind the user's login needs the bearer token, which an image URL
// can't carry on its own. Native image components accept request headers; the
// web <img> doesn't, so there the bytes are fetched and handed over as a local
// blob URL (revoke it with URL.revokeObjectURL when done). null when there's
// no photo to show.
export async function getPhotoSource(path: string): Promise<PhotoSource | null> {
  const token = await getToken();
  if (!token) return null;
  const uri = `${API_URL}${path}`;
  const headers = { Authorization: `Bearer ${token}` };
  if (process.env.EXPO_OS === 'web') {
    const response = await fetch(uri, { headers });
    if (!response.ok) return null;
    return { uri: URL.createObjectURL(await response.blob()) };
  }
  return { uri, headers };
}
