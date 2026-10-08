'use client';

import { Activity, AlertTriangle, ShieldCheck, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { Alert, Avatar, Card, EmptyState, FilterTabs, PageHeader, StatCard, StatusPill, TableSkeleton, type Tone } from '@/components/ui';
import { extractErrorMessage } from '@/lib/api-client';
import * as behaviourApi from '@/lib/behaviour-api';
import { VIOLATION_LABEL } from '@/lib/format';
import type { BehaviourOverview, RiskLevel, Trend } from '@/types/behaviour';

type Filter = 'ATTENTION' | RiskLevel | 'ALL';

const RISK: Record<RiskLevel, { label: string; tone: Tone }> = {
  HIGH: { label: 'High', tone: 'red' },
  MEDIUM: { label: 'Medium', tone: 'amber' },
  LOW: { label: 'Low', tone: 'green' },
};

const TREND: Record<Trend, { label: string; tone: Tone }> = {
  WORSENING: { label: 'Worsening', tone: 'red' },
  STEADY: { label: 'Steady', tone: 'gray' },
  IMPROVING: { label: 'Improving', tone: 'green' },
  NOT_ENOUGH_DATA: { label: 'Not enough data', tone: 'gray' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1] ?? key;

export default function BehaviourPage() {
  const [data, setData] = useState<BehaviourOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('ATTENTION');

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setData(await behaviourApi.getBehaviourOverview());
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount, not a state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const drivers = data?.drivers ?? [];
  const visible = drivers.filter((d) =>
    filter === 'ALL' ? true : filter === 'ATTENTION' ? d.risk_level !== 'LOW' : d.risk_level === filter,
  );
  const maxMonthly = Math.max(1, ...(data?.monthly.map((m) => m.count) ?? [1]));
  const typeEntries = Object.entries(data?.by_type ?? {}) as [keyof typeof VIOLATION_LABEL, number][];
  const maxType = Math.max(1, ...typeEntries.map(([, n]) => n));

  return (
    <>
      <PageHeader
        title="Behaviour insights"
        description="A rule-based risk outlook from each driver's violation history over the last 24 months. Indicative only, not validated on real drivers."
      />

      {loadError ? (
        <Alert tone="red" testId="load-error">
          {loadError}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="High risk" value={data ? data.summary.high : '–'} icon={AlertTriangle} tone="red" testId="stat-high" />
        <StatCard label="Getting worse" value={data ? data.summary.worsening : '–'} icon={TrendingUp} tone="amber" testId="stat-worsening" />
        <StatCard
          label="Near suspension"
          value={data ? data.summary.near_threshold : '–'}
          icon={Activity}
          tone="orange"
          hint="7+ of 10 points"
          testId="stat-near"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900">Violations per month</h2>
          <p className="text-sm text-gray-600">Last 12 months, all licensed drivers.</p>
          {data === null ? (
            <div className="mt-4 h-40 animate-pulse rounded-xl bg-gray-100" />
          ) : (
            <div className="mt-4 flex h-44 items-end gap-2" data-testid="monthly-chart" role="img" aria-label="Violations per month, last 12 months">
              {data.monthly.map((m) => (
                <div key={m.month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs font-semibold tabular-nums text-gray-700">{m.count > 0 ? m.count : ''}</span>
                  <div
                    className="w-full rounded-t-md bg-brand"
                    style={{ height: `${(m.count / maxMonthly) * 100}%`, minHeight: m.count > 0 ? 4 : 0 }}
                    title={`${m.month}: ${m.count} violations, ${m.points} points`}
                  />
                  <span className="text-xs text-gray-600">{monthLabel(m.month)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-gray-900">By violation type</h2>
          <p className="text-sm text-gray-600">Last 24 months.</p>
          {data === null ? (
            <div className="mt-4 h-40 animate-pulse rounded-xl bg-gray-100" />
          ) : typeEntries.length === 0 ? (
            <p className="mt-6 text-sm text-gray-600">No violations recorded.</p>
          ) : (
            <ul className="mt-4 space-y-3" data-testid="type-breakdown">
              {typeEntries
                .sort((a, b) => b[1] - a[1])
                .map(([type, n]) => (
                  <li key={type}>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-800">{VIOLATION_LABEL[type]}</span>
                      <span className="font-semibold tabular-nums text-gray-900">{n}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100" aria-hidden>
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(n / maxType) * 100}%` }} />
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      <FilterTabs<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { label: 'Needs attention', value: 'ATTENTION', count: data ? data.summary.high + data.summary.medium : undefined },
          { label: 'High', value: 'HIGH', count: data?.summary.high },
          { label: 'Medium', value: 'MEDIUM', count: data?.summary.medium },
          { label: 'Low', value: 'LOW', count: data?.summary.low },
          { label: 'All', value: 'ALL', count: drivers.length },
        ]}
      />

      <Card className="overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">Driver watchlist</h2>
          <p className="text-sm text-gray-600">Highest risk first, then soonest to reach the suspension limit.</p>
        </div>
        {data === null ? (
          <TableSkeleton testId="behaviour-loading" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No drivers here"
            message={filter === 'ATTENTION' ? 'No driver needs attention right now.' : 'No drivers match this filter.'}
            testId="behaviour-empty"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="behaviour-list" aria-label="Driver behaviour watchlist">
              <thead className="border-b border-gray-100 bg-gray-50/60 text-xs font-semibold uppercase tracking-wide text-gray-600">
                <tr>
                  <th scope="col" className="px-4 py-3">Driver</th>
                  <th scope="col" className="px-4 py-3">Risk and trend</th>
                  <th scope="col" className="px-4 py-3">Points</th>
                  <th scope="col" className="px-4 py-3">Why</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((d) => (
                  <tr key={d.driver.nic} className="align-top hover:bg-gray-50/60" data-testid={`behaviour-row-${d.driver.nic}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar email={d.driver.email} />
                        <div className="min-w-0">
                          <p className="max-w-[11rem] truncate font-medium text-gray-900" title={d.driver.email}>{d.driver.email}</p>
                          <p className="text-xs text-gray-600">NIC {d.driver.nic}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-1.5">
                        <StatusPill label={RISK[d.risk_level].label} tone={RISK[d.risk_level].tone} />
                        <StatusPill label={TREND[d.trend].label} tone={TREND[d.trend].tone} />
                      </div>
                    </td>
                    <td className="px-4 py-4 tabular-nums">
                      <p className="font-semibold text-gray-900">
                        {d.current_points} / {d.suspension_threshold}
                      </p>
                      <p className="text-xs text-gray-600">
                        {d.window_violations} violation{d.window_violations === 1 ? '' : 's'} in 24 months
                      </p>
                      {d.projected_days_to_suspension !== null ? (
                        <p className="text-xs font-medium text-gray-800">~{d.projected_days_to_suspension} days to suspension</p>
                      ) : null}
                    </td>
                    <td className="min-w-[9rem] max-w-[16rem] px-4 py-4 text-gray-700">
                      <p className="line-clamp-3" title={d.reasons.join('; ')}>
                        {d.reasons[0]}
                      </p>
                      {d.dominant_type ? <p className="mt-1 text-xs text-gray-600">Mostly {VIOLATION_LABEL[d.dominant_type].toLowerCase()}</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-gray-900">How the outlook is worked out</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
          <li>
            <strong>High:</strong> licence suspended, a drink-driving violation in 24 months, 2 or more violations in the last 90 days,
            or 7 or more of 10 points.
          </li>
          <li>
            <strong>Medium:</strong> 1 violation in the last 90 days, repeat violations in 24 months, a past suspension, rising
            violations, or 4 or more points.
          </li>
          <li>
            <strong>Trend:</strong> points in the last 90 days compared with the 90 days before, shown only with 2 or more violations.
          </li>
          <li>
            <strong>To suspension:</strong> days until the points limit at the pace of the last 90 days. Violations whose fine was
            overturned on appeal are left out. Point values and limits are placeholders until the official scheme is final.
          </li>
        </ul>
      </Card>
    </>
  );
}
