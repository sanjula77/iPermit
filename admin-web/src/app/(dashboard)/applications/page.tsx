'use client';

import { Check, CheckCircle2, Clock, FileText, Images, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  Alert,
  Avatar,
  Button,
  Card,
  Dialog,
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
  const [rejecting, setRejecting] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

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

  async function handleApprove(application: Application) {
    setActionError(null);
    setNotice(null);
    setPendingActionId(application.id);
    try {
      await applicationsApi.approveApplication(application.id);
      setNotice(`Approved ${application.driver.email}. Their digital licence has been issued.`);
      await load();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setPendingActionId(null);
    }
  }

  async function handleReject() {
    if (!rejecting) return;
    if (!rejectReason.trim()) {
      setActionError('A rejection reason is required.');
      return;
    }
    setActionError(null);
    setNotice(null);
    setPendingActionId(rejecting.id);
    try {
      await applicationsApi.rejectApplication(rejecting.id, rejectReason.trim());
      setNotice(`Rejected ${rejecting.driver.email}'s application.`);
      setRejecting(null);
      setRejectReason('');
      await load();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setPendingActionId(null);
    }
  }

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

      {notice ? <Alert tone="green">{notice}</Alert> : null}
      {actionError && !rejecting ? <Alert tone="red" testId="action-error">{actionError}</Alert> : null}

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
                  const busy = pendingActionId === application.id;
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
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="success"
                              icon={Check}
                              onClick={() => handleApprove(application)}
                              disabled={busy}
                              data-testid={`approve-${application.id}`}
                            >
                              {busy ? 'Approving…' : 'Approve'}
                            </Button>
                            <Button
                              variant="secondary"
                              icon={X}
                              onClick={() => {
                                setActionError(null);
                                setRejecting(application);
                              }}
                              disabled={busy}
                              data-testid={`reject-${application.id}`}
                              className="text-red-700"
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <p className="text-right text-xs text-gray-400">No action needed</p>
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

      <Dialog
        open={rejecting !== null}
        title="Reject application"
        onClose={() => {
          setRejecting(null);
          setRejectReason('');
          setActionError(null);
        }}
      >
        <p className="text-sm text-gray-600">
          {rejecting?.driver.email} will see this reason and can apply again.
        </p>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="e.g. Face photos are blurry, please retake them in good light"
          data-testid={rejecting ? `reject-reason-${rejecting.id}` : undefined}
          rows={3}
          autoFocus
          className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        {actionError ? (
          <p className="mt-2 text-sm text-red-600" data-testid="action-error">
            {actionError}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setRejecting(null);
              setRejectReason('');
              setActionError(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleReject}
            disabled={!rejecting || pendingActionId === rejecting.id}
            data-testid={rejecting ? `confirm-reject-${rejecting.id}` : undefined}
          >
            {rejecting && pendingActionId === rejecting.id ? 'Rejecting…' : 'Reject application'}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
