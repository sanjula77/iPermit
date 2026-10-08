'use client';

import { Pencil } from 'lucide-react';
import { useState } from 'react';

import { Button, Dialog } from '@/components/ui';
import { extractErrorMessage } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import * as usersApi from '@/lib/users-api';
import { VEHICLE_CATEGORIES, type VehicleCategory } from '@/types/vehicle-category';

interface HeldCategory {
  category: VehicleCategory;
  expiry_at: string;
}

// The vehicle categories an issued licence holds, with an Edit button that opens
// the full set to tick on and off. Saving replaces the licence's categories.
export function LicenseCategoriesEditor({
  licenseId,
  categories,
  onSaved,
}: {
  licenseId: string;
  categories: HeldCategory[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<VehicleCategory[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openEditor() {
    setSelected(categories.map((c) => c.category));
    setError(null);
    setOpen(true);
  }

  function toggle(code: VehicleCategory) {
    setSelected((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  async function save() {
    if (selected.length === 0) {
      setError('A licence must keep at least one category.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await usersApi.updateLicenseCategories(licenseId, selected);
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="col-span-2" data-testid="licence-categories">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Vehicle categories</p>
        <Button variant="secondary" icon={Pencil} onClick={openEditor} data-testid="edit-categories">
          Edit
        </Button>
      </div>
      {categories.length === 0 ? (
        <p className="mt-2 text-sm text-amber-700">No categories on file. Use Edit to add them.</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {categories.map((c) => {
            const info = VEHICLE_CATEGORIES.find((v) => v.code === c.category);
            return (
              <li
                key={c.category}
                className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-900"
                title={`Valid to ${formatDate(c.expiry_at)}`}
              >
                <span className="font-semibold">{c.category}</span>
                <span className="ml-1.5 text-gray-600">{info?.label}</span>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} title="Edit vehicle categories" size="md" onClose={() => setOpen(false)}>
        <p className="text-sm text-gray-600">
          Tick every category this licence should hold. New ones start today and run to the licence expiry.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2" data-testid="edit-categories-grid">
          {VEHICLE_CATEGORIES.map(({ code, label }) => {
            const checked = selected.includes(code);
            return (
              <label
                key={code}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                  checked ? 'border-brand bg-blue-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={busy}
                  data-testid={`edit-category-${code}`}
                  onChange={() => toggle(code)}
                />
                <span className="font-semibold text-gray-900">{code}</span>
                <span className="truncate text-gray-600">{label}</span>
              </label>
            );
          })}
        </div>
        {error ? (
          <p className="mt-3 text-sm text-red-600" data-testid="edit-categories-error">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} disabled={busy} data-testid="save-categories">
            {busy ? 'Saving…' : 'Save categories'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
