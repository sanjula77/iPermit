// Copy of the backend's face_match_threshold (app/core/config.py), used only to
// describe a score to the officer; the backend makes the real decision. If
// these drift, only that wording is wrong. Keep them in sync.
export const FACE_MATCH_THRESHOLD = 0.42;

// Cosine similarity can be negative for poor matches; show 0-100.
export function matchPercent(similarity: number): number {
  return Math.round(Math.min(Math.max(similarity, 0), 1) * 100);
}

// How the officer identified the driver, shown on the driver's details.
export type Identification =
  | { method: 'face'; similarity: number; confirmedByOfficer: boolean }
  | { method: 'qr' }
  | { method: 'lookup' };

// Route params are strings; these convert both ways.
export function identificationParams(id: Identification): Record<string, string> {
  return id.method === 'face'
    ? { method: 'face', similarity: String(id.similarity), confirmed: id.confirmedByOfficer ? '1' : '0' }
    : { method: id.method };
}

export function parseIdentification(params: {
  method?: string;
  similarity?: string;
  confirmed?: string;
}): Identification | null {
  if (params.method === 'qr' || params.method === 'lookup') return { method: params.method };
  const similarity = Number(params.similarity);
  if (params.method === 'face' && Number.isFinite(similarity)) {
    return { method: 'face', similarity, confirmedByOfficer: params.confirmed === '1' };
  }
  return null;
}
