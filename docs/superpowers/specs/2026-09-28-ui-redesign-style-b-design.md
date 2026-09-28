# Mobile UI Fixes and Style-B Redesign — Design

**Date:** 2026-09-28
**Scope:** mobile app only (`mobile/`). No backend changes.
**Status:** Approved in brainstorming (architectural path, visual companion used).

## Why

On a real Android phone the app looks static and dated, and it has visible layout
bugs. The user's example is the Fines screen. In the History list, "Red light" and
its date wrap into a narrow column, so that row is far taller than the "Speeding"
row, and the last card runs into the tab bar. A full audit of every screen at 360dp
width and at Android font scale 1.3 found that the Fines bug is systemic, and it
found other problems too (below).

The user asked for this order: identify the UI/UX issues, fix them, then improve
the visual design.

## Decisions (agreed in brainstorming)

- **Visual direction: B, "bold brand header".** Summary screens have a deep-blue
  gradient hero holding the key figure. Content sits on a rounded white sheet that
  overlaps the hero, with floating white cards and soft shadows. A and C
  (refined native, soft timeline) were rejected.
- **Hero coverage: option 2.** The full hero goes on the summary tabs (driver Home,
  Fines, police Verify, plus police Home). The list tabs (Alerts, Incidents,
  Profile) and pushed screens get a compact blue app bar over a light canvas.
- **Driver Home layout** as shown in the mockup:
  - greeting and title in the hero
  - a licence card overlapping the hero edge, with the "SRI LANKA · DRIVING
    LICENCE" label, an Active/Suspended chip, the licence number, NIC and expiry,
    a demerit-points meter (n / 10) and a "Show QR to officer" button
  - stat tiles for the safety badge and outstanding fines
  - a "Recent" list of the last three alerts
- **Motion: purposeful.** Press-scale, list entrance, skeleton loaders, a sliding
  segmented control, animated banner and status changes, and light haptics on key
  actions. Everything respects the OS "reduce motion" setting.
- **Sequencing: bugs first, then redesign.** Phase 1 fixes every audit bug in the
  current look, using shared building blocks that Phase 2 reuses. Phase 2 applies
  style B one flow at a time. There is a phone check after Phase 1 and after each
  Phase 2 batch.
- **One implementation plan per step.** Phase 1 gets the first plan. Each Phase 2
  batch gets its own plan when it's picked up, reusing this spec's decisions. This
  matches the 2026-09-26 redesign's batch rhythm.

## Audit findings (the Phase 1 input)

Widths assume a 360dp screen: 360 − 48 screen padding − 32 card padding gives
280dp of card content.

### Systemic

1. **Text in rows has no shrink or truncate rules.** There is no `flexShrink`,
   `minWidth: 0` or `numberOfLines` on the row text columns. `StatusBadge`
   (`components/status-badge.tsx`) always takes its full natural width, so the
   `flex: 1` text column is starved. This causes the Fines bug, the police
   candidate rows and the Report tile overflow.
2. **No space above the tab bar.** `BottomTabInset` (`constants/theme.ts`) is
   exported but never used. Each tab sets its own bottom padding (16–32dp).
3. **Formatting depends on the device locale.** `toLocaleDateString()` appears in
   10 places (fines, fine detail, home, licence card, police driver,
   `lib/relative-time.ts`) and gives US-style "9/26/2026". `formatLkr`
   (`lib/fine-status.ts`) joins "LKR" to the number with a normal space, so the
   two can wrap onto separate lines.
4. **Patterns are copied per screen.**
   - `Banner` exists as three local copies (incidents, police-verify, police-driver)
     plus two inline variants (fine detail, apply).
   - Separator, section label and the list/row/icon-circle styles are repeated in
     7–9 screens.
   - Refresh errors are plain red text on some screens and banners on others.
5. **Hardcoded values bypass the tokens.** Radii are written as `Spacing.*`
   instead of `Radius.*`. Tint alpha suffixes vary (`1F`, `14`, `33`). Icon-circle
   sizes are magic numbers (40/52/64/72). Map pin colours are fixed hex values.
6. **No motion.** Reanimated is installed but unused. Every press only changes
   opacity, and loading is always a spinner.
7. **Flat surfaces and weak hierarchy.** Cards are grey `#F0F0F3` on white, with the
   same grey tab bar. Text uses nearly one weight.
8. **Primary blue fails contrast.** `#208AEF` on white is about 3.5:1, below the
   4.5:1 AA minimum for 14sp text.
9. **Touch targets are under 48dp.** Segmented control about 40dp, password toggle
   about 40dp (it also has no accessibility label), Incidents Confirm/Clear about
   28dp, and some links about 30–38dp.

### Per screen (HIGH = broken at 360dp or font scale 1.3)

- **Fines:**
  - HIGH: rows squeeze. The text column gets about 64dp with "Reversed" and about
    34dp with "Appeal pending".
  - HIGH: the last card sits against the tab bar.
  - HIGH at 1.3: a large balance wraps.
  - MED: the red "Unpaid" badge repeats the section header; there is no Pay action
    on the balance; all icons are neutral; "pts" has no context.
- **Fine detail:** MED: "Points deducted" contradicts "Demerit points n / 10"; the
  appeal box starts one line tall.
- **Driver Home / licence card:**
  - MED: only a grey licence card shows; there is no summary or quick link.
  - MED: police action titles (22sp) wrap onto 2–3 lines at 1.3.
  - LOW: padding differs from other screens.
- **Incidents:**
  - HIGH at 1.3: "Danger zones (12)" loses its count.
  - MED: Confirm/Clear are about 28dp tall; meta lines wrap so rows differ in height.
  - MED: the MEDIUM severity is orange in the list but blue on the map.
  - MED: result banners appear off-screen; the map gestures fight the scroll.
- **Report:** HIGH: type tile labels overflow their 150dp tiles ("Construction"
  even at 1.0).
- **Alerts:**
  - MED: the tab says "Alerts" but the header says "Notifications".
  - MED: messages are cut at 3 lines with no way to read the rest.
  - LOW: no "Mark all read".
- **Police Verify:**
  - HIGH: candidate rows squeeze; the NIC breaks mid-number.
  - MED: "Open Settings" and "Enter code manually" are small targets.
- **Police Driver details:**
  - HIGH: long emails at 22sp break mid-word.
  - HIGH: tile subtitles split "LKR" / "25,000".
  - HIGH (UX): the success banner renders off-screen.
  - MED: "Record a violation" is buried below the history.
- **Apply:** MED: backing out discards added files without asking.
- **Profile, auth screens:** LOW only (no identity header; unlabeled password
  toggle).

## Phase 1: bug-fix pass (current look)

### New shared pieces

- **`components/list-row.tsx` (`ListRow`)**: a two-line row.
  - Leading slot: an icon tile.
  - Line 1: the title (`numberOfLines={1}`, ellipsized) and a trailing value such as
    an amount (`flexShrink: 0`).
  - Line 2: the meta text (`numberOfLines={1}`) and a trailing badge
    (`flexShrink: 0`).
  - Optional chevron.
  - The text column has `flex: 1, minWidth: 0`, so row heights are uniform.
  - Used by Fines, fine detail, Alerts, Incidents (incidents and zones), police
    candidates and police violation history.
- **`lib/format.ts`**:
  - `formatDate(iso)` gives "26 Sep 2026".
  - `formatDateShort(iso)` gives "26 Sep".
  - `formatLkr(n)` gives "LKR 10,000", with a non-breaking space (U+00A0) between
    "LKR" and the number.
  - It uses fixed English month names, not the device locale.
  - All 10 `toLocaleDateString` call sites and the old `formatLkr` move to it.
- **`components/banner.tsx` (`Banner`)**: tone, icon, message and an optional action.
  It replaces the three local copies and two inline variants. Refresh errors on
  every screen use it.
- **`components/screen-scroll.tsx` (`ScreenScroll`)**: the standard tab-screen
  `ScrollView`. It gives consistent horizontal padding, applies `BottomTabInset` plus
  spacing at the bottom, supports `refreshControl`, and exposes a ref so screens can
  scroll to a banner.

### Fixes

- **Large-font safety:** hero and balance numbers use `adjustsFontSizeToFit` with
  `numberOfLines={1}`. Police Home action titles drop to the `default` weight/size.
  Report tiles and police-driver violation tiles get flexible widths
  (`flexBasis` / `minWidth: 0`) with label `numberOfLines`. The Incidents segment
  label shows the count in a way that survives truncation.
- **Off-screen feedback:** police-driver and Incidents scroll to the result banner
  (via `ScreenScroll`'s ref).
- **Touch targets:** 48dp minimum height for Confirm/Clear, segmented control
  segments, text links ("Open Settings", "Enter code manually") and the password
  toggle. The toggle also gets an `accessibilityLabel`.
- **Contrast:** `primary` becomes about `#1565C0` in light mode (≥ 4.5:1 on white)
  and stays readable in dark mode. This is also style B's `brand`.
- **Wording:**
  - The Alerts stack header becomes "Alerts".
  - Fine detail uses "Demerit points" rather than "Points deducted".
  - The redundant "Unpaid" badge inside the Unpaid section is removed.
- **UX:**
  - The appeal reason box gets a `minHeight` of about 3 lines.
  - Apply confirms before leaving with unsaved files (`beforeRemove`).
  - Map pin colours come from the same severity map as the list.
- **Tokens:** replace `Spacing.*` radii with `Radius.*`; name the tint alpha as one
  constant.

Not in Phase 1: new colours (beyond the blue fix), the hero, card restyle, motion.

## Phase 2: style-B design system

### Tokens (`constants/theme.ts`, still the single source of truth)

- **Brand:**
  - `brandDeep #0B3D91`
  - `brand ≈ #1565C0` (the Phase 1 blue)
  - `brandBright #3B8CF0` (gradient end)
  - `onBrand #FFFFFF`
  - Dark mode uses a deeper navy hero.
- **Surfaces:** the page canvas becomes `#F4F6FA` in light mode; cards become
  white `#FFFFFF`; the tab bar is white. Dark mode keeps its current surfaces.
- **Tone pairs:** `{ bg, fg }` for success, warning, danger, info and neutral. These
  replace the ad hoc alpha tints in `StatusBadge`, banners and icon tiles.
- **Shadows:** `card` (soft, blue-tinted) and `raised` (licence card, stat tiles).
- **Radius:** add `large: 22` (sheet corners, licence card).
- **Violation style map:** a colour and icon per violation type, used by icon tiles.
- **Typography:** add `display` (hero figures, auto-shrink). Retune `title` and
  `subtitle` for the new hierarchy.

### Components

- **`HeroHeader`**: a gradient (`expo-linear-gradient`) with a title, a summary line
  and a slot for a large figure or chip. Content overlaps its lower edge on a sheet
  with `Radius.large` top corners. On screens that use it, the native header is
  hidden.
- **Compact blue bar:** not a new component. `TabStack` (and pushed-screen stacks)
  style the native header with a `brand` background and `onBrand` title and tint,
  so native back and title behaviour is kept. Hero screens opt out.
- **`Card`** gets a `raised` variant and a white surface. **`StatTile`** shows a
  label and a figure. **`LicenceCard`** replaces the licence card with the approved
  Home design.
- **`Skeleton`**: shimmer blocks shaped like the content, used instead of
  `ScreenState`'s spinner for first loads.
- **`PressableScale`**: spring scale to about 0.97 on press, plus `android_ripple`,
  plus an optional haptic. Every tappable card and button uses it (`Button` is
  rebuilt on it).
- **`FadeInItem`**: a list entrance (fade and slide up about 8dp), staggered and
  capped at the first 8 items.

### Motion rules

- Reanimated 4 (installed) and `expo-haptics` (new; works in Expo Go).
- Springs for press and layout; durations of 150–300ms.
- The segmented control indicator slides; banners and status badges animate in and
  change.
- Haptics fire on pay, record violation, confirm incident and a successful scan.
- The reduce-motion setting (`useReducedMotion`) makes every animation instant.

### Dark mode

Dark mode must remain legible: a deeper navy hero, dark-grey cards, and tone pairs
defined for both schemes. It isn't polished screen by screen (as agreed in the
2026-09-26 redesign spec).

## Phase 2 batches (phone check after each)

1. **Foundation + Fines/fine detail.**
   - The hero shows the balance with an All clear / N unpaid chip, and a Pay button
     when anything is unpaid. Pay opens the oldest unpaid fine's detail screen, where
     payment already happens (the API pays one fine at a time).
   - Stat tiles show *Paid this year* and *Fines this year*, computed client-side
     from the loaded fines.
   - Rows use colour-coded violation tiles.
2. **Driver Home + Profile.**
   - Home: the approved licence card, badge and fines stat tiles, and Recent (the
     last three notifications through the existing API).
   - Profile: an identity header (initial, email, role) under the compact bar.
3. **Police.**
   - Home: a hero with Face scan as the single primary action, and QR and NIC as
     secondary tiles.
   - Verify: a hero above the camera or search panel.
   - Driver details: a result hero with the licence status as a large badge;
     "Record a violation" moves above the history.
4. **Alerts, Incidents, Report.**
   - Alerts: grouped by day, unread dots, "Mark all read". There is no bulk
     endpoint, so it calls the existing `POST /notifications/{id}/read` for each
     unread item (concurrently) and updates the list and tab badge once all settle.
   - Incidents: the compact bar, the map in a rounded card, and `ListRow` rows.
   - Report: a tile grid with a clear selected state.
5. **Apply, Login, Register.** Gradient auth screens; Apply's progress and photo
   tiles in the new style.

## Verification

- `npx tsc --noEmit` and `npx eslint .` must be clean in `mobile/` after every
  batch.
- The mobile app has no unit-test runner. `lib/format.ts` is checked with a small
  script run in Phase 1 (dates, the NBSP in amounts, and edge values).
- Screenshots come from the web preview where screens render there. The user
  checks on an Android phone after Phase 1 and after each Phase 2 batch, including
  once at a large system font. Maps and native tabs only render on the phone.
- Relevant `expo:*` skills are loaded for every mobile change (project preference).
- Commits are batched per phase or batch on `dev`.

## Out of scope

- Backend changes.
- A holder name or photo on the licence card (not stored by the backend).
- Dark-mode polish.
- Admin web.
- New features beyond the small UX items listed ("Mark all read", Pay shortcut,
  Recent list), which use existing APIs.
