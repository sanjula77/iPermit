'use client';

import { Gavel, RotateCcw, Scale, ShieldCheck, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  Alert,
  Avatar,
  Button,
  Card,
  EmptyState,
  FilterTabs,
  PageHeader,
  StatCard,
  StatusPill,
  TableSkeleton,
  type Tone,
} from '@/components/ui';
import * as appealsApi from '@/lib/appeals-api';
import { extractErrorMessage } from '@/lib/api-client';
import { formatDate, formatLkr, violationTitle } from '@/lib/format';
import type { Appeal, AppealStatus } from '@/types/fine';

type Filter = AppealStatus | 'ALL';

// UPHELD means the fine stands; OVERTURNED means it was reversed -- same plain
// wording as the driver's app.
const STATUS: Record<AppealStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending', tone: 'amber' },
  UPHELD: { label: 'Upheld · fine stands', tone: 'gray' },
  OVERTURNED: { label: 'Overturned · reversed', tone: 'green' },
};

export default function AppealsPage() {
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [appeals, setAppeals] = useState<Appeal[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setAppeals(await appealsApi.listAppeals());
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount, not a state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const count = (status: AppealStatus) => (appeals ?? []).filter((a) => a.status === status).length;
  const visible = (appeals ?? []).filter((a) => filter === 'ALL' || a.status === filter);

  async function handleResolve(appeal: Appeal, resolution: 'UPHELD' | 'OVERTURNED') {
    setActionError(null);
    setNotice(null);
    setPendingActionId(appeal.id);
    try {
      await appealsApi.resolveAppeal(appeal.id, resolution);
      setNotice(
        resolution === 'OVERTURNED'
          ? `Overturned: ${appeal.driver.email}'s fine is reversed and the points restored.`
          : `Upheld: ${appeal.driver.email}'s fine stands.`,
      );
      await load();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Fine appeals"
        description="Overturn to reverse the fine and restore the points, or uphold to keep it."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting decision" value={appeals ? count('PENDING') : '–'} icon={Scale} tone="amber" testId="stat-pending" />
        <StatCard label="Overturned" value={appeals ? count('OVERTURNED') : '–'} icon={RotateCcw} tone="green" />
        <StatCard label="Upheld" value={appeals ? count('UPHELD') : '–'} icon={Gavel} tone="gray" />
      </div>

      <FilterTabs<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { label: 'Pending', value: 'PENDING', count: appeals ? count('PENDING') : undefined },
          { label: 'Overturned', value: 'OVERTURNED', count: appeals ? count('OVERTURNED') : undefined },
          { label: 'Upheld', value: 'UPHELD', count: appeals ? count('UPHELD') : undefined },
          { label: 'All', value: 'ALL', count: appeals?.length },
        ]}
      />

      {notice ? <Alert tone="green">{notice}</Alert> : null}
      {actionError ? <Alert tone="red" testId="action-error">{actionError}</Alert> : null}

      <Card className="overflow-hidden">
        {loadError ? (
          <div className="p-5">
            <Alert tone="red" testId="load-error">
              {loadError}
            </Alert>
          </div>
        ) : appeals === null ? (
          <TableSkeleton testId="appeals-loading" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={filter === 'PENDING' ? 'All caught up' : 'No appeals here'}
            message={filter === 'PENDING' ? 'There are no appeals waiting for a decision.' : 'No appeals match this filter.'}
            testId="appeals-empty"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="appeals-list">
              <thead className="border-b border-gray-100 bg-gray-50/60 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Driver</th>
                  <th className="px-5 py-3">Fine</th>
                  <th className="px-5 py-3">Driver&apos;s reason</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((appeal) => {
                  const busy = pendingActionId === appeal.id;
                  return (
                    <tr key={appeal.id} className="align-top hover:bg-gray-50/60" data-testid={`appeal-row-${appeal.id}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar email={appeal.driver.email} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">{appeal.driver.email}</p>
                            <p className="text-xs text-gray-500">NIC {appeal.driver.nic}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <p className="font-medium text-gray-900">{violationTitle(appeal.fine.violation.type, appeal.fine.violation.description)}</p>
                        <p className="text-xs text-gray-500">
                          {formatLkr(appeal.fine.amount)} · {appeal.fine.violation.points_deducted} pts ·{' '}
                          {formatDate(appeal.fine.violation.confirmed_at)}
                        </p>
                      </td>
                      <td className="max-w-sm px-5 py-4">
                        <p className="line-clamp-3 text-gray-700" title={appeal.reason}>
                          {appeal.reason}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">Appealed {formatDate(appeal.created_at)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill label={STATUS[appeal.status].label} tone={STATUS[appeal.status].tone} testId="appeal-status" />
                      </td>
                      <td className="px-5 py-4">
                        {appeal.status === 'PENDING' ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="success"
                              icon={Undo2}
                              onClick={() => handleResolve(appeal, 'OVERTURNED')}
                              disabled={busy}
                              data-testid={`overturn-${appeal.id}`}
                            >
                              Overturn
                            </Button>
                            <Button
                              variant="secondary"
                              icon={Gavel}
                              onClick={() => handleResolve(appeal, 'UPHELD')}
                              disabled={busy}
                              data-testid={`uphold-${appeal.id}`}
                            >
                              Uphold
                            </Button>
                          </div>
                        ) : (
                          <p className="text-right text-xs text-gray-400">
                            {appeal.resolved_at ? `Decided ${formatDate(appeal.resolved_at)}` : 'Decided'}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
