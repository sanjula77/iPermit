'use client';

import { FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

import { extractErrorMessage, fetchBlob } from '@/lib/api-client';

type BlobState = { url: string; type: string } | { error: string } | null;

// Loads an authenticated file as a blob URL, and frees it on unmount.
function useAuthedBlob(path: string): BlobState {
  const [state, setState] = useState<BlobState>(null);
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    fetchBlob(path)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, type: blob.type });
      })
      .catch((err) => {
        if (!cancelled) setState({ error: extractErrorMessage(err) });
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);
  return state;
}

// Opens an authenticated file in a new tab. The tab is opened synchronously
// (inside the click) so pop-up blockers allow it, then pointed at the file.
export async function openAuthedFile(path: string): Promise<void> {
  const tab = window.open('', '_blank');
  try {
    const blob = await fetchBlob(path);
    const url = URL.createObjectURL(blob);
    if (tab) tab.location.href = url;
    else window.location.href = url;
  } catch (err) {
    tab?.close();
    throw err;
  }
}

// A photo or document preview: an image shows as a picture, anything else
// (a PDF) as a file icon. Clicking calls onOpen.
export function AuthedPreview({
  path,
  label,
  onOpen,
  testId,
}: {
  path: string;
  label: string;
  onOpen?: () => void;
  testId?: string;
}) {
  const state = useAuthedBlob(path);
  const isImage = state !== null && 'url' in state && state.type.startsWith('image/');

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${label}`}
      data-testid={testId}
      className="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-colors hover:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
    >
      {state === null ? (
        <div className="h-full w-full animate-pulse bg-gray-100" />
      ) : 'error' in state ? (
        <span className="px-2 text-center text-xs text-red-700">Could not load: {state.error}</span>
      ) : isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- a blob URL, not an optimisable remote image
        <img src={state.url} alt={label} className="h-full w-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-1 text-gray-600">
          <FileText className="h-8 w-8" aria-hidden />
          <span className="text-xs font-medium">PDF</span>
        </span>
      )}
    </button>
  );
}

// A single large image, for the enlarged view.
export function AuthedImage({ path, alt }: { path: string; alt: string }) {
  const state = useAuthedBlob(path);
  if (state === null) return <div className="h-96 animate-pulse rounded-xl bg-gray-100" />;
  if ('error' in state) return <p className="text-sm text-red-700">Could not load: {state.error}</p>;
  // eslint-disable-next-line @next/next/no-img-element -- a blob URL, not an optimisable remote image
  return <img src={state.url} alt={alt} className="max-h-[70vh] w-full rounded-xl object-contain" />;
}
