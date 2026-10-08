'use client';

import { CheckCircle2, Clock, Eye, FileText, Images, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  Alert,
  Avatar,
  Card,
  EmptyState,
  FilterTabs,
  PageHeader,
  StatCard,
  StatusPill,
  TableSkeleton,
  type Tone,
} from '@/components/ui';
import * as applicationsApi from '@/lib/applications-api';
import { extractErrorMessage } from '@/lib/api-client';
import { formatDate, formatTime } from '@/lib/format';
import type { Application, ApplicationStatus } from '@/types/application';

type Filter = ApplicationStatus | 'ALL';

const STATUS: Record<ApplicationStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending', tone: 'amber' },
  APPROVED: { label: 'Approved', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'red' },
};

export default function ApplicationsPage() {
  const [filter, setFilter] = useState<Filter>('PENDING');
  // Every application is loaded once and filtered here, so the tiles and tab
  // counts stay right whichever tab is open.
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setApplications(await applicationsApi.listApplications());
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount, not a state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const count = (status: ApplicationStatus) => (applications ?? []).filter((a) => a.status === status).length;
  const visible = (applications ?? []).filter((a) => filter === 'ALL' || a.status === filter);

  return (
    <>
      <PageHeader title="License applications" description="Review driver applications and issue digital licences." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Awaiting review" value={applications ? count('PENDING') : '–'} icon={Clock} tone="amber" testId="stat-pending" />
        <StatCard label="Approved" value={applications ? count('APPROVED') : '–'} icon={CheckCircle2} tone="green" testId="stat-approved" />
        <StatCard label="Rejected" value={applications ? count('REJECTED') : '–'} icon={XCircle} tone="red" testId="stat-rejected" />
      </div>

      <FilterTabs<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { label: 'Pending', value: 'PENDING', count: applications ? count('PENDING') : undefined },
          { label: 'Approved', value: 'APPROVED', count: applications ? count('APPROVED') : undefined },
          { label: 'Rejected', value: 'REJECTED', count: applications ? count('REJECTED') : undefined },
          { label: 'All', value: 'ALL', count: applications?.length },
        ]}
      />

      <Card className="overflow-hidden">
        {loadError ? (
          <div className="p-5">
            <Alert tone="red" testId="load-error">
              {loadError}
            </Alert>
          </div>
        ) : applications === null ? (
          <TableSkeleton testId="applications-loading" />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={filter === 'PENDING' ? 'All caught up' : 'No applications here'}
            message={filter === 'PENDING' ? 'There are no applications waiting for review.' : 'No applications match this filter.'}
            testId="applications-empty"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="applications-list">
              <thead className="border-b border-gray-100 bg-gray-50/60 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Driver</th>
                  <th className="px-5 py-3">Submitted</th>
                  <th className="px-5 py-3">Files</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((application) => {
                  const photos = application.documents.filter((d) => d.doc_type === 'FACE_PHOTO').length;
                  const docs = application.documents.length - photos;
                  return (
                    <tr key={application.id} className="align-top hover:bg-gray-50/60" data-testid={`application-row-${application.id}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar email={application.driver.email} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">{application.driver.email}</p>
                            <p className="text-xs text-gray-500">NIC {application.driver.nic}</p>
                            {application.reason ? (
                              <p className="mt-1 max-w-xs text-xs text-red-600">Reason: {application.reason}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <p className="text-gray-900">{formatDate(application.created_at)}</p>
                        <p className="text-xs text-gray-500">{formatTime(application.created_at)}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Images className="h-4 w-4 text-gray-400" aria-hidden />
                          {photos} photos · {docs} docs
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill label={STATUS[application.status].label} tone={STATUS[application.status].tone} testId="application-status" />
                      </td>
                      <td className="px-5 py-4">
                        {application.status === 'PENDING' ? (
                          <div className="flex justify-end">
                            <Link
                              href={`/applications/${application.id}`}
                              data-testid={`review-${application.id}`}
                              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
                            >
                              <Eye className="h-4 w-4" aria-hidden />
                              Review
                            </Link>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <Link
                              href={`/applications/${application.id}`}
                              data-testid={`view-${application.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                            >
                              View details
                            </Link>
                          </div>
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
