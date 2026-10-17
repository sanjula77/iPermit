'use client';

import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { LicenseCategoriesEditor } from '@/components/license-categories-editor';
import { Alert, Avatar, Button, Card, Dialog, PageHeader, StatusPill, type Tone } from '@/components/ui';
import { extractErrorMessage } from '@/lib/api-client';
import { formatDate, violationTitle } from '@/lib/format';
import * as usersApi from '@/lib/users-api';
import type { ApplicationStatus } from '@/types/application';
import type { FineStatus } from '@/types/fine';
import type { AdminUserDetail } from '@/types/user';

const APPLICATION: Record<ApplicationStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending', tone: 'amber' },
  APPROVED: { label: 'Approved', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'red' },
};
const FINE: Record<FineStatus, { label: string; tone: Tone }> = {
  UNPAID: { label: 'Unpaid', tone: 'amber' },
  PAID: { label: 'Paid', tone: 'green' },
  REVERSED: { label: 'Reversed', tone: 'gray' },
};
const RISK: Record<'LOW' | 'MEDIUM' | 'HIGH', { label: string; tone: Tone }> = {
  LOW: { label: 'Low risk', tone: 'green' },
  MEDIUM: { label: 'Medium risk', tone: 'amber' },
  HIGH: { label: 'High risk', tone: 'red' },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{children}</dd>
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setUser(await usersApi.getUser(id));
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    // Fetch-on-mount, not a state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function closeDialog() {
    setDeleting(false);
    setConfirmText('');
    setDeleteError(null);
  }

  async function handleDelete() {
    if (!user) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await usersApi.deleteUser(user.id);
      router.replace('/users');
    } catch (err) {
      setDeleteError(extractErrorMessage(err));
      setBusy(false);
    }
  }

  const back = (
    <Link href="/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900">
      <ArrowLeft className="h-4 w-4" aria-hidden />
      Back to users
    </Link>
  );

  if (loadError) {
    return (
      <>
        {back}
        <Alert tone="red" testId="load-error">{loadError}</Alert>
      </>
    );
  }
  if (!user) {
    return (
      <>
        {back}
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" data-testid="user-loading" />
      </>
    );
  }

  const isDriver = user.role === 'DRIVER';

  return (
    <>
      {back}
      <PageHeader
        title={user.email}
        description={`${isDriver ? 'Driver' : 'Police officer'} · NIC ${user.nic} · Joined ${formatDate(user.created_at)}`}
        actions={user.behaviour_risk ? <StatusPill label={RISK[user.behaviour_risk].label} tone={RISK[user.behaviour_risk].tone} /> : undefined}
      />

      {isDriver ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="font-semibold text-gray-900">Licence</h2>
            {user.license ? (
              <dl className="mt-3 grid grid-cols-2 gap-4" data-testid="user-licence">
                <Field label="Number">{user.license.license_no}</Field>
                <Field label="Status">
                  <StatusPill label={user.license.status === 'ACTIVE' ? 'Active' : 'Suspended'} tone={user.license.status === 'ACTIVE' ? 'green' : 'red'} />
                </Field>
                <Field label="Points">{user.license.points}</Field>
                <Field label="Standing">{user.badge ? `${user.badge.tier.replace('_', ' ')} · ${user.badge.safety_score}` : '–'}</Field>
                <Field label="Issued">{formatDate(user.license.issued_at)}</Field>
                <Field label="Expires">{formatDate(user.license.expiry_at)}</Field>
                <LicenseCategoriesEditor
                  licenseId={user.license.id}
                  categories={user.license.categories}
                  onSaved={load}
                />
              </dl>
            ) : (
              <p className="mt-3 text-sm text-gray-600">No licence has been issued yet.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-gray-900">Applications</h2>
            {user.applications.length === 0 ? (
              <p className="mt-3 text-sm text-gray-600">No applications.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100" data-testid="user-applications">
                {user.applications.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm text-gray-900">Submitted {formatDate(a.created_at)}</p>
                      <p className="text-xs text-gray-600">{a.document_count} files</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusPill label={APPLICATION[a.status].label} tone={APPLICATION[a.status].tone} />
                      <Link href={`/applications/${a.id}`} className="text-sm font-semibold text-brand hover:underline">Open</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      <Card className="p-5">
        <h2 className="font-semibold text-gray-900">{isDriver ? 'Violations' : 'Recently recorded violations'}</h2>
        {!isDriver ? <p className="text-sm text-gray-600">{user.violation_count} recorded in total.</p> : null}
        {user.violations.length === 0 ? (
          <p className="mt-3 text-sm text-gray-600" data-testid="user-violations-empty">No violations.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="user-violations" aria-label="Violations">
              <thead className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-600">
                <tr>
                  <th scope="col" className="py-2 pr-4">Violation</th>
                  <th scope="col" className="py-2 pr-4">Points</th>
                  <th scope="col" className="py-2 pr-4">Date</th>
                  <th scope="col" className="py-2">{isDriver ? 'Fine' : 'Driver'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {user.violations.map((v, i) => (
                  <tr key={`${v.confirmed_at}-${i}`}>
                    <td className="py-2.5 pr-4 text-gray-900">{violationTitle(v.type, v.description)}</td>
                    <td className="py-2.5 pr-4 tabular-nums text-gray-800">{v.points_deducted}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-gray-700">{formatDate(v.confirmed_at)}</td>
                    <td className="py-2.5">
                      {isDriver && v.fine_status ? (
                        <StatusPill label={FINE[v.fine_status].label} tone={FINE[v.fine_status].tone} />
                      ) : (
                        <span className="text-gray-700">{v.driver_email ?? '–'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="border border-red-100 p-5">
        <h2 className="font-semibold text-red-700">Delete account</h2>
        {user.can_delete ? (
          <p className="mt-1 text-sm text-gray-700">
            Permanently removes this account{isDriver ? ', its licence, uploaded photos and documents, and the stored face template' : ''}. This cannot be undone.
          </p>
        ) : (
          <div className="mt-1 text-sm text-gray-700" data-testid="delete-blockers">
            <p>This account can&apos;t be deleted because:</p>
            <ul className="mt-1 list-disc pl-5">
              {user.delete_blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
        <Button variant="danger" icon={Trash2} className="mt-4" disabled={!user.can_delete} onClick={() => setDeleting(true)} data-testid="delete-account">
          Delete account
        </Button>
      </Card>

      <Dialog open={deleting} title="Delete this account?" onClose={closeDialog}>
        <div className="flex items-center gap-3">
          <Avatar email={user.email} />
          <p className="min-w-0 truncate text-sm font-medium text-gray-900">{user.email}</p>
        </div>
        <p className="mt-3 text-sm text-gray-700">
          This permanently deletes the account{isDriver ? ', licence, photos, documents and face template' : ''}, and any incidents or danger zones they reported. It cannot be undone.
        </p>
        <label className="mt-3 block text-sm text-gray-700">
          Type <strong>{user.email}</strong> to confirm
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoFocus
            data-testid="delete-confirm-input"
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
          />
        </label>
        {deleteError ? <p className="mt-2 text-sm text-red-600" data-testid="delete-error">{deleteError}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={closeDialog}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete} disabled={busy || confirmText !== user.email} data-testid="confirm-delete">
            {busy ? 'Deleting…' : 'Delete permanently'}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
