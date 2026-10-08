'use client';

import { ArrowLeft, Check, Clock, CheckCircle2, XCircle, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AuthedImage, AuthedPreview, openAuthedFile } from '@/components/authed-media';
import { Alert, Avatar, Button, Card, Dialog, PageHeader, StatusPill, type Tone } from '@/components/ui';
import { extractErrorMessage } from '@/lib/api-client';
import * as applicationsApi from '@/lib/applications-api';
import { formatDate, formatTime } from '@/lib/format';
import type { Application, ApplicationStatus, DocumentType } from '@/types/application';
import { VEHICLE_CATEGORIES, type VehicleCategory } from '@/types/vehicle-category';

const STATUS: Record<ApplicationStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending', tone: 'amber' },
  APPROVED: { label: 'Approved', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'red' },
};

const DOC_LABEL: Record<Exclude<DocumentType, 'FACE_PHOTO'>, string> = {
  NIC: 'National identity card',
  MEDICAL_CERT: 'Medical certificate',
  BIRTH_CERT: 'Birth certificate',
};
const DOC_ORDER: Exclude<DocumentType, 'FACE_PHOTO'>[] = ['NIC', 'MEDICAL_CERT', 'BIRTH_CERT'];

export default function ApplicationReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ path: string; label: string } | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The categories to grant: starts as what the driver asked for.
  const [granted, setGranted] = useState<VehicleCategory[]>([]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const loaded = await applicationsApi.getApplication(id);
      setApplication(loaded);
      setGranted(loaded.requested_categories);
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    // Fetch-on-mount, not a state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleApprove() {
    if (!application) return;
    if (granted.length === 0) {
      setActionError('Choose at least one vehicle category to grant.');
      return;
    }
    setActionError(null);
    setNotice(null);
    setBusy(true);
    try {
      await applicationsApi.approveApplication(application.id, granted);
      setNotice(`Approved ${application.driver.email}. Their digital licence has been issued.`);
      await load();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!application) return;
    if (!rejectReason.trim()) {
      setActionError('A rejection reason is required.');
      return;
    }
    setActionError(null);
    setNotice(null);
    setBusy(true);
    try {
      await applicationsApi.rejectApplication(application.id, rejectReason.trim());
      setNotice(`Rejected ${application.driver.email}'s application.`);
      setRejecting(false);
      setRejectReason('');
      await load();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function openDocument(path: string) {
    setActionError(null);
    try {
      await openAuthedFile(path);
    } catch (err) {
      setActionError(extractErrorMessage(err));
    }
  }

  const back = (
    <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back to applications
    </Link>
  );

  if (loadError) {
    return (
      <>
        {back}
        <Alert tone="red" testId="load-error">
          {loadError}
        </Alert>
      </>
    );
  }
  if (!application) {
    return (
      <>
        {back}
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" data-testid="review-loading" />
      </>
    );
  }

  const photos = application.documents.filter((d) => d.doc_type === 'FACE_PHOTO');
  const status = STATUS[application.status];
  const StatusIcon = application.status === 'APPROVED' ? CheckCircle2 : application.status === 'REJECTED' ? XCircle : Clock;

  return (
    <>
      {back}
      <PageHeader
        title="Review application"
        description="Check the face photos and every document before you decide."
        actions={<StatusPill label={status.label} tone={status.tone} testId="application-status" />}
      />

      {notice ? <Alert tone="green">{notice}</Alert> : null}
      {actionError && !rejecting ? <Alert tone="red" testId="action-error">{actionError}</Alert> : null}

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Avatar email={application.driver.email} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900" data-testid="review-email">{application.driver.email}</p>
            <p className="text-sm text-gray-600">
              NIC {application.driver.nic} · Submitted {formatDate(application.created_at)}, {formatTime(application.created_at)}
            </p>
          </div>
          <StatusIcon className="ml-auto hidden h-6 w-6 text-gray-400 sm:block" aria-hidden />
        </div>
        {application.reason ? (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Rejection reason: {application.reason}</p>
        ) : null}
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-gray-900">Face photos ({photos.length})</h2>
        <p className="text-sm text-gray-600">These four photos build the driver&apos;s face template. All four should show the same person.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="face-photos">
          {photos.map((photo, i) => {
            const path = applicationsApi.documentPath(application.id, photo.id);
            return (
              <AuthedPreview
                key={photo.id}
                path={path}
                label={`Face photo ${i + 1}`}
                testId={`face-photo-${i + 1}`}
                onOpen={() => setViewing({ path, label: `Face photo ${i + 1}` })}
              />
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-gray-900">Documents</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3" data-testid="documents">
          {DOC_ORDER.map((type) => {
            const doc = application.documents.find((d) => d.doc_type === type);
            if (!doc) {
              return (
                <div key={type}>
                  <p className="text-sm font-medium text-gray-900">{DOC_LABEL[type]}</p>
                  <p className="mt-1 text-sm text-red-700">Missing</p>
                </div>
              );
            }
            const path = applicationsApi.documentPath(application.id, doc.id);
            return (
              <div key={type}>
                <p className="mb-2 text-sm font-medium text-gray-900">{DOC_LABEL[type]}</p>
                <AuthedPreview path={path} label={DOC_LABEL[type]} testId={`document-${type}`} onOpen={() => openDocument(path)} />
                <Button variant="secondary" className="mt-2 w-full" onClick={() => openDocument(path)}>
                  Open in new tab
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-gray-900">
          {application.status === 'PENDING' ? 'Vehicle categories to grant' : 'Vehicle categories requested'}
        </h2>
        <p className="text-sm text-gray-600">
          {application.status === 'PENDING'
            ? 'Pre-selected from the driver’s request. Untick any you do not approve, or add others.'
            : 'What the driver asked for when applying.'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-3" data-testid="categories">
          {VEHICLE_CATEGORIES.map(({ code, label }) => {
            const requested = application.requested_categories.includes(code);
            const pending = application.status === 'PENDING';
            const checked = pending ? granted.includes(code) : requested;
            return (
              <label
                key={code}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                  checked ? 'border-brand bg-blue-50' : 'border-gray-200'
                } ${pending ? 'cursor-pointer' : 'opacity-80'}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!pending || busy}
                  data-testid={`category-${code}`}
                  onChange={() =>
                    setGranted((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
                  }
                />
                <span className="font-semibold text-gray-900">{code}</span>
                <span className="truncate text-gray-600">{label}</span>
                {pending && requested ? <span className="ml-auto text-xs text-blue-700">requested</span> : null}
              </label>
            );
          })}
        </div>
        {application.requested_categories.length === 0 ? (
          <p className="mt-3 text-sm text-amber-700">The driver did not request any category.</p>
        ) : null}
      </Card>

      {application.status === 'PENDING' ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-gray-700">Approving issues the digital licence and enrols the face template.</p>
          <div className="flex gap-2">
            <Button variant="secondary" icon={X} className="text-red-700" onClick={() => { setActionError(null); setRejecting(true); }} disabled={busy} data-testid="reject">
              Reject
            </Button>
            <Button variant="success" icon={Check} onClick={handleApprove} disabled={busy} data-testid="approve">
              {busy ? 'Working…' : 'Approve'}
            </Button>
          </div>
        </Card>
      ) : null}

      <Dialog open={viewing !== null} title={viewing?.label ?? ''} size="xl" onClose={() => setViewing(null)}>
        {viewing ? <AuthedImage path={viewing.path} alt={viewing.label} /> : null}
        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={() => setViewing(null)}>Close</Button>
        </div>
      </Dialog>

      <Dialog
        open={rejecting}
        title="Reject application"
        onClose={() => {
          setRejecting(false);
          setRejectReason('');
          setActionError(null);
        }}
      >
        <p className="text-sm text-gray-600">{application.driver.email} will see this reason and can apply again.</p>
        <textarea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="e.g. Face photos are blurry, please retake them in good light"
          data-testid="reject-reason"
          rows={3}
          autoFocus
          className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        {actionError ? <p className="mt-2 text-sm text-red-600" data-testid="action-error">{actionError}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => { setRejecting(false); setRejectReason(''); setActionError(null); }}>Cancel</Button>
          <Button variant="danger" onClick={handleReject} disabled={busy} data-testid="confirm-reject">
            {busy ? 'Rejecting…' : 'Reject application'}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
