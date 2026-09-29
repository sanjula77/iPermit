'use client';

import { AlertTriangle, Award, Ban, Medal, Shield, ShieldCheck, Star, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Alert, Avatar, Card, EmptyState, PageHeader, StatCard, StatusPill, TableSkeleton, toneClasses, type Tone } from '@/components/ui';
import { extractErrorMessage } from '@/lib/api-client';
import * as badgesApi from '@/lib/badges-api';
import { formatDate } from '@/lib/format';
import type { BadgeDistribution, BadgeTier } from '@/types/badge';

const TIER_ORDER: BadgeTier[] = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'AT_RISK', 'SUSPENDED'];

const TIER: Record<BadgeTier, { label: string; tone: Tone; icon: LucideIcon }> = {
  PLATINUM: { label: 'Platinum', tone: 'indigo', icon: Star },
  GOLD: { label: 'Gold', tone: 'amber', icon: Medal },
  SILVER: { label: 'Silver', tone: 'gray', icon: Award },
  BRONZE: { label: 'Bronze', tone: 'orange', icon: Shield },
  AT_RISK: { label: 'At risk', tone: 'red', icon: AlertTriangle },
  SUSPENDED: { label: 'Suspended', tone: 'red', icon: Ban },
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

  const total = data ? TIER_ORDER.reduce((sum, tier) => sum + (data.distribution[tier] ?? 0), 0) : 0;
  const good = data ? (data.distribution.PLATINUM ?? 0) + (data.distribution.GOLD ?? 0) : 0;

  return (
    <>
      <PageHeader
        title="Driver behaviour"
        description="Rule-based safety badges across licensed drivers, and who needs attention."
      />

      {loadError ? (
        <Alert tone="red" testId="load-error">
          {loadError}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Drivers with a badge" value={data ? total : '–'} icon={Users} tone="brand" />
        <StatCard
          label="Gold or better"
          value={data ? good : '–'}
          icon={ShieldCheck}
          tone="green"
          hint={data && total ? `${Math.round((good / total) * 100)}% of drivers` : undefined}
        />
        <StatCard
          label="Need attention"
          value={data ? data.attention_queue.length : '–'}
          icon={AlertTriangle}
          tone="red"
          hint="At risk or suspended"
        />
      </div>

      <Card className="p-5">
        <h2 className="font-semibold text-gray-900">Badge distribution</h2>
        {data === null ? (
          <div className="mt-4 h-40 animate-pulse rounded-xl bg-gray-100" data-testid="badges-loading" />
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="badge-distribution">
            {TIER_ORDER.map((tier) => {
              const n = data.distribution[tier] ?? 0;
              const share = total ? (n / total) * 100 : 0;
              const t = toneClasses(TIER[tier].tone);
              const Icon = TIER[tier].icon;
              return (
                <div key={tier} className="rounded-xl border border-gray-100 p-4" data-testid={`tier-count-${tier}`}>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-2 text-sm font-semibold ${t.text}`}>
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${t.soft}`}>
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      {TIER[tier].label}
                    </span>
                    <span className="text-2xl font-bold tabular-nums text-gray-900">{n}</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden>
                    <div className={`h-full rounded-full ${t.solid}`} style={{ width: `${share}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">{Math.round(share)}% of drivers</p>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Attention queue</h2>
          <p className="text-sm text-gray-500">At-risk and suspended drivers, lowest score first.</p>
        </div>
        {data === null ? (
          <TableSkeleton />
        ) : data.attention_queue.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No one needs attention"
            message="No drivers are at risk or suspended right now."
            testId="attention-queue-empty"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="attention-queue-list">
              <thead className="border-b border-gray-100 bg-gray-50/60 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Driver</th>
                  <th className="px-5 py-3">Safety score</th>
                  <th className="px-5 py-3">Badge</th>
                  <th className="px-5 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...data.attention_queue]
                  .sort((a, b) => a.safety_score - b.safety_score)
                  .map((entry) => (
                    <tr key={entry.driver.nic} className="hover:bg-gray-50/60" data-testid={`attention-row-${entry.driver.nic}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar email={entry.driver.email} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">{entry.driver.email}</p>
                            <p className="text-xs text-gray-500">NIC {entry.driver.nic}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-8 font-bold tabular-nums text-gray-900">{entry.safety_score}</span>
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100" aria-hidden>
                            <div className="h-full rounded-full bg-red-500" style={{ width: `${entry.safety_score}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill label={TIER[entry.tier].label} tone={TIER[entry.tier].tone} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-gray-500">{formatDate(entry.updated_at)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
