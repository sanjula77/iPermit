import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { getMyAppeals } from '@/api/appeals';
import { extractErrorMessage } from '@/api/client';
import { getMyFines } from '@/api/fines';
import type { Appeal, FineWithViolation } from '@/types/fine';

// The driver's fines and appeals, loaded together (the fines list and the fine
// detail screen both need both). Reloads whenever the screen gains focus, so the
// list reflects a payment/appeal made on the detail screen. `fines` is null
// until the first load finishes.
export function useMyFines() {
  const [fines, setFines] = useState<FineWithViolation[] | null>(null);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Focus reloads and pull-to-refresh can overlap; only the newest request may
  // write state, so an older response can't overwrite a newer one.
  const latestRequest = useRef(0);

  const reload = useCallback(async () => {
    const request = ++latestRequest.current;
    setIsLoading(true);
    try {
      const [finesData, appealsData] = await Promise.all([getMyFines(), getMyAppeals()]);
      if (request !== latestRequest.current) return;
      setFines(finesData);
      setAppeals(appealsData);
      setError(null);
    } catch (err) {
      if (request !== latestRequest.current) return;
      setError(extractErrorMessage(err));
    } finally {
      if (request === latestRequest.current) setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { fines, appeals, error, isLoading, reload };
}
