'use client';

import { AlertTriangle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert, Button, Card, PageHeader } from '@/components/ui';
import { extractErrorMessage } from '@/lib/api-client';
import * as resetApi from '@/lib/reset-api';

const CONFIRM_WORD = 'CLEAR';

const REMOVED = [
  'All driver accounts and their applications',
  'Uploaded photos and documents, and the stored face templates',
  'Licences, vehicle categories and safety badges',
  'Violations, fines and appeals',
  'Notifications, road incidents and danger zones',
];

const LABEL: Record<string, string> = {
  drivers: 'Drivers',
  applications: 'Applications',
  application_documents: 'Documents',
  licenses: 'Licences',
  license_categories: 'Licence categories',
  badges: 'Badges',
  violations: 'Violations',
  fines: 'Fines',
  appeals: 'Appeals',
  notifications: 'Notifications',
  road_incidents: 'Road incidents',
  danger_zones: 'Danger zones',
  face_templates: 'Face templates',
};

// A deliberately unlinked page (open /clear by its address): wipes the database
// back to just the administrator and police accounts, for a clean demonstration.
export default function ClearPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<resetApi.DemoResetResult | null>(null);

  useEffect(() => {
    resetApi
      .getDemoResetStatus()
      .then((s) => setEnabled(s.enabled))
      .catch((err) => setStatusError(extractErrorMessage(err)));
  }, []);

  async function handleClear() {
    setBusy(true);
    setError(null);
    try {
      setResult(await resetApi.clearDemoData(text));
      setText('');
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const ready = enabled === true && text === CONFIRM_WORD && !busy;

  return (
    <>
      <PageHeader title="Clear demo data" description="Reset the system to a clean state for a demonstration." />

      {statusError ? <Alert tone="red" testId="status-error">{statusError}</Alert> : null}
      {enabled === false ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" data-testid="reset-disabled">
          Clearing data is switched off on this server. To allow it, set <code>ALLOW_DEMO_RESET=true</code> in the
          backend settings and restart the backend.
        </div>
      ) : null}

      {result ? (
        <Card className="p-5" data-testid="reset-result">
          <h2 className="font-semibold text-emerald-700">Data cleared</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            {Object.entries(result.removed).map(([key, count]) => (
              <div key={key} className="flex justify-between gap-3">
                <dt className="text-gray-600">{LABEL[key] ?? key}</dt>
                <dd className="font-semibold text-gray-900">{count}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-gray-600">
            Kept: {result.kept.ADMIN} administrator and {result.kept.POLICE} police account
            {result.kept.POLICE === 1 ? '' : 's'}.
          </p>
        </Card>
      ) : null}

      <Card className="border border-red-200 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-red-600" aria-hidden />
          <div>
            <h2 className="font-semibold text-gray-900">This permanently deletes data</h2>
            <p className="text-sm text-gray-600">It cannot be undone. Make a backup first if you might need anything.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Will be deleted</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-800" data-testid="will-delete">
              {REMOVED.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Will be kept</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-800" data-testid="will-keep">
              <li>Administrator accounts (you stay signed in)</li>
              <li>Police accounts</li>
            </ul>
          </div>
        </div>

        <label className="mt-5 block text-sm font-medium text-gray-900" htmlFor="confirm">
          Type <span className="font-mono font-bold">{CONFIRM_WORD}</span> to confirm
        </label>
        <input
          id="confirm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          disabled={enabled !== true}
          data-testid="confirm-input"
          className="mt-1.5 w-full max-w-xs rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 disabled:bg-gray-50"
        />

        {error ? <p className="mt-3 text-sm text-red-600" data-testid="clear-error">{error}</p> : null}

        <div className="mt-5">
          <Button variant="danger" icon={Trash2} onClick={handleClear} disabled={!ready} data-testid="clear-all">
            {busy ? 'Clearing…' : 'Clear all data'}
          </Button>
        </div>
      </Card>
    </>
  );
}
