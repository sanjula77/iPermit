'use client';

import { useCallback, useEffect, useState } from 'react';

import * as applicationsApi from '@/lib/applications-api';
import { extractErrorMessage } from '@/lib/api-client';
import { StatusBadge } from '@/components/status-badge';
import type { Application, ApplicationStatus } from '@/types/application';

const FILTERS: Array<{ label: string; value: ApplicationStatus | 'ALL' }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export default function ApplicationsPage() {
  const [filter, setFilter] = useState<ApplicationStatus | 'ALL'>('ALL');
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setApplications(null);
    setLoadError(null);
    try {
      const data = await applicationsApi.listApplications(filter === 'ALL' ? undefined : filter);
      setApplications(data);
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

  async function handleApprove(id: string) {
    setActionError(null);
    setPendingActionId(id);
    try {
      await applicationsApi.approveApplication(id);
      await load();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) {
      setActionError('A rejection reason is required.');
      return;
    }
    setActionError(null);
    setPendingActionId(id);
    try {
      await applicationsApi.rejectApplication(id, rejectReason.trim());
      setRejectingId(null);
      setRejectReason('');
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
        <h2 className="text-xl font-semibold text-zinc-900">License Applications</h2>
        <p className="text-sm text-zinc-500">Review, approve, or reject driver applications.</p>
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
      ) : applications === null ? (
        <p className="text-sm text-zinc-500" data-testid="applications-loading">
          Loading…
        </p>
      ) : applications.length === 0 ? (
        <p className="text-sm text-zinc-500" data-testid="applications-empty">
          No applications match this filter.
        </p>
      ) : (
        <ul className="space-y-3" data-testid="applications-list">
          {applications.map((application) => (
            <li
              key={application.id}
              className="rounded-lg border border-zinc-200 bg-white p-4"
              data-testid={`application-row-${application.id}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-zinc-900">{application.driver.email}</p>
                  <p className="text-sm text-zinc-500">NIC: {application.driver.nic}</p>
                  <p className="text-xs text-zinc-400">
                    Submitted {new Date(application.created_at).toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {application.documents.length} documents (
                    {application.documents.filter((d) => d.doc_type === 'FACE_PHOTO').length} photos)
                  </p>
                  {application.reason ? (
                    <p className="mt-1 text-sm text-zinc-600">Reason: {application.reason}</p>
                  ) : null}
                </div>
                <StatusBadge status={application.status} />
              </div>

              {application.status === 'PENDING' ? (
                <div className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3">
                  {rejectingId === application.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection"
                        data-testid={`reject-reason-${application.id}`}
                        className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleReject(application.id)}
                          disabled={pendingActionId === application.id}
                          data-testid={`confirm-reject-${application.id}`}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Confirm Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason('');
                          }}
                          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(application.id)}
                        disabled={pendingActionId === application.id}
                        data-testid={`approve-${application.id}`}
                        className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectingId(application.id)}
                        disabled={pendingActionId === application.id}
                        data-testid={`reject-${application.id}`}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
