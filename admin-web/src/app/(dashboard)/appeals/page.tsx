'use client';

import { useCallback, useEffect, useState } from 'react';

import * as appealsApi from '@/lib/appeals-api';
import { extractErrorMessage } from '@/lib/api-client';
import type { Appeal, AppealStatus } from '@/types/fine';

const FILTERS: Array<{ label: string; value: AppealStatus | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Upheld', value: 'UPHELD' },
  { label: 'Overturned', value: 'OVERTURNED' },
];

const STATUS_STYLES: Record<AppealStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  UPHELD: 'bg-zinc-200 text-zinc-800',
  OVERTURNED: 'bg-green-100 text-green-800',
};

export default function AppealsPage() {
  const [filter, setFilter] = useState<AppealStatus | 'ALL'>('PENDING');
  const [appeals, setAppeals] = useState<Appeal[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setAppeals(null);
    setLoadError(null);
    try {
      const data = await appealsApi.listAppeals(filter === 'ALL' ? undefined : filter);
      setAppeals(data);
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }, [filter]);

  useEffect(() => {
    // Fetch-on-mount/filter-change, not a state sync — re-runs whenever
    // `load` changes identity (i.e. whenever `filter` changes).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleResolve(appealId: string, resolution: 'UPHELD' | 'OVERTURNED') {
    setActionError(null);
    setPendingActionId(appealId);
    try {
      await appealsApi.resolveAppeal(appealId, resolution);
      await load();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Fine Appeals</h2>
        <p className="text-sm text-zinc-500">
          Uphold to keep the fine as-is, or overturn to reverse the fine and restore the points.
        </p>
      </div>

      <div className="flex gap-2" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            data-testid={`filter-${f.value}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filter === f.value
                ? 'bg-zinc-900 text-white'
                : 'bg-white text-zinc-600 border border-zinc-300 hover:bg-zinc-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {actionError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="action-error">
          {actionError}
        </p>
      ) : null}

      {loadError ? (
        <p className="text-sm text-red-600" data-testid="load-error">
          {loadError}
        </p>
      ) : appeals === null ? (
        <p className="text-sm text-zinc-500" data-testid="appeals-loading">
          Loading…
        </p>
      ) : appeals.length === 0 ? (
        <p className="text-sm text-zinc-500" data-testid="appeals-empty">
          No appeals match this filter.
        </p>
      ) : (
        <ul className="space-y-3" data-testid="appeals-list">
          {appeals.map((appeal) => (
            <li
              key={appeal.id}
              className="rounded-lg border border-zinc-200 bg-white p-4"
              data-testid={`appeal-row-${appeal.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-zinc-900">{appeal.driver.email}</p>
                  <p className="text-sm text-zinc-500">NIC: {appeal.driver.nic}</p>
                  <p className="mt-2 text-sm text-zinc-700">
                    {appeal.fine.violation.type.replace('_', ' ')} — LKR {appeal.fine.amount}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Violation confirmed {new Date(appeal.fine.violation.confirmed_at).toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm text-zinc-600">Reason: {appeal.reason}</p>
                  <p className="text-xs text-zinc-400">
                    Appealed {new Date(appeal.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[appeal.status]}`}
                  data-testid="appeal-status"
                >
                  {appeal.status}
                </span>
              </div>

              {appeal.status === 'PENDING' ? (
                <div className="mt-3 flex gap-2 border-t border-zinc-100 pt-3">
                  <button
                    type="button"
                    onClick={() => handleResolve(appeal.id, 'OVERTURNED')}
                    disabled={pendingActionId === appeal.id}
                    data-testid={`overturn-${appeal.id}`}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Overturn
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolve(appeal.id, 'UPHELD')}
                    disabled={pendingActionId === appeal.id}
                    data-testid={`uphold-${appeal.id}`}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                  >
                    Uphold
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
