'use client';

import { useCallback, useEffect, useState } from 'react';

import { extractErrorMessage } from '@/lib/api-client';
import * as badgesApi from '@/lib/badges-api';
import type { BadgeDistribution, BadgeTier } from '@/types/badge';

const TIER_ORDER: BadgeTier[] = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'AT_RISK', 'SUSPENDED'];

const TIER_STYLES: Record<BadgeTier, string> = {
  PLATINUM: 'bg-indigo-100 text-indigo-800',
  GOLD: 'bg-amber-100 text-amber-800',
  SILVER: 'bg-zinc-200 text-zinc-800',
  BRONZE: 'bg-orange-100 text-orange-800',
  AT_RISK: 'bg-red-100 text-red-800',
  SUSPENDED: 'bg-red-200 text-red-900',
};

export default function BadgesPage() {
  const [data, setData] = useState<BadgeDistribution | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setData(await badgesApi.getBadgeDistribution());
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount, not a state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Driver Behavior Analytics</h2>
        <p className="text-sm text-zinc-500">
          Rule-based badge distribution and the attention queue of at-risk/suspended drivers.
        </p>
      </div>

      {loadError ? (
        <p className="text-sm text-red-600" data-testid="load-error">
          {loadError}
        </p>
      ) : data === null ? (
        <p className="text-sm text-zinc-500" data-testid="badges-loading">
          Loading…
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6" data-testid="badge-distribution">
            {TIER_ORDER.map((tier) => (
              <div
                key={tier}
                className="rounded-lg border border-zinc-200 bg-white p-4 text-center"
                data-testid={`tier-count-${tier}`}
              >
                <p
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_STYLES[tier]}`}
                >
                  {tier.replace('_', ' ')}
                </p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">
                  {data.distribution[tier] ?? 0}
                </p>
              </div>
            ))}
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-zinc-900">Attention Queue</h3>
            {data.attention_queue.length === 0 ? (
              <p className="text-sm text-zinc-500" data-testid="attention-queue-empty">
                No at-risk or suspended drivers right now.
              </p>
            ) : (
              <ul className="space-y-2" data-testid="attention-queue-list">
                {data.attention_queue.map((entry) => (
                  <li
                    key={entry.driver.nic}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4"
                    data-testid={`attention-row-${entry.driver.nic}`}
                  >
                    <div>
                      <p className="font-medium text-zinc-900">{entry.driver.email}</p>
                      <p className="text-sm text-zinc-500">NIC: {entry.driver.nic}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-zinc-500">Score: {entry.safety_score}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_STYLES[entry.tier]}`}
                      >
                        {entry.tier.replace('_', ' ')}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
