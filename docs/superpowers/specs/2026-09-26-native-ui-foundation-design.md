# Native UI Foundation (Redesign Batch 1) — Design

**Date:** 2026-09-26
**Scope:** mobile app only (`mobile/`). No backend changes.

## Why

The app works but reads as a prototype: in-page titles instead of system headers, a
debug-style email/role card and a red Log out button on Home, and no consistent
screen structure. The redesign must hold up both in the viva demo/thesis screenshots
and in hands-on UAT (task 9.5) — the user weighted these equally.

## Decisions (agreed in brainstorming)

- **Visual direction: native platform look.** Material 3 conventions on Android, HIG on
  iOS. System headers, native grouped rows, system font. The existing
  `Colors`/`Spacing`/`Radius`/`Shadows` tokens in `src/constants/theme.ts` remain the
  source of truth for our own views — no second token system.
- **Approach: foundation first, then one batch per flow.** Each batch gets its own
  spec/plan and a device check before the next starts:
  1. **Batch 1 (this spec):** native headers on every tab + Profile tab.
  2. Driver Home + license card (introduces `StatusBadge`, `EmptyState`, `ScreenState`).
  3. Apply flow.
  4. Fines, payment, appeals.
  5. Incidents.
  6. Notifications.
  7. Police Verify + Driver Details.
  8. Login/Register polish.
- **Dark mode is not a focus** of the redesign (it already works); it is not
  re-verified per batch.

## Changes from the in-chat design

- **Grouped rows use `@expo/ui` (`FieldGroup` + `ListItem`), not custom
  `ListSection`/`ListRow`.** `@expo/ui` is already a dependency (`~57.0.15`), works in
  Expo Go on SDK 57, and renders real Jetpack Compose / SwiftUI grouped rows — the
  literal "native platform look" chosen above. This is its first use in the app.
- **`StatusBadge`, `EmptyState`, `ScreenState` move to Batch 2**, where Home is their
  first consumer. Building them in Batch 1 with no screen using them would be a
  speculative abstraction.
- **No initials avatar on Profile.** Native settings screens identify the account with
  rows; a custom avatar view would be the only non-native element on the screen.

## 1. Native headers on every tab

`NativeTabs` has no header of its own, so each tab gets its own `Stack` (the
`expo-router` "stack inside each tab" pattern). Every tab's route moves into a group
folder with a small layout:

| Before | After |
|---|---|
| `(tabs)/index.tsx` | `(tabs)/(home)/index.tsx` + `(tabs)/(home)/_layout.tsx` |
| `(tabs)/fines.tsx` | `(tabs)/(fines)/fines.tsx` + `_layout.tsx` |
| `(tabs)/police-verify.tsx` | `(tabs)/(police-verify)/police-verify.tsx` + `_layout.tsx` |
| `(tabs)/incidents.tsx` | `(tabs)/(incidents)/incidents.tsx` + `_layout.tsx` |
| `(tabs)/notifications.tsx` | `(tabs)/(notifications)/notifications.tsx` + `_layout.tsx` |
| — | `(tabs)/(profile)/profile.tsx` + `_layout.tsx` (new) |

- Group segments `( … )` don't appear in URLs, so every existing path is unchanged:
  `/(app)/(tabs)` still resolves to Home, and `/(app)/apply` and
  `/(app)/police-driver` (pushed on the outer `(app)` stack, above the tabs) are
  untouched. File names keep their current names so their URLs don't change either.
- `NativeTabs.Trigger name` values change to the group names (`(home)`, `(fines)`, …),
  keeping each trigger's current icon, label, `hidden` rule, and the Notifications
  unread badge.
- Every tab layout renders the same header configuration through one shared component,
  `src/components/tab-stack.tsx`: `<TabStack title="Fines" />`, which renders a `Stack`
  with `title`, `headerLargeTitleEnabled: true` (iOS large title; Android shows its
  standard Material top app bar), and `headerShadowVisible: false` so the header
  blends into the screen background (the navigation theme already sets header/card
  color to `Colors.*.background`).
- Header titles — Driver: Home, Fines, Incidents, Notifications, Profile. Police: Home,
  Verify, Incidents, Notifications, Profile. Five tabs per role (Android's native tab
  bar maximum).
- In-page titles duplicated by the header are removed: "Welcome" (driver Home) and
  "Officer Console" (police Home). Section subtitles inside screens ("Your
  Applications", "Nearby Active Incidents", etc.) stay — they label sections, not
  screens — and are revisited in each screen's own batch.
- Screen contents are otherwise unchanged in this batch. All tab screens already use
  `ScrollView` with `contentInsetAdjustmentBehavior="automatic"`, so they sit correctly
  under the new headers.

## 2. Profile tab (both roles)

`(tabs)/(profile)/profile.tsx`, trigger icon `person.crop.circle` /
`person.crop.circle.fill` (iOS) and `account_circle` (Android), label "Profile".

The whole screen is one `@expo/ui` tree:

```
<Host style={{ flex: 1 }} seedColor={theme.primary}>
  <FieldGroup>
    <FieldGroup.Section title="Account">
      ListItem  Email   → trailing: user.email
      ListItem  NIC     → trailing: user.nic
      ListItem  Role    → trailing: "Driver" | "Police Officer" | "Administrator"
    </FieldGroup.Section>
    <FieldGroup.Section title="App">
      ListItem  Version → trailing: expo-constants expoConfig.version
    </FieldGroup.Section>
    <FieldGroup.Section>
      ListItem  "Log out" (danger color), onPress → confirmation
    </FieldGroup.Section>
  </FieldGroup>
</Host>
```

- `FieldGroup` is itself the scroll container, so there is no outer `ScrollView`.
- `seedColor={theme.primary}` makes Android's Material palette derive from the app's
  primary blue instead of a default purple.
- Role labels are human-readable (`ROLE_LABEL` map), not the raw `DRIVER`/`POLICE`
  enum.
- **Log out** calls React Native `Alert.alert('Log out of iPermit?', …)` with Cancel
  (`style: 'cancel'`) and Log out (`style: 'destructive'`); only the destructive
  action calls `logout()` from `useAuth`. After logout, the existing `(app)` layout
  guard redirects to `/(auth)/login` — no new navigation code.
- `testID="logout-button"` moves from the two Home buttons to the Log out row.
- Home loses its email/role card and Log out button (both roles). Driver Home keeps the
  license card, applications list and Apply button; police Home keeps nothing but a
  short placeholder until Batch 7 gives it real content (the Verify tab is the
  officer's working screen). Unused imports/styles are removed with them.

## Error handling

No new data loading in this batch: Profile reads the already-loaded `user` from
`useAuth`, and the version from `expo-constants`. If `user` is somehow null the `(app)`
layout has already redirected, so Profile doesn't handle that case itself.

## Testing

The mobile app has no automated test suite; verification is static checks plus a
device check.

- `npx tsc --noEmit` and `npx eslint` on changed files pass.
- Device check (Expo Go, Android):
  - Every tab shows a native header with the right title, for a driver and a police
    account; tab icons, labels, role-based hiding and the unread badge still work.
  - Driver Home: "Apply for License" still opens Apply; police can still open Driver
    Details from Verify.
  - Profile shows correct email, NIC, role label, version, for both roles.
  - Log out → confirmation appears; Cancel keeps the session; Log out returns to Login.
  - `@expo/ui` renders in Expo Go (first use in the app) — if it doesn't, stop and
    revisit this decision rather than working around it.
