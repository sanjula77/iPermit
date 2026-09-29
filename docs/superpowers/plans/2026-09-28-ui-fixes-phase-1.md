# Mobile UI Fixes (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every layout, formatting, touch-target and consistency bug found in the 2026-09-28 mobile UI audit, keeping the app's current look, using shared building blocks that the Phase 2 style-B redesign will reuse.

**Architecture:**
- New shared pieces:
  - `lib/format.ts`: dates and LKR amounts
  - `components/banner.tsx`
  - `components/screen-scroll.tsx`: the standard screen body
  - `components/icon-tile.tsx`
  - `components/list-row.tsx`: a two-line row whose text truncates instead of wrapping
- Every screen is migrated onto these, and its local copies are deleted.
- Tokens stay in `constants/theme.ts`. Only the light `primary` changes, plus a `tint()` helper.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19, expo-router 57 (NativeTabs + native Stack), TypeScript strict. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-28-ui-redesign-style-b-design.md` (the "Audit findings" and "Phase 1" sections).

## Global Constraints

- Mobile only (`mobile/`). No backend changes, no new npm dependencies.
- **Load the Expo skills before editing mobile code** (project preference):
  `expo:expo-overview`, then `expo:expo-design-system` and `expo:expo-native-ui`.
- **Every task ends with these commands clean**, run from `mobile/`:
  - `npx tsc --noEmit`
  - `npx eslint .`

  The only accepted output is the existing warning in `.expo/types/router.d.ts`.
- **Tokens:**
  - All colours come from `Colors` via `useTheme()`.
  - Radii use `Radius.*`, never `Spacing.*` or literal numbers (circles excepted).
  - Tinted backgrounds use `tint()`, never a hand-appended alpha suffix.
- **Look:** keep the current visual style. No gradients, no new colours except
  `primary`, and no motion; those are Phase 2.
- **UI copy spelling:** keep the app's existing "license" spelling in UI strings. Don't
  change user-facing wording except where a task says so.
- **Dates:** show dates with `formatDate()` ("26 Sep 2026") in the phone's own time
  zone. Never use `toLocaleDateString()`.
- **Amounts:** show amounts with `formatLkr()` ("LKR 10,000", with U+00A0 after "LKR").
- **Touch targets:** at least 48dp, via size or `hitSlop`.
- **Commits:** batch them; the plan says where.
  - Work on `dev`.
  - Never add a `Co-Authored-By` trailer (CLAUDE.md).

## Deviations from the spec (decided while planning; read the code to confirm)

1. **Tab-bar spacing.**
   - On Android, the native bottom navigation doesn't overlay screen content (the
     user's screenshot shows the content area ending above the bar).
   - On iOS, `contentInsetAdjustmentBehavior="automatic"` already insets scroll views
     for the native tab bar.
   - So `ScreenScroll` gives a consistent bottom padding (`Spacing.five`) instead of
     `BottomTabInset`. `BottomTabInset` was a create-expo-app leftover with no users,
     and it's deleted.
   - The user's "no space after history cards" is read as the history rows running
     together in one card with hairline separators. Task 5 renders each Fines row as
     its own card with an 8dp gap (as in the approved mockup).
2. **`ListRow` is used where rows squeeze:** Fines, Incidents, police candidates and
   police violation history.
   - The Alerts row isn't broken (its title is `flex: 1` with one line and the age is
     fixed). Its message needs 3 lines, and it's restyled in Phase 2 anyway.
   - Fine detail's label/value rows aren't broken either.
   - Both get only the shared `IconTile` / `Banner` / `ScreenScroll` changes.
3. **`formatDateShort` is left out** until Phase 2's timeline needs it (YAGNI).
4. **Dark `primary` stays `#4DA3F5`.** Dark mode isn't polished in this redesign (spec).

## Review Focus

1. **Large system font (Android font scale 1.3).** Every `ListRow` keeps one line per
   text line and ellipsizes; amounts and badges never wrap; the balance and police
   email shrink to fit. *Pinned in Task 10's phone checklist.*
2. **Very long free text** (a 60-character email, a long danger-zone reason, a long
   evidence reference) truncates or wraps inside its own column. It must never push
   a badge or amount off-screen. *Tasks 6 and 7 route these through `ListRow`, whose
   text column has `minWidth: 0`.*
3. **Unparseable or missing dates** show "—", not "NaN undefined NaN". *Pinned by
   `scripts/check-format.mjs` in Task 1.*
4. **Leaving Apply**:
   - with no files added: no prompt
   - after a successful submit: no prompt
   - mid-submit: no prompt, because the button is disabled and the submit ends in
     `router.replace`

   *Pinned in Task 9's implementation (`submittedRef`) and the Task 10 checklist.*
5. **Dark mode** stays legible with `tint()`, `Banner` and `IconTile`, which derive from
   the same theme colours as before. *Task 10 checklist.*

## File Map

| File | Status | Responsibility |
|---|---|---|
| `mobile/src/lib/format.ts` | create | `formatDate`, `formatLkr` |
| `mobile/scripts/check-format.mjs` | create | Assertions for `format.ts` (run with Node 24) |
| `mobile/src/constants/theme.ts` | modify | Light `primary`, `TintAlpha`, `tint()`; delete `BottomTabInset` |
| `mobile/src/components/banner.tsx` | create | One tinted message banner (tone, title, text, detail, action) |
| `mobile/src/components/screen-scroll.tsx` | create | Standard screen body (padding, gap, max width, bottom space, ref) |
| `mobile/src/components/icon-tile.tsx` | create | Tinted circle with an icon |
| `mobile/src/components/list-row.tsx` | create | Two-line truncating row, and `ListSeparator` |
| `mobile/src/components/status-badge.tsx` | modify | `tint()`, single-line label |
| `mobile/src/components/segmented-control.tsx` | modify | 48dp segments, optional `count` that survives truncation |
| `mobile/src/components/text-field.tsx` | modify | 48dp labelled password toggle, `Radius.small` |
| `mobile/src/components/license-card.tsx` | modify | `formatDate`, `Radius.medium` |
| `mobile/src/components/incidents-map.tsx` | modify | Pin and zone colours from the shared severity map |
| `mobile/src/constants/incidents.ts` | modify | `SEVERITY_COLOR`, `SEVERITY_TONE` |
| `mobile/src/lib/fine-status.ts` | modify | Remove `formatLkr` (moved) |
| `mobile/src/lib/relative-time.ts` | modify | Fall back to `formatDate` |
| Screens under `mobile/src/app/` | modify | Migrate to the shared pieces (Tasks 4–9) |

---

### Task 1: Date and amount formatting

**Files:**
- Create: `mobile/src/lib/format.ts`
- Create: `mobile/scripts/check-format.mjs`
- Modify: `mobile/src/lib/fine-status.ts:52-54`, `mobile/src/lib/relative-time.ts:9`, `mobile/src/components/license-card.tsx:69`, `mobile/src/app/(app)/(tabs)/(home)/index.tsx:229`, `mobile/src/app/(app)/(tabs)/(fines)/fines.tsx:16,143`, `mobile/src/app/(app)/(tabs)/(fines)/fine/[id].tsx:21-30,147,152,192-193`, `mobile/src/app/(app)/police-driver.tsx:25,214`

**Interfaces:**
- Produces: `formatDate(iso: string): string` and `formatLkr(amount: number): string` from `@/lib/format`.

- [ ] **Step 1: Write the failing check script**

Create `mobile/scripts/check-format.mjs`:

```js
// Assertions for src/lib/format.ts. The mobile app has no test runner; Node 24
// strips the TypeScript types itself. Run from mobile/:
//   TZ=Asia/Colombo node scripts/check-format.mjs
import assert from 'node:assert/strict';

import { formatDate, formatLkr } from '../src/lib/format.ts';

assert.equal(formatDate('2026-09-26T10:30:00+00:00'), '26 Sep 2026');
// 20:00 UTC on 31 Dec is already 1 Jan in Sri Lanka (UTC+5:30).
assert.equal(formatDate('2026-12-31T20:00:00+00:00'), '1 Jan 2027');
assert.equal(formatDate('not a date'), '—');
assert.equal(formatDate(''), '—');

assert.equal(formatLkr(0), 'LKR 0');
assert.equal(formatLkr(999), 'LKR 999');
assert.equal(formatLkr(10000), 'LKR 10,000');
assert.equal(formatLkr(1234567), 'LKR 1,234,567');
assert.ok(!formatLkr(25000).includes(' '), 'no breakable space inside an amount');

console.log('format checks passed');
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd mobile && TZ=Asia/Colombo node scripts/check-format.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/format.ts`.

- [ ] **Step 3: Implement `format.ts`**

Create `mobile/src/lib/format.ts`:

```ts
// Dates and amounts read the same on every phone. toLocaleDateString() follows
// the device locale, and a US-set phone shows "9/26/2026", which is ambiguous
// in Sri Lanka. Dates are shown in the phone's own time zone.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "26 Sep 2026"; "—" for a missing or unparseable timestamp.
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// "LKR 10,000". The no-break space (U+00A0) keeps "LKR" and the number on one
// line, and the grouping is fixed rather than locale-dependent.
export function formatLkr(amount: number): string {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `LKR ${grouped}`;
}
```

- [ ] **Step 4: Run the check and confirm it passes**

Run: `cd mobile && TZ=Asia/Colombo node scripts/check-format.mjs`
Expected: `format checks passed`. Node may also print an `ExperimentalWarning` about type stripping, which is fine. If Node refuses the ESM syntax in the `.ts` file, re-run with `node --experimental-detect-module scripts/check-format.mjs`.

- [ ] **Step 5: Move every call site onto `format.ts`**

In `mobile/src/lib/fine-status.ts`, delete the last function:

```ts
export function formatLkr(amount: number): string {
  return `LKR ${amount.toLocaleString()}`;
}
```

In `mobile/src/lib/relative-time.ts`, add `import { formatDate } from '@/lib/format';` at the top and change the last line of `relativeTime` to:

```ts
  return formatDate(iso);
```

Then replace each date call and fix the imports:

| File | Replace | With |
|---|---|---|
| `components/license-card.tsx:69` | `new Date(license.expiry_at).toLocaleDateString()` | `formatDate(license.expiry_at)` |
| `app/(app)/(tabs)/(home)/index.tsx:229` | `new Date(latest.created_at).toLocaleDateString()` | `formatDate(latest.created_at)` |
| `app/(app)/(tabs)/(fines)/fines.tsx:143` | `new Date(fine.violation.confirmed_at).toLocaleDateString()` | `formatDate(fine.violation.confirmed_at)` |
| `app/(app)/(tabs)/(fines)/fine/[id].tsx:147` | `new Date(fine.violation.confirmed_at).toLocaleDateString()` | `formatDate(fine.violation.confirmed_at)` |
| `…/fine/[id].tsx:152` | `new Date(fine.paid_at).toLocaleDateString()` | `formatDate(fine.paid_at)` |
| `…/fine/[id].tsx:192` | `new Date(appeal.created_at).toLocaleDateString()` | `formatDate(appeal.created_at)` |
| `…/fine/[id].tsx:193` | `new Date(appeal.resolved_at).toLocaleDateString()` | `formatDate(appeal.resolved_at)` |
| `app/(app)/police-driver.tsx:214` | `new Date(violation.confirmed_at).toLocaleDateString()` | `formatDate(violation.confirmed_at)` |

Imports:
- `license-card.tsx` and `home/index.tsx`: add `import { formatDate } from '@/lib/format';`.
- `fines.tsx`: change the import to
  `import { appealForFine, fineBadge } from '@/lib/fine-status';` and add
  `import { formatDate, formatLkr } from '@/lib/format';`.
- `fine/[id].tsx`: remove `formatLkr,` from the `@/lib/fine-status` import list and add
  `import { formatDate, formatLkr } from '@/lib/format';`.
- `police-driver.tsx`: replace `import { formatLkr } from '@/lib/fine-status';` with
  `import { formatDate, formatLkr } from '@/lib/format';`.

- [ ] **Step 6: Verify nothing still uses the device-locale formatting**

Run: `cd mobile && grep -rn "toLocaleDateString\|toLocaleString" src ; npx tsc --noEmit && npx eslint .`
Expected: the grep prints nothing; tsc and eslint are clean.

(No commit yet. Commit after Task 4.)

---

### Task 2: Theme tokens: accessible primary and `tint()`

**Files:**
- Modify: `mobile/src/constants/theme.ts`
- Modify: `mobile/src/components/status-badge.tsx:38-45`
- Modify: `mobile/src/components/text-field.tsx:78` (radius only; the toggle is Task 3)
- Modify: `mobile/src/components/license-card.tsx:140`
- Modify: `mobile/src/app/(app)/(tabs)/(home)/index.tsx:76,313`
- Modify: `mobile/src/app/(app)/(tabs)/(police-verify)/police-verify.tsx:219`
- Modify: `mobile/src/app/(app)/(tabs)/(incidents)/report.tsx:119`
- Modify: `mobile/src/app/(app)/police-driver.tsx:246`

**Interfaces:**
- Produces:
  - `tint(color: string, strength?: 'subtle' | 'soft' | 'strong'): string`, where
    `subtle` is banners, `soft` (the default) is badges and icon tiles, and `strong`
    is map zone fills
  - `TintAlpha`
  - `Colors.light.primary === '#1565C0'`

- [ ] **Step 1: Update `theme.ts`**

In `Colors.light`, change `primary: '#208AEF',` to:

```ts
    // 5.7:1 on white; the old #208AEF was 3.5:1, below AA for 14sp text.
    primary: '#1565C0',
```

Delete the `BottomTabInset` export line entirely (it has no users; see Deviations 1).

Append to the end of the file:

```ts
// Alpha suffixes for soft tinted backgrounds. Theme colours are 6-digit hex, so
// appending an alpha byte gives the tint.
export const TintAlpha = {
  subtle: '14', // banners
  soft: '1F', // badges, icon tiles, selected tiles
  strong: '33', // map zone fills
} as const;

export function tint(color: string, strength: keyof typeof TintAlpha = 'soft'): string {
  return `${color}${TintAlpha[strength]}`;
}
```

- [ ] **Step 2: Replace hand-appended alpha suffixes and literal radii**

| File:line | Replace | With |
|---|---|---|
| `components/status-badge.tsx:40` | `` { backgroundColor: `${color}1F` } `` | `{ backgroundColor: tint(color) }` |
| `app/(app)/(tabs)/(home)/index.tsx:76` | `` { backgroundColor: `${theme.primary}1F` } `` | `{ backgroundColor: tint(theme.primary) }` |
| `app/(app)/(tabs)/(police-verify)/police-verify.tsx:219` | `` { backgroundColor: `${theme.primary}1F` } `` | `{ backgroundColor: tint(theme.primary) }` |
| `app/(app)/(tabs)/(incidents)/report.tsx:119` | `` selected ? `${theme.primary}1F` : theme.backgroundElement `` | `selected ? tint(theme.primary) : theme.backgroundElement` |
| `app/(app)/police-driver.tsx:246` | `` selected ? `${theme.danger}14` : theme.backgroundElement `` | `selected ? tint(theme.danger, 'subtle') : theme.backgroundElement` |
| `components/text-field.tsx:78` | `borderRadius: Spacing.two,` | `borderRadius: Radius.small,` |
| `components/license-card.tsx:140` | `borderRadius: Spacing.three,` | `borderRadius: Radius.medium,` |
| `app/(app)/(tabs)/(home)/index.tsx:313` | `borderRadius: Spacing.two,` | `borderRadius: Radius.small,` |

Add `tint` (and `Radius` where missing) to each file's `@/constants/theme` import. In `status-badge.tsx`, delete the comment line `// Theme colors are 6-digit hex, so appending an alpha byte gives a soft tint.`, because `tint()` now documents that. In `text-field.tsx` the import becomes `import { Radius, Spacing } from '@/constants/theme';`.

The remaining alpha suffixes are removed by the tasks that delete their code: the banners (Task 3), the icon circles (Tasks 5–7) and the map fill (Task 6).

- [ ] **Step 3: Make status badges single-line**

In `components/status-badge.tsx`, change the label element to:

```tsx
      <ThemedText type="smallBold" themeColor={TONE_COLOR[tone]} numberOfLines={1}>
        {label}
      </ThemedText>
```

- [ ] **Step 4: Verify**

Run: `cd mobile && npx tsc --noEmit && npx eslint . && grep -rn "BottomTabInset" src`
Expected: clean; the grep prints nothing.

---

### Task 3: Shared `Banner`, `ScreenScroll` and accessible controls

**Files:**
- Create: `mobile/src/components/banner.tsx`
- Create: `mobile/src/components/screen-scroll.tsx`
- Modify: `mobile/src/components/segmented-control.tsx`
- Modify: `mobile/src/components/text-field.tsx:42-53,87-91`

**Interfaces:**
- Consumes: `tint` from Task 2.
- Produces:
  - `Banner({ tone, text, title?, detail?, icon?, action?, testID? })`, with
    `tone: 'success' | 'danger' | 'warning' | 'info'` and
    `action?: { label: string; onPress: () => void; testID?: string }`
  - `ScreenScroll(props: ScrollViewProps minus style/contentContainerStyle, plus { ref?: Ref<ScrollView>; gap?: number; children })`
  - `SegmentedControl` options gain an optional `count?: number`

- [ ] **Step 1: Create `banner.tsx`**

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, tint, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BannerTone = 'success' | 'danger' | 'warning' | 'info';

const TONE: Record<BannerTone, { color: ThemeColor; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { color: 'success', icon: 'checkmark-circle' },
  danger: { color: 'danger', icon: 'alert-circle' },
  warning: { color: 'warning', icon: 'warning' },
  info: { color: 'textSecondary', icon: 'information-circle' },
};

// The one inline message style: action results, refresh failures and notes.
// Announced to screen readers when it appears.
export function Banner({
  tone,
  text,
  title,
  detail,
  icon,
  action,
  testID,
}: {
  tone: BannerTone;
  text: string;
  title?: string;
  // Secondary guidance under the message (e.g. what to do next).
  detail?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: { label: string; onPress: () => void; testID?: string };
  testID?: string;
}) {
  const theme = useTheme();
  const { color, icon: defaultIcon } = TONE[tone];

  return (
    <View
      style={[styles.banner, { backgroundColor: tint(theme[color], 'subtle') }]}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      <Ionicons name={icon ?? defaultIcon} size={18} color={theme[color]} style={styles.icon} />
      <View style={styles.body}>
        {title ? (
          <ThemedText type="smallBold" themeColor={color}>
            {title}
          </ThemedText>
        ) : null}
        <ThemedText type="small" themeColor={color} selectable>
          {text}
        </ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        ) : null}
        {action ? (
          <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            testID={action.testID}
            style={({ pressed }) => [styles.action, { opacity: pressed ? 0.6 : 1 }]}
          >
            <ThemedText type="linkPrimary">{action.label}</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
  icon: { marginTop: Spacing.half },
  body: { flex: 1, gap: Spacing.one },
  // 48dp touch target for the text link.
  action: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
});
```

- [ ] **Step 2: Create `screen-scroll.tsx`**

```tsx
import type { ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, type ScrollViewProps } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

// The standard screen body: the same side padding, section gap and bottom
// breathing room on every screen, with content capped at MaxContentWidth.
// Pass `ref` to scroll programmatically (e.g. back up to a result banner).
export function ScreenScroll({
  ref,
  gap = Spacing.four,
  children,
  ...rest
}: Omit<ScrollViewProps, 'style' | 'contentContainerStyle' | 'children'> & {
  ref?: Ref<ScrollView>;
  gap?: number;
  children: ReactNode;
}) {
  return (
    <ScrollView
      ref={ref}
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      {...rest}
    >
      <ThemedView style={[styles.body, { gap }]}>{children}</ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  body: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
});
```

- [ ] **Step 3: Make `SegmentedControl` 48dp, with a count that survives truncation**

In `components/segmented-control.tsx`:
- Change the `options` type to `{ label: string; value: T; count?: number }[]`.
- Replace the single `ThemedText` inside each segment with:

```tsx
            <ThemedText
              type="smallBold"
              themeColor={selected ? 'text' : 'textSecondary'}
              numberOfLines={1}
              style={styles.label}
            >
              {option.label}
            </ThemedText>
            {option.count !== undefined ? (
              // Separate from the label so a truncated label ("Danger zo…")
              // still shows its count.
              <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'} style={styles.count}>
                {` (${option.count})`}
              </ThemedText>
            ) : null}
```

- Replace the `segment` style and add two styles:

```ts
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small - Spacing.half,
    borderCurve: 'continuous',
  },
  label: { flexShrink: 1 },
  count: { flexShrink: 0 },
```

- [ ] **Step 4: Make the password toggle 48dp and labelled**

In `components/text-field.tsx`, replace the toggle `Pressable` (lines 42–53) with:

```tsx
          <Pressable
            style={styles.toggleButton}
            onPress={() => setIsRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={isRevealed ? 'Hide password' : 'Show password'}
            testID={rest.testID ? `${rest.testID}-toggle-visibility` : undefined}
          >
```

and replace the `toggleButton` style with:

```ts
  toggleButton: {
    position: 'absolute',
    right: Spacing.one,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
```

- [ ] **Step 5: Verify**

Run: `cd mobile && npx tsc --noEmit && npx eslint .`
Expected: clean.

---

### Task 4: Move every screen onto `ScreenScroll` and `Banner`

**Files (modify):**
- `app/(app)/(tabs)/(fines)/fines.tsx`
- `app/(app)/(tabs)/(fines)/fine/[id].tsx`
- `app/(app)/(tabs)/(home)/index.tsx`
- `app/(app)/(tabs)/(incidents)/incidents.tsx`
- `app/(app)/(tabs)/(incidents)/report.tsx`
- `app/(app)/(tabs)/(notifications)/notifications.tsx`
- `app/(app)/(tabs)/(police-verify)/police-verify.tsx`
- `app/(app)/police-driver.tsx`
- `app/(app)/apply.tsx`

All paths are under `mobile/src/`.

**Interfaces:**
- Consumes: `ScreenScroll`, `Banner` (Task 3).

**The mechanical change, applied to each screen listed above:** replace

```tsx
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      {…other props}
    >
      <ThemedView style={styles.form}>
        …children…
      </ThemedView>
    </ScrollView>
```

with

```tsx
    <ScreenScroll {…other props}>
      …children…
    </ScreenScroll>
```

Then:
- Delete the `container`, `content` and `form` styles.
- Remove the now-unused `ScrollView`, `ThemedView` and `MaxContentWidth` imports; tsc
  and eslint will flag any leftovers.
- Add `import { ScreenScroll } from '@/components/screen-scroll';`.
- Keep other props (`refreshControl`, `keyboardShouldPersistTaps="handled"`, `ref`)
  as they are.
- **Gap:** Incidents used `gap: Spacing.three`, so pass `gap={Spacing.three}` there.
  All other screens used `Spacing.four`, the default.
- **Home** has two scroll views (`PoliceHomeScreen` and `DriverHomeScreen`); migrate
  both.
- **Police driver:** only migrate the `DriverDetails` scroll view. Leave the
  `missing` early return as it is.

- [ ] **Step 1: Fines, fine detail, notifications and Home: migrate, and turn refresh errors into banners**

Apply the mechanical change. Then replace each plain red refresh-error text with a `Banner`:

`fines.tsx`, replace the `fines-refresh-error` `ThemedText` block with:

```tsx
          <Banner tone="danger" text={`Couldn't refresh: ${error}`} testID="fines-refresh-error" />
```

`fine/[id].tsx`, replace the `fine-refresh-error` block with:

```tsx
          <Banner tone="danger" text={`Couldn't refresh: ${error}`} testID="fine-refresh-error" />
```

In the same file:
- Replace the success-notice `View` (lines 168–179) with
  `{notice ? <Banner tone="success" text={notice} testID="fine-notice" /> : null}`.
- Replace the action-error `ThemedText` (lines 199–203) with
  `{error ? <Banner tone="danger" text={error} testID="fine-action-error" /> : null}`.
- Delete the `banner` and `bannerText` styles.

`notifications.tsx`, replace the `notifications-error` block with:

```tsx
          <Banner tone="danger" text={`Couldn't refresh: ${error}`} testID="notifications-error" />
```

Add `import { Banner } from '@/components/banner';` to each of these files.

- [ ] **Step 2: Incidents: migrate, and replace the local `Banner`**

Apply the mechanical change with `gap={Spacing.three}` and keep `ref={scrollRef}`.
- Delete the local `function Banner(…)` (lines 276–292) and the `banner` and
  `bannerText` styles, and import the shared one.
- Change the two usages to
  `<Banner tone="info" text={locationNote} testID="location-note" />` and
  `<Banner tone={notice.kind === 'success' ? 'success' : 'danger'} text={notice.text} testID="incident-action-message" />`.
- Replace the `Couldn't refresh: {listError}` text with
  `<Banner tone="danger" text={`Couldn't refresh: ${listError}`} testID="incidents-refresh-error" />`.

- [ ] **Step 3: Police Verify: migrate, and replace the local `Banner` and the camera banner**

Apply the mechanical change.
- Delete the local `function Banner(…)` (lines 160–185) and the `banner` style, and
  import the shared one.
- The existing usages become:
  - `<Banner tone="danger" text={error} testID="police-verify-error" />`
  - the uncertain-match banner, with its existing conditional text unchanged:

    ```tsx
    <Banner
      tone="warning"
      text={
        uncertainCandidates.length
          ? 'Uncertain match. Confirm the driver’s identity before continuing, or use QR or NIC instead.'
          : 'No enrolled driver resembles this photo closely enough to suggest. Use QR or NIC instead.'
      }
    />
    ```
- Replace the whole `cameraDenied ? (<View style={[styles.banner…]}>…</View>)` block
  with:

```tsx
      {cameraDenied ? (
        <Banner
          tone="warning"
          icon="camera-outline"
          text="Camera access is off. Allow it in Settings, or enter the code manually below."
          action={{ label: 'Open Settings', onPress: () => Linking.openSettings() }}
        />
      ) : null}
```

Delete the `linkButtonStart` style. The Settings link is now the banner's 48dp action.

- [ ] **Step 4: Police driver, Report and Apply**

**`police-driver.tsx`:** apply the mechanical change to `DriverDetails`.
- Delete the local `Banner` and the `banner` style, and import the shared one.
- `<Banner kind="error" text="No license issued…" />` becomes
  `<Banner tone="danger" text="No license issued. A violation cannot be recorded." />`.
- The notice banner becomes
  `<Banner tone={notice.kind === 'success' ? 'success' : 'danger'} text={notice.text} testID={notice.kind === 'success' ? 'record-violation-success' : 'record-violation-error'} />`.

**`report.tsx`:** apply the mechanical change, then replace the error text with
`{error ? <Banner tone="danger" text={error} testID="report-error" /> : null}`.

**`apply.tsx`:** apply the mechanical change, then replace the `errorBanner` `View`
(lines 228–252) with:

```tsx
        {submitError ? (
          <Banner
            tone="danger"
            testID="apply-error"
            title={submitError.kind === 'rejected' ? "We couldn't accept your files" : "Couldn't submit your application"}
            text={submitError.message}
            detail={
              submitError.kind === 'failed'
                ? 'Please try again in a moment. If it keeps failing, check your connection.'
                : submitError.field?.field === 'face_photos'
                  ? 'Retake the highlighted photo using the tips above, then submit again.'
                  : submitError.field
                    ? 'Replace the highlighted file, then submit again.'
                    : 'Check your files and submit again.'
            }
          />
        ) : null}
```

Delete the `errorBanner` style.

- [ ] **Step 5: Verify that nothing still hand-rolls a banner or a tint**

Run: `cd mobile && grep -rn "function Banner\|}14\`\|styles.banner\|contentContainerStyle={styles.content}" src ; npx tsc --noEmit && npx eslint .`
Expected: the grep prints nothing; tsc and eslint are clean.

- [ ] **Step 6: Commit the foundation (Tasks 1–4)**

```bash
cd /data/iPermit && git add mobile && git commit -m "Add shared formatting, banner and screen scaffolding to the mobile app

Dates show as '26 Sep 2026' and amounts as 'LKR 10,000' (no-break space)
regardless of device locale. One Banner replaces five local copies, and
every screen uses ScreenScroll for consistent padding and bottom space.
The light primary blue darkens to #1565C0 for AA contrast; segmented
controls and the password toggle reach 48dp."
```

---

### Task 5: `IconTile`, `ListRow` and the Fines screen

**Files:**
- Create: `mobile/src/components/icon-tile.tsx`
- Create: `mobile/src/components/list-row.tsx`
- Modify: `mobile/src/app/(app)/(tabs)/(fines)/fines.tsx`
- Modify: `mobile/src/app/(app)/(tabs)/(fines)/fine/[id].tsx:157-160` (hero icon)
- Modify: `mobile/src/app/(app)/(tabs)/(notifications)/notifications.tsx:195-197` (icon)

**Interfaces:**
- Consumes: `tint`, `formatDate`, `formatLkr`, `StatusBadge`.
- Produces:
  - `IconTile({ icon, color, size? = 40 })`
  - `ListRow({ leading?, title, value?, meta?, badge?, footer?, chevron?, onPress?, accessibilityLabel?, accessibilityHint?, testID? })`
  - `ListSeparator()`
  - `LIST_ROW_TEXT_INSET` (the number `56`: a 40dp tile plus a 16dp gap)

- [ ] **Step 1: Create `icon-tile.tsx`**

```tsx
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { tint } from '@/constants/theme';

// A tinted circle holding an icon: the leading visual of list rows and heroes.
export function IconTile({
  icon,
  color,
  size = 40,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: tint(color),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={Math.round(size / 2)} color={color} />
    </View>
  );
}
```

- [ ] **Step 2: Create `list-row.tsx`**

```tsx
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Where footer content lines up: past a 40dp IconTile and the row gap.
export const LIST_ROW_TEXT_INSET = 40 + Spacing.three;

// A two-line row: title and value on the first line, meta and badge on the
// second. The value and badge never shrink; the title and meta take what's
// left and truncate with "…" instead of wrapping. So a wide badge can't squeeze
// the text into a narrow column, and every row is the same height.
// `footer` renders below the row, outside its pressable area, for controls
// such as action buttons that need their own touch targets.
export function ListRow({
  leading,
  title,
  value,
  meta,
  badge,
  footer,
  chevron = false,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: {
  leading?: ReactNode;
  title: string;
  value?: string;
  meta?: string;
  badge?: ReactNode;
  footer?: ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}) {
  const theme = useTheme();

  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <View style={styles.line}>
          <ThemedText numberOfLines={1} style={styles.shrink}>
            {title}
          </ThemedText>
          {value ? (
            <ThemedText type="smallBold" style={[styles.fixed, styles.tabular]}>
              {value}
            </ThemedText>
          ) : null}
        </View>
        {meta || badge ? (
          <View style={styles.line}>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.shrink}>
              {meta}
            </ThemedText>
            {badge ? <View style={styles.fixed}>{badge}</View> : null}
          </View>
        ) : null}
      </View>
      {chevron ? <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} /> : null}
    </>
  );

  return (
    <View testID={testID} style={styles.container}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}
        >
          {content}
        </Pressable>
      ) : (
        <View style={styles.main} accessible={!!accessibilityLabel} accessibilityLabel={accessibilityLabel}>
          {content}
        </View>
      )}
      {footer ? <View style={[styles.footer, leading ? styles.footerInset : null]}>{footer}</View> : null}
    </View>
  );
}

// Hairline between rows grouped in one card.
export function ListSeparator() {
  const theme = useTheme();
  return <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} />;
}

const styles = StyleSheet.create({
  container: { paddingVertical: Spacing.three, gap: Spacing.two },
  main: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  text: { flex: 1, minWidth: 0, gap: Spacing.half },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  shrink: { flexShrink: 1, minWidth: 0 },
  fixed: { flexShrink: 0 },
  tabular: { fontVariant: ['tabular-nums'] },
  footer: { gap: Spacing.two },
  footerInset: { paddingLeft: LIST_ROW_TEXT_INSET },
  separator: { height: StyleSheet.hairlineWidth },
});
```

- [ ] **Step 3: Rebuild the Fines rows and sections on `ListRow`**

In `fines.tsx`, replace `FineSection` and `FineRow` with:

```tsx
function FineSection({
  title,
  fines,
  appeals,
}: {
  title: string;
  fines: FineWithViolation[];
  appeals: Appeal[];
}) {
  if (fines.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel} accessibilityRole="header">
        {title}
      </ThemedText>
      {/* One card per fine, with space between them. */}
      {fines.map((fine) => (
        <Card key={fine.id} style={styles.rowCard}>
          <FineRow fine={fine} appeal={appealForFine(appeals, fine.id)} />
        </Card>
      ))}
    </View>
  );
}

function FineRow({ fine, appeal }: { fine: FineWithViolation; appeal: Appeal | null }) {
  const theme = useTheme();
  const badge = fineBadge(fine, appeal);
  const label = VIOLATION_LABEL[fine.violation.type];
  const points = fine.violation.points_deducted;
  // In the Unpaid section a plain "Unpaid" badge only repeats the header;
  // keep the badge when it says something new (e.g. an appeal is pending).
  const showBadge = badge.label !== 'Unpaid';

  return (
    <ListRow
      testID={`fine-${fine.id}`}
      onPress={() => router.push({ pathname: '/(app)/(tabs)/(fines)/fine/[id]', params: { id: fine.id } })}
      accessibilityLabel={`${label}, ${formatLkr(fine.amount)}, ${points} demerit points, ${badge.label}`}
      leading={<IconTile icon={VIOLATION_ICON[fine.violation.type]} color={theme.text} />}
      title={label}
      value={formatLkr(fine.amount)}
      meta={`${formatDate(fine.violation.confirmed_at)} · ${points} pts`}
      badge={
        showBadge ? (
          <StatusBadge testID={`fine-status-${fine.id}`} tone={badge.tone} icon={badge.icon} label={badge.label} />
        ) : null
      }
      chevron
    />
  );
}
```

Change the balance `ThemedText` (`testID="outstanding-total"`) to fit on one line at any font size:

```tsx
        <ThemedText
          type="title"
          themeColor={unpaid.length ? 'danger' : 'text'}
          testID="outstanding-total"
          style={styles.tabular}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
```

Update the imports: remove `Fragment` and `Pressable`, remove the `Ionicons` import if it's unused, and add:

```tsx
import { IconTile } from '@/components/icon-tile';
import { ListRow } from '@/components/list-row';
```

In `styles`, delete `list`, `separator`, `row`, `iconCircle`, `rowText` and `rowEnd`, and add:

```ts
  rowCard: { paddingVertical: 0 },
```

- [ ] **Step 4: Use `IconTile` in fine detail and Alerts**

`fine/[id].tsx`: replace the hero's `iconCircle` `View` (lines 158–160) with
`<IconTile icon={VIOLATION_ICON[fine.violation.type]} color={theme.text} size={64} />`,
delete the `iconCircle` style, and import `IconTile`.

`notifications.tsx`: replace the row's `iconCircle` `View` (lines 195–197) with
`<IconTile icon={info.icon} color={color} />`, delete the `iconCircle` style, and import
`IconTile`.

- [ ] **Step 5: Verify**

Run: `cd mobile && npx tsc --noEmit && npx eslint . && grep -rn "}1F\`" src/app/\(app\)/\(tabs\)/\(fines\) src/app/\(app\)/\(tabs\)/\(notifications\)`
Expected: clean; the grep prints nothing.

---

### Task 6: Incidents on `ListRow`, with 48dp actions and one severity palette

**Files:**
- Modify: `mobile/src/constants/incidents.ts`
- Modify: `mobile/src/components/incidents-map.tsx:1-13,60-70`
- Modify: `mobile/src/app/(app)/(tabs)/(incidents)/incidents.tsx`

**Interfaces:**
- Consumes: `ListRow`, `ListSeparator`, `IconTile`, `StatusBadge`, `Banner`, `tint`,
  `SegmentedControl` `count`.
- Produces:
  - `SEVERITY_COLOR: Record<RoadIncidentSeverity, ThemeColor>`
  - `SEVERITY_TONE: Record<RoadIncidentSeverity, StatusTone>`

- [ ] **Step 1: Add the shared severity palette**

Append to `constants/incidents.ts` (and add the two type imports at the top):

```ts
import type { StatusTone } from '@/components/status-badge';
import type { ThemeColor } from '@/constants/theme';
```

```ts
// One palette for severity in the list, the badges and the map pins.
export const SEVERITY_COLOR: Record<RoadIncidentSeverity, ThemeColor> = {
  LOW: 'textSecondary',
  MEDIUM: 'warning',
  HIGH: 'danger',
};

export const SEVERITY_TONE: Record<RoadIncidentSeverity, StatusTone> = {
  LOW: 'neutral',
  MEDIUM: 'warning',
  HIGH: 'danger',
};
```

- [ ] **Step 2: Colour the map from the palette**

In `components/incidents-map.tsx`:
- Delete `SEVERITY_PIN_COLOR`.
- Import `SEVERITY_COLOR` from `@/constants/incidents`, `tint` and `Radius` from
  `@/constants/theme`, and `useTheme` from `@/hooks/use-theme`.
- Call `const theme = useTheme();` at the top of the component.
- Replace each `SEVERITY_PIN_COLOR[x.severity]` with `theme[SEVERITY_COLOR[x.severity]]`.
- Replace the zone circle's
  `` fillColor={`${SEVERITY_PIN_COLOR[zone.severity]}33`} `` with
  `fillColor={tint(theme[SEVERITY_COLOR[zone.severity]], 'strong')}`.
- In the `container` style, `borderRadius: 16,` becomes `borderRadius: Radius.medium,`.

- [ ] **Step 3: Rebuild the report row on `ListRow`**

In `incidents.tsx`:
- Delete `TONE_COLOR` and the local `Separator`, and use `ListSeparator` in both
  `.map` blocks.
- Pass counts separately to the segmented control:

```tsx
          options={[
            { label: 'Incidents', value: 'incidents', count: incidents?.length },
            { label: 'Danger zones', value: 'zones', count: zones?.length },
          ]}
```

- Change `confirmations()` so the meta line stays short:

```ts
function confirmations(count: number): string {
  return `${count} confirmed`;
}
```

- Change the two `detail` props (severity moves into a badge):
  - Incident: `` detail={`${confirmations(incident.confirmation_count)} · ${relativeTime(incident.created_at)}`} ``
  - Zone: `` detail={`${formatRadius(zone.radius_m)} · ${confirmations(zone.confirmation_count)}`} ``

- Replace `ReportRow`'s body (keep its props type) with:

```tsx
  const theme = useTheme();

  return (
    <ListRow
      testID={testID}
      onPress={onPress}
      accessibilityLabel={`${title}, ${SEVERITY_LABEL[severity]} severity, ${detail}. Show on map`}
      leading={<IconTile icon={icon} color={theme[SEVERITY_COLOR[severity]]} />}
      title={title}
      meta={detail}
      badge={<StatusBadge tone={SEVERITY_TONE[severity]} icon="alert-circle-outline" label={SEVERITY_LABEL[severity]} />}
      footer={
        <View style={styles.rowActions}>
          <Pressable
            onPress={onConfirm}
            testID={confirmTestID}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole="button"
            accessibilityLabel={`Confirm ${title} is still there`}
            style={({ pressed }) => [styles.smallButton, { backgroundColor: theme.background, opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="thumbs-up-outline" size={16} color={theme.primary} />
            <ThemedText type="smallBold" themeColor="primary">
              Confirm
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={onClear}
            testID={clearTestID}
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${title} as cleared`}
            style={({ pressed }) => [styles.smallButton, { backgroundColor: theme.background, opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="checkmark-done-outline" size={16} color={theme.textSecondary} />
            <ThemedText type="smallBold" themeColor="textSecondary">
              Clear
            </ThemedText>
          </Pressable>
        </View>
      }
    />
  );
```

- Replace the `smallButton` style (40dp visible plus 4dp `hitSlop` above and below is
  48dp to touch), and replace `rowActions`:

```ts
  rowActions: { flexDirection: 'row', gap: Spacing.two },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
```

- Delete the `row`, `rowMain`, `iconCircle`, `rowText` and `separator` styles. Keep
  `list`, which styles the grouped card.
- Update the imports: add `IconTile`, `ListRow`, `ListSeparator` and `StatusBadge`,
  plus `SEVERITY_COLOR` and `SEVERITY_TONE` from `@/constants/incidents`, and drop
  `type ThemeColor`. Keep `Fragment`, which the `.map` blocks still use.

- [ ] **Step 4: Scroll up to the result banner**

In `runAction`, after each `setNotice(…)` in the `try` and the `catch`, add:

```ts
      scrollRef.current?.scrollTo({ y: 0, animated: true });
```

The banner renders at the top of the screen, and the Confirm/Clear buttons can be
far down the list.

- [ ] **Step 5: Verify**

Run: `cd mobile && npx tsc --noEmit && npx eslint . && grep -rn "SEVERITY_PIN_COLOR\|#208AEF" src`
Expected: clean; the grep prints nothing.

---

### Task 7: Police screens: candidate rows, driver details and Home titles

**Files (modify):**
- `mobile/src/app/(app)/(tabs)/(police-verify)/police-verify.tsx`
- `mobile/src/app/(app)/police-driver.tsx`
- `mobile/src/app/(app)/(tabs)/(home)/index.tsx:80`

**Interfaces:**
- Consumes: `ListRow`, `ListSeparator`, `IconTile`, `formatDate`, `formatLkr`.

- [ ] **Step 1: Rebuild the candidate row on `ListRow`**

In `police-verify.tsx`, replace `CandidateRow`'s returned JSX with:

```tsx
  const status = driver.license_status
    ? driver.license_status === 'ACTIVE'
      ? 'Active'
      : 'Suspended'
    : 'No license';

  return (
    <ListRow
      testID="police-candidate"
      onPress={onPress}
      accessibilityLabel={`${driver.email}, NIC ${driver.nic}, ${status}, ${match}. Open driver details`}
      leading={<IconTile icon="person" color={theme.textSecondary} />}
      title={driver.email}
      value={match}
      // NIC first: when the line is too long, the status truncates, never the NIC.
      meta={`NIC ${driver.nic} · ${status}`}
      chevron
    />
  );
```

Then:
- Delete the local `Separator` and use `ListSeparator` in the candidates `.map`.
- Delete the `row` and `separator` styles.
- Import `IconTile`, `ListRow` and `ListSeparator`.
- Remove `StatusBadge` if it's now unused.

- [ ] **Step 2: Make "Enter code manually" a 48dp target**

Replace the `linkButton` style with:

```ts
  linkButton: {
    alignSelf: 'center',
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
```

- [ ] **Step 3: Fix driver details: email fit, history rows, violation tiles and banner scroll**

In `police-driver.tsx`, make the email fit on one line:

```tsx
          <ThemedText
            type="subtitle"
            selectable
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={styles.centered}
          >
            {driver.email}
          </ThemedText>
```

Replace the violation-history `Card`'s `.map` body with:

```tsx
              {driver.violations.map((violation, i) => (
                <Fragment key={violation.id}>
                  {i > 0 ? <ListSeparator /> : null}
                  <ListRow
                    leading={<IconTile icon={VIOLATION_ICON[violation.type]} color={theme.text} />}
                    title={VIOLATION_LABEL[violation.type]}
                    meta={`${formatDate(violation.confirmed_at)} · ${violation.points_deducted} pts`}
                    footer={
                      violation.evidence_ref ? (
                        <ThemedText type="small" themeColor="textSecondary" selectable>
                          Evidence: {violation.evidence_ref}
                        </ThemedText>
                      ) : null
                    }
                  />
                </Fragment>
              ))}
```

In each violation-type tile, replace the two text elements with:

```tsx
                    <ThemedText type="smallBold" themeColor={selected ? 'danger' : 'text'} numberOfLines={2}>
                      {VIOLATION_LABEL[type]}
                    </ThemedText>
                    {/* Points and fine on separate lines, so "LKR" never splits from its amount. */}
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {VIOLATION_POINTS[type]} pts
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.tabular}>
                      {formatLkr(VIOLATION_FINE[type])}
                    </ThemedText>
```

and add `minWidth: 0,` to the `typeTile` style.

Scroll to the result banner:
- Add `const scrollRef = useRef<ScrollView>(null);` in `DriverDetails` (import
  `ScrollView` as a type-only use:
  `import { Alert, Platform, Pressable, type ScrollView, StyleSheet, View } from 'react-native';`).
- Pass `ref={scrollRef}` to `ScreenScroll`.
- After both `setNotice(…)` calls in `submitViolation` (success and catch), add
  `scrollRef.current?.scrollTo({ y: 0, animated: true });`.

Delete the `row`, `iconCircle` and `separator` styles. Import `IconTile`, `ListRow` and `ListSeparator`.

- [ ] **Step 4: Stop police Home titles wrapping at large fonts**

In `home/index.tsx`, change `<ThemedText type="subtitle">{action.title}</ThemedText>` to:

```tsx
                <ThemedText style={styles.actionTitle}>{action.title}</ThemedText>
```

and add the style `actionTitle: { fontWeight: 700 },` (16sp default size, bold).

- [ ] **Step 5: Verify, then commit Tasks 5–7**

Run: `cd mobile && npx tsc --noEmit && npx eslint .`
Expected: clean.

```bash
cd /data/iPermit && git add mobile && git commit -m "Stop list rows squeezing their text on narrow screens

A shared two-line ListRow keeps amounts and badges at full width and
truncates the title and details instead of wrapping, so rows stay one
height. Used for fines (now one card per fine), incidents and danger
zones, police face-match candidates and violation history. Incident
actions reach 48dp, severity uses one palette in the list and on the
map, and result banners scroll into view."
```

---

### Task 8: Report type tiles

**Files:**
- Modify: `mobile/src/app/(app)/(tabs)/(incidents)/report.tsx:109-129,231-242`

- [ ] **Step 1: Stack the tile content so labels fit**

Replace the tile's label `ThemedText` with:

```tsx
                    <ThemedText
                      type="smallBold"
                      themeColor={selected ? 'primary' : 'text'}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      style={styles.typeLabel}
                    >
                      {INCIDENT_LABEL[type]}
                    </ThemedText>
```

Replace the `typeTile` style and add `typeLabel`. The icon goes above the label, which
gives the label the tile's full width, and every tile is the same height:

```ts
  typeTile: {
    // Two columns: half the row minus half the gap.
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderWidth: 2,
    borderRadius: Radius.small,
    borderCurve: 'continuous',
  },
  typeLabel: { maxWidth: '100%' },
```

- [ ] **Step 2: Verify**

Run: `cd mobile && npx tsc --noEmit && npx eslint .`
Expected: clean.

---

### Task 9: Small UX fixes: Alerts header, fine wording, appeal box, leaving Apply

**Files:**
- Modify: `mobile/src/app/(app)/(tabs)/(notifications)/_layout.tsx:4`
- Modify: `mobile/src/app/(app)/(tabs)/(fines)/fine/[id].tsx:148,244-252`
- Modify: `mobile/src/app/(app)/apply.tsx`

- [ ] **Step 1: Match the Alerts header to its tab label**

In `(notifications)/_layout.tsx`, change `<TabStack title="Notifications" />` to `<TabStack title="Alerts" />`.

- [ ] **Step 2: Fine detail wording and appeal box**

In `fine/[id].tsx`, change the rows entry to:

```ts
    // Demerit points count up towards suspension (the license card shows n / 10).
    ['Demerit points', `+${fine.violation.points_deducted}`],
```

Give the appeal `TextField` a starting height of about three lines:

```tsx
            <TextField
              label="Why are you appealing this fine?"
              value={appealReason}
              onChangeText={setAppealReason}
              multiline
              autoCapitalize="sentences"
              autoCorrect
              style={styles.appealInput}
              testID="appeal-reason-input"
            />
```

and add the style `appealInput: { minHeight: 96, textAlignVertical: 'top' },`.

- [ ] **Step 3: Ask before discarding a half-finished application**

In `apply.tsx`, add the imports:

```tsx
import { router, useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { Alert, Platform, StyleSheet, View } from 'react-native';
```

`ScrollView` is already gone after Task 4. Keep `Fragment` and `useRef` from `react`.

Inside `ApplyScreen`, after `submittingRef`, add:

```tsx
  const navigation = useNavigation();
  // Set just before router.replace on success, so leaving then isn't blocked.
  const submittedRef = useRef(false);
```

After the `allFilesSelected` line, add:

```tsx
  // Backing out would silently drop the photos and documents already added.
  usePreventRemove(filesReadyCount > 0, ({ data }) => {
    if (submittedRef.current) {
      navigation.dispatch(data.action);
      return;
    }
    const title = 'Discard your application?';
    const message = 'The photos and documents you added will be lost.';
    if (Platform.OS === 'web') {
      // react-native-web's Alert.alert is a no-op.
      if (window.confirm(`${title}\n${message}`)) navigation.dispatch(data.action);
      return;
    }
    Alert.alert(title, message, [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
```

In `handleSubmit`, set the ref just before the redirect:

```tsx
      submittedRef.current = true;
      router.replace('/(app)/(tabs)/(home)');
```

- [ ] **Step 4: Verify**

Run: `cd mobile && npx tsc --noEmit && npx eslint .`
Expected: clean. If eslint's `react-hooks` rules object to reading `submittedRef.current` in the callback, keep the ref: it's read in an event callback, not during render. Otherwise fix what it reports.

---

### Task 10: Final verification, spec note and commit

**Files:**
- Modify: `docs/superpowers/specs/2026-09-28-ui-redesign-style-b-design.md` (Phase 1
  "Fixes" section)

- [ ] **Step 1: Run every automated check**

Run from `mobile/`:

```bash
TZ=Asia/Colombo node scripts/check-format.mjs && npx tsc --noEmit && npx eslint . && \
grep -rn "toLocaleDateString\|toLocaleString\|BottomTabInset\|function Banner\|function Separator\|#208AEF" src
```

Expected: `format checks passed`, tsc and eslint clean, and a grep that prints nothing.

- [ ] **Step 2: Record the spec deviations**

In the spec's Phase 1 section:
- Replace the `ScreenScroll` bullet's "applies `BottomTabInset` plus spacing at the
  bottom" with "applies consistent bottom padding (`Spacing.five`); native tab bars
  don't overlay content on Android, and iOS insets scroll views automatically".
- Change the `ListRow` "Used by" list to: Fines, Incidents (incidents and zones),
  police candidates and police violation history. Alerts and fine detail rows weren't
  squeezing, and they're restyled in Phase 2.

- [ ] **Step 3: Commit Tasks 8–10**

```bash
cd /data/iPermit && git add mobile docs/superpowers/specs/2026-09-28-ui-redesign-style-b-design.md && \
git commit -m "Fix report tiles, wording and unsaved-application loss

Report type tiles stack icon over label so every label fits. The Alerts
header matches its tab, fine details say 'Demerit points +n', the appeal
box starts three lines tall, and leaving Apply with files added asks
before discarding them. Records the Phase 1 deviations in the spec."
```

- [ ] **Step 4: Hand over for the phone check (user)**

Ask the user to reload the app in Expo Go on the Android phone and check each item
at normal font size, then again at the largest system font (Settings → Display →
Font size):

1. **Fines:**
   - Every history row is one card of the same height.
   - "Red light" and its date sit on one line each.
   - Amounts read "LKR 10,000", dates "26 Sep 2026", and there are gaps between
     cards.
2. **A fine's details:** "Demerit points +6"; the appeal box is three lines tall.
3. **Incidents:**
   - Segments show "(n)" even when the label truncates.
   - Rows have a severity badge.
   - Confirm and Clear are easy to tap, and the result banner scrolls into view.
   - Map pin colours match the list.
4. **Report:** all eight type labels fit inside their tiles.
5. **Police** (police account):
   - Candidate rows keep the whole NIC.
   - Driver details: a long email fits on one line.
   - Tiles show points and "LKR 25,000" on separate lines.
   - Recording a violation scrolls to the banner.
6. **Apply:** add one photo, then press back. You're asked before it's discarded.
   Press back with no files added: no prompt.
7. **Alerts:** the header says "Alerts".
8. **Dark mode:** a quick look at Fines and Incidents; everything is readable.

Phase 2 Batch 1 is planned only after the user signs this off.
