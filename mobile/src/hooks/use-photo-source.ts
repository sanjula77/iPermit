import { useEffect, useState } from 'react';

import type { PhotoSource } from '@/api/photo-source';

// Loads a protected photo for an image component: null while it loads or when
// there isn't one. Reloads when `key` changes and releases a web blob URL on
// the way out.
export function usePhotoSource(load: () => Promise<PhotoSource | null>, key: string): PhotoSource | null {
  const [photo, setPhoto] = useState<PhotoSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;
    load()
      .then((source) => {
        if (source?.uri.startsWith('blob:')) blobUrl = source.uri;
        if (!cancelled) setPhoto(source);
        else if (blobUrl) URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // `load` is a fresh closure each render; `key` identifies what it loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return photo;
}
