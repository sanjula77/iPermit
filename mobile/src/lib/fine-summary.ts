// The Fines hero figures, computed from the list the screen already loaded.
// Pure (no React, no I/O) and checked by scripts/check-fine-summary.mjs.
// ".ts" specifier: Node runs this file directly in that check.
import { appealForFine, canPayFine } from './fine-status.ts';
import type { Appeal, FineWithViolation } from '@/types/fine';

export type FineSummary = {
  outstanding: number;
  unpaidCount: number;
  paidThisYear: number;
  finesThisYear: number;
  // Fines the driver can pay right now (unpaid and not under a pending appeal).
  payableCount: number;
  // Where the hero's Pay button goes: the oldest payable fine.
  oldestPayableId: string | null;
};

function inYear(iso: string | null, year: number): boolean {
  if (!iso) return false;
  const time = new Date(iso);
  return !Number.isNaN(time.getTime()) && time.getFullYear() === year;
}

export function summarizeFines(fines: FineWithViolation[], appeals: Appeal[], now: Date = new Date()): FineSummary {
  const year = now.getFullYear();
  const unpaid = fines.filter((f) => f.status === 'UNPAID');
  const payable = fines
    .filter((f) => canPayFine(f, appealForFine(appeals, f.id)))
    .sort((a, b) => Date.parse(a.violation.confirmed_at) - Date.parse(b.violation.confirmed_at));

  return {
    outstanding: unpaid.reduce((sum, f) => sum + f.amount, 0),
    unpaidCount: unpaid.length,
    paidThisYear: fines
      .filter((f) => f.status === 'PAID' && inYear(f.paid_at, year))
      .reduce((sum, f) => sum + f.amount, 0),
    finesThisYear: fines.filter((f) => inYear(f.violation.confirmed_at, year)).length,
    payableCount: payable.length,
    oldestPayableId: payable[0]?.id ?? null,
  };
}
