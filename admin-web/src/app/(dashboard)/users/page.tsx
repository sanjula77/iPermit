'use client';

import { Search, UserX, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Alert, Avatar, Card, EmptyState, FilterTabs, PageHeader, StatusPill, TableSkeleton, type Tone } from '@/components/ui';
import { extractErrorMessage } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import * as usersApi from '@/lib/users-api';
import type { ApplicationStatus } from '@/types/application';
import type { AdminUserListItem, LicenseStatus } from '@/types/user';

type Tab = 'DRIVER' | 'POLICE';

const APPLICATION: Record<ApplicationStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Application pending', tone: 'amber' },
  APPROVED: { label: 'Approved', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'red' },
};
const LICENSE: Record<LicenseStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Licence active', tone: 'green' },
  SUSPENDED: { label: 'Suspended', tone: 'red' },
};

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('DRIVER');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setUsers(await usersApi.listUsers());
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount, not a state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const count = (role: Tab) => (users ?? []).filter((u) => u.role === role).length;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users ?? []).filter(
      (u) => u.role === tab && (!q || u.email.toLowerCase().includes(q) || u.nic.toLowerCase().includes(q)),
    );
  }, [users, tab, query]);

  return (
    <>
      <PageHeader title="Users" description="Drivers and police officers. Open an account to see its details or delete it." />

      {loadError ? (
        <Alert tone="red" testId="load-error">
          {loadError}
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { label: 'Drivers', value: 'DRIVER', count: users ? count('DRIVER') : undefined },
            { label: 'Officers', value: 'POLICE', count: users ? count('POLICE') : undefined },
          ]}
        />
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Search by email or NIC</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search email or NIC"
            data-testid="user-search"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </div>

      <Card className="overflow-hidden">
        {users === null && !loadError ? (
          <TableSkeleton testId="users-loading" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={query ? UserX : Users}
            title={query ? 'No match' : tab === 'DRIVER' ? 'No drivers yet' : 'No officers yet'}
            message={query ? 'No account matches that email or NIC.' : 'Accounts appear here once they exist.'}
            testId="users-empty"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="users-list" aria-label={tab === 'DRIVER' ? 'Drivers' : 'Officers'}>
              <thead className="border-b border-gray-100 bg-gray-50/60 text-xs font-semibold uppercase tracking-wide text-gray-600">
                <tr>
                  <th scope="col" className="px-4 py-3">Account</th>
                  <th scope="col" className="px-4 py-3">{tab === 'DRIVER' ? 'Licence' : 'Activity'}</th>
                  <th scope="col" className="px-4 py-3">Joined</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((u) => (
                  <tr key={u.id} className="align-top hover:bg-gray-50/60" data-testid={`user-row-${u.nic}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar email={u.email} />
                        <div className="min-w-0">
                          <p className="max-w-[14rem] truncate font-medium text-gray-900" title={u.email}>{u.email}</p>
                          <p className="text-xs text-gray-600">NIC {u.nic}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {u.role === 'DRIVER' ? (
                        <div className="flex flex-col items-start gap-1.5">
                          {u.license_status ? (
                            <StatusPill label={LICENSE[u.license_status].label} tone={LICENSE[u.license_status].tone} />
                          ) : u.latest_application_status ? (
                            <StatusPill label={APPLICATION[u.latest_application_status].label} tone={APPLICATION[u.latest_application_status].tone} />
                          ) : (
                            <span className="text-gray-600">No application</span>
                          )}
                          {u.points !== null ? (
                            <span className="text-xs tabular-nums text-gray-600">
                              {u.points} points · {u.violation_count} violation{u.violation_count === 1 ? '' : 's'}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="tabular-nums text-gray-800">
                          {u.violation_count} violation{u.violation_count === 1 ? '' : 's'} recorded
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-gray-700">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/users/${u.id}`}
                        data-testid={`open-${u.nic}`}
                        className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Open
                      </Link>
                    </td>
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
