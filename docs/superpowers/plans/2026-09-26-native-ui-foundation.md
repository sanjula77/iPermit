# Native UI Foundation (Redesign Batch 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every tab a native system header and add a native Profile tab that takes over account details and Log out from Home.

**Architecture:** Each `NativeTabs` tab moves into its own route group with a one-line layout rendering a shared `TabStack` (a `Stack` with the app's header options). Profile is a single `@expo/ui` `FieldGroup` tree (Jetpack Compose / SwiftUI grouped rows). Home drops its in-page title, account card, and Log out button.

**Tech Stack:** Expo SDK 57, Expo Router (`NativeTabs`, `Stack`), `@expo/ui` universal components, `expo-constants`, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-26-native-ui-foundation-design.md`

## Global Constraints

- Mobile only (`mobile/`); no backend changes.
- No new dependencies — `@expo/ui` (`~57.0.15`) and `expo-constants` are already installed.
- Existing tokens (`Colors`, `Spacing`, `Radius`, `Shadows` in `src/constants/theme.ts`) stay the source of truth; no second token system.
- Route URLs must not change: group folders only, route files keep their current names.
- Each `NativeTabs.Trigger` keeps its current icon, label, `hidden` rule, and (Notifications) unread badge — only `name` changes to the group name.
- Header titles — Driver: Home, Fines, Incidents, Notifications, Profile. Police: Home, Verify, Incidents, Notifications, Profile.
- Role labels: `DRIVER` → "Driver", `POLICE` → "Police Officer", `ADMIN` → "Administrator".
- `testID="logout-button"` lives only on the Profile Log out row.
- Commands are run by Claude directly (CLAUDE.md "Working style — commands"); device checks go to the user.
- Never add an AI co-author trailer to commit messages (CLAUDE.md).
- The mobile app has no automated test suite: each task's gate is `npx tsc --noEmit` + `npx eslint` on changed files + a device check.

## Review Focus

- **Old route files left behind** — if `(tabs)/fines.tsx` survives next to `(tabs)/(fines)/fines.tsx`, Expo Router sees two routes for `/fines` and errors. Task 1 Step 6 lists the tabs directory to prove only group folders remain.
- **Redirects into the tabs** — `src/app/index.tsx`, `(auth)/_layout.tsx` and `apply.tsx` target `/(app)/(tabs)`; after the move that must still land on Home. Task 1's device check covers login → Home and Apply submit → Home.
- **Police role** — police Home loses all its content; it must still render something sensible, and Profile must show "Police Officer", not a blank or `POLICE`. Task 2's device check logs in as police.
- **Log out cancelled** — Cancel in the confirmation must leave the session intact (no partial logout). Task 2's device check taps Cancel first.
- **`@expo/ui` in Expo Go** — first use of the package in this app; if it fails to render, stop and revisit the spec decision rather than working around it. Task 2's device check.

---

### Task 1: Native headers on every tab

**Files:**
- Create: `mobile/src/components/tab-stack.tsx`
- Create: `mobile/src/app/(app)/(tabs)/(home)/_layout.tsx`, `(fines)/_layout.tsx`, `(police-verify)/_layout.tsx`, `(incidents)/_layout.tsx`, `(notifications)/_layout.tsx`
- Move: `(tabs)/index.tsx` → `(tabs)/(home)/index.tsx`; `(tabs)/fines.tsx` → `(tabs)/(fines)/fines.tsx`; `(tabs)/police-verify.tsx` → `(tabs)/(police-verify)/police-verify.tsx`; `(tabs)/incidents.tsx` → `(tabs)/(incidents)/incidents.tsx`; `(tabs)/notifications.tsx` → `(tabs)/(notifications)/notifications.tsx`
- Modify: `mobile/src/app/(app)/(tabs)/_layout.tsx` (trigger names)
- Modify: `mobile/src/app/(app)/(tabs)/(home)/index.tsx` (remove in-page titles, top padding)

**Interfaces:**
- Produces: `TabStack({ title }: { title: string })` in `@/components/tab-stack` — Task 2 uses it for the Profile tab.

- [ ] **Step 1: Create `mobile/src/components/tab-stack.tsx`**

```tsx
import { Stack } from 'expo-router';

// Header configuration shared by every tab's stack: large title on iOS,
// standard Material top app bar on Android. No shadow line -- the header
// already uses the screen background color (see the root navigation theme).
export function TabStack({ title }: { title: string }) {
  return <Stack screenOptions={{ title, headerLargeTitleEnabled: true, headerShadowVisible: false }} />;
}
```

- [ ] **Step 2: Move the tab screens into group folders**

```bash
cd "mobile/src/app/(app)/(tabs)"
mkdir "(home)" "(fines)" "(police-verify)" "(incidents)" "(notifications)"
git mv index.tsx "(home)/index.tsx"
git mv fines.tsx "(fines)/fines.tsx"
git mv police-verify.tsx "(police-verify)/police-verify.tsx"
git mv incidents.tsx "(incidents)/incidents.tsx"
git mv notifications.tsx "(notifications)/notifications.tsx"
```

- [ ] **Step 3: Create one layout per group**

`(home)/_layout.tsx`:
```tsx
import { TabStack } from '@/components/tab-stack';

export default function HomeLayout() {
  return <TabStack title="Home" />;
}
```

`(fines)/_layout.tsx`:
```tsx
import { TabStack } from '@/components/tab-stack';

export default function FinesLayout() {
  return <TabStack title="Fines" />;
}
```

`(police-verify)/_layout.tsx`:
```tsx
import { TabStack } from '@/components/tab-stack';

export default function PoliceVerifyLayout() {
  return <TabStack title="Verify" />;
}
```

`(incidents)/_layout.tsx`:
```tsx
import { TabStack } from '@/components/tab-stack';

export default function IncidentsLayout() {
  return <TabStack title="Incidents" />;
}
```

`(notifications)/_layout.tsx`:
```tsx
import { TabStack } from '@/components/tab-stack';

export default function NotificationsLayout() {
  return <TabStack title="Notifications" />;
}
```

- [ ] **Step 4: Point the tab triggers at the groups**

In `mobile/src/app/(app)/(tabs)/_layout.tsx` change only the `name` props:
`name="index"` → `name="(home)"`, `name="fines"` → `name="(fines)"`,
`name="police-verify"` → `name="(police-verify)"`, `name="incidents"` → `name="(incidents)"`,
`name="notifications"` → `name="(notifications)"`. Icons, labels, `hidden`, and the badge stay as they are.

- [ ] **Step 5: Remove the in-page titles from Home**

In `(home)/index.tsx`: delete `<ThemedText type="title">Officer Console</ThemedText>` (police) and `<ThemedText type="title">Welcome</ThemedText>` (driver), and change `paddingTop: Spacing.five` to `paddingTop: Spacing.three` in `styles.content` (the header now provides the top spacing).

- [ ] **Step 6: Static checks and route sanity**

```bash
cd mobile && ls "src/app/(app)/(tabs)"
npx tsc --noEmit
npx eslint src/components/tab-stack.tsx "src/app/(app)/(tabs)"
```
Expected: `ls` shows only `(fines) (home) (incidents) (notifications) (police-verify) _layout.tsx` — no loose `.tsx` route files. `tsc` and `eslint` exit clean.

- [ ] **Step 7: Device check (user)**

In Expo Go, as a driver: every tab shows a native header with its title; tab icons/labels and the Notifications badge unchanged; login lands on Home; Home → "Apply for License" opens Apply, and submitting returns to Home. As police: Home and Verify headers show; Verify can still open Driver Details.

(No commit yet — batched with Task 2 per the user's commit-batching preference.)

---

### Task 2: Profile tab; remove account card and Log out from Home

**Files:**
- Create: `mobile/src/app/(app)/(tabs)/(profile)/_layout.tsx`
- Create: `mobile/src/app/(app)/(tabs)/(profile)/profile.tsx`
- Modify: `mobile/src/app/(app)/(tabs)/_layout.tsx` (add Profile trigger)
- Modify: `mobile/src/app/(app)/(tabs)/(home)/index.tsx` (remove account card + Log out)

**Interfaces:**
- Consumes: `TabStack` from Task 1; `useAuth()` → `{ user: { email: string; nic: string; role: 'DRIVER' | 'POLICE' | 'ADMIN' } | null, logout: () => Promise<void> }`; `useTheme()` → current palette (`primary`, `danger` hex strings).

- [ ] **Step 1: Create `(profile)/_layout.tsx`**

```tsx
import { TabStack } from '@/components/tab-stack';

export default function ProfileLayout() {
  return <TabStack title="Profile" />;
}
```

- [ ] **Step 2: Create `(profile)/profile.tsx`**

```tsx
import { FieldGroup, Host, ListItem, Text } from '@expo/ui';
import Constants from 'expo-constants';
import { Alert } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import type { UserRole } from '@/types/auth';

const ROLE_LABEL: Record<UserRole, string> = {
  DRIVER: 'Driver',
  POLICE: 'Police Officer',
  ADMIN: 'Administrator',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const theme = useTheme();

  function confirmLogout() {
    Alert.alert('Log out of iPermit?', 'You will need to log in again to use the app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <Host style={{ flex: 1 }} seedColor={theme.primary}>
      <FieldGroup>
        <FieldGroup.Section title="Account">
          <ListItem trailing={<Text>{user?.email ?? ''}</Text>}>Email</ListItem>
          <ListItem trailing={<Text>{user?.nic ?? ''}</Text>}>NIC</ListItem>
          <ListItem trailing={<Text>{user ? ROLE_LABEL[user.role] : ''}</Text>}>Role</ListItem>
        </FieldGroup.Section>
        <FieldGroup.Section title="App">
          <ListItem trailing={<Text>{Constants.expoConfig?.version ?? ''}</Text>}>Version</ListItem>
        </FieldGroup.Section>
        <FieldGroup.Section>
          <ListItem onPress={confirmLogout} testID="logout-button">
            <Text textStyle={{ color: theme.danger }}>Log out</Text>
          </ListItem>
        </FieldGroup.Section>
      </FieldGroup>
    </Host>
  );
}
```

Check `UserRole` is the exported name in `src/types/auth.ts`; if the file names it differently, import that name instead (don't add a new type).

- [ ] **Step 3: Add the Profile trigger**

In `(tabs)/_layout.tsx`, after the Notifications trigger:

```tsx
      <NativeTabs.Trigger name="(profile)">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="account_circle"
        />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
```

- [ ] **Step 4: Strip account card and Log out from Home**

In `(home)/index.tsx`:
- Police: replace the `PoliceHomeScreen` body's `<Card>…</Card>` and `<Button variant="danger" …>…</Button>` with a single line:
  ```tsx
  <ThemedText themeColor="textSecondary">
    Use the Verify tab to check a driver&apos;s license by face or QR code.
  </ThemedText>
  ```
  and remove its now-unused `useAuth()` / `useTheme()` calls.
- Driver: delete the account `<Card>` (Email/NIC/Role) and the Log out `<Button variant="danger">`; change `const { user, logout } = useAuth();` so it no longer destructures unused values (drop the `useAuth` call if nothing else uses it — `theme` is still used by the Apply button icon).
- Remove imports that become unused (`useAuth` if unused; keep `Card`, `Button`, `Ionicons` — still used by the applications list and Apply button).

- [ ] **Step 5: Static checks**

```bash
cd mobile && npx tsc --noEmit && npx eslint "src/app/(app)/(tabs)"
grep -rn 'logout-button' src
```
Expected: clean `tsc`/`eslint`; `grep` shows exactly one match, in `(profile)/profile.tsx`.

- [ ] **Step 6: Device check (user)**

Driver: Profile tab shows Email, NIC, Role "Driver", Version 1.0.0 in native grouped rows (primary-blue tint, not purple). Tap Log out → dialog → **Cancel** → still logged in on Profile. Tap Log out → **Log out** → Login screen. Home shows license/applications/Apply with no account card or Log out button. Police: Profile shows "Police Officer"; Home shows the Verify hint line.

- [ ] **Step 7: Commit Tasks 1–2**

```bash
cd /data/iPermit
git add mobile/src docs/superpowers/plans/2026-09-26-native-ui-foundation.md
git commit -m "Add native tab headers and Profile tab (redesign batch 1)"
```
