# Design System Fundamentals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the four concrete causes of the mobile app's "not production ready" look (systemic background seam, oversized type, zero depth, zero button press-feedback) using the existing palette, then apply the fix to Login/Register as the flagship screens.

**Architecture:** Token-level changes to the existing `theme.ts`/`ThemedText` system (no new token system), a one-file fix to the root navigation theme, two new shared components (`Button`, `Card`), and a migration of Login/Register to use them. Remaining screens are out of scope for this plan — follow-up batches reuse these same primitives.

**Tech Stack:** Expo, React Native, TypeScript (mobile only — no backend changes in this plan).

**Spec:** `docs/superpowers/specs/2026-09-25-design-system-fundamentals-design.md`

## Global Constraints

- No new dependencies. Shadows use React Native's `boxShadow` style string (not the deprecated `shadowColor`/`shadowOffset`/`elevation` props).
- `ThemedText`'s `type` union member names (`title`, `subtitle`, `default`, `small`, `smallBold`, `link`, `linkPrimary`, `code`) do not change — only `title`/`subtitle` *values* change, so no call site elsewhere in the app needs editing.
- No palette/color changes — `Colors.light`/`Colors.dark` values are untouched; this plan is depth/hierarchy/feedback, not rebranding.
- `Card` is built in this plan but not applied to any screen (Login/Register don't use it, per the spec's decision) — it's available for follow-up batches.
- No `size` prop on `Button` — every button in this app is one size today; add only if a real screen needs a second size later.
- No new Ionicons names are introduced anywhere in this plan.
- Per this project's CLAUDE.md "Working style — commands": every shell command (tsc, eslint, git) is given to the user to run themselves, with output reviewed before a step is checked off — never executed directly via a Bash tool in this repo.
- Never add an AI co-author trailer to any commit message in this repo (CLAUDE.md).

## Review Focus

- **The navigation-theme fix must not visually break any screen beyond Login/Register** — it changes a value consumed app-wide. Task 7's device check covers Home, a list screen (Incidents or Fines), and both light/dark mode, not just the two flagship screens.
- **`Button`'s `disabled` and `pressed` styles must not double up** — a disabled button must never also show transient press-darkening. The component guards this with `pressed && !disabled`; Task 3's device check confirms by tapping a disabled button.
- **Removing the `Pressable` import after migrating to `Button`** in Login/Register must not leave a stale unused import — would fail `eslint`. Covered by Tasks 5/6's eslint step.
- **Login and Register have different disabled conditions today** (`!canSubmit` vs `isSubmitting`) — migrating both to `<Button disabled={...}>` must preserve each screen's own original condition exactly, not swap them between screens. Covered by Tasks 5/6's own device-check steps (submit button stays disabled/enabled at the same moments as before).
- **Dark mode** — the screenshot that started this work was light mode only. The navigation-theme fix and the new shadow token both need checking in dark mode too. Covered by Task 7's device check.

---

## Task 1: Token changes — Radius, Shadows, and type-scale recalibration

**Files:**
- Modify: `mobile/src/constants/theme.ts`
- Modify: `mobile/src/components/themed-text.tsx`

**Interfaces:**
- Produces: `Radius.small` (8), `Radius.medium` (16) and `Shadows.card` (a `boxShadow` string) exported from `@/constants/theme` — consumed by Task 3 (`Button`) and Task 4 (`Card`).
- `ThemedText`'s `title`/`subtitle` styles get new pixel values — no signature change, consumed automatically by every existing `type="title"`/`type="subtitle"` call site app-wide.

- [ ] **Step 1: Add `Radius` and `Shadows` to `mobile/src/constants/theme.ts`**

Insert immediately after the `Spacing` export (before `BottomTabInset`):

```ts
export const Radius = {
  small: Spacing.two, // 8 -- chips, inputs, small controls
  medium: Spacing.three, // 16 -- cards, buttons
} as const;

export const Shadows = {
  card: '0 1px 3px rgba(0, 0, 0, 0.08)',
} as const;
```

- [ ] **Step 2: Recalibrate `title`/`subtitle` in `mobile/src/components/themed-text.tsx`**

Replace:

```ts
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
```

with:

```ts
  title: {
    fontSize: 34,
    fontWeight: 700,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 600,
  },
```

- [ ] **Step 3: Give the user the verification commands**

```bash
cd /data/iPermit/mobile
npx tsc --noEmit
npx eslint .
```

Expected: no errors from either command. Wait for pasted output before continuing.

- [ ] **Step 4: Commit**

```bash
cd /data/iPermit
git add mobile/src/constants/theme.ts mobile/src/components/themed-text.tsx
git commit -m "Add Radius/Shadows tokens and recalibrate title/subtitle type scale"
git push
```

---

## Task 2: Fix the root navigation theme background seam

**Files:**
- Modify: `mobile/src/app/_layout.tsx`

**Interfaces:**
- Consumes: `Colors` from `@/constants/theme` (Task 1, unchanged export).
- No new interface produced — this is a values-only fix to an existing `ThemeProvider` call.

- [ ] **Step 1: Replace the stock navigation themes with app-derived ones**

Replace the full content of `mobile/src/app/_layout.tsx`:

```tsx
import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/context/auth-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </ThemeProvider>
  );
}
```

with:

```tsx
import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/context/auth-context';

const LightNavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.text,
    border: Colors.light.backgroundSelected,
    primary: Colors.light.primary,
  },
};

const DarkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.backgroundSelected,
    primary: Colors.dark.primary,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkNavTheme : LightNavTheme}>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Give the user the verification commands**

```bash
cd /data/iPermit/mobile
npx tsc --noEmit
npx eslint .
```

Expected: no errors. Wait for pasted output before continuing.

- [ ] **Step 3: Device check**

Ask the user to open the app on-device (any screen) and confirm there is no visible seam/color mismatch between the screen background and the content background — this is an app-wide change, so a quick check on whatever screen loads first (likely Login, since not logged in) is enough for this task; the full multi-screen sweep happens in Task 7 once Login/Register are also migrated.

- [ ] **Step 4: Commit**

```bash
cd /data/iPermit
git add "mobile/src/app/_layout.tsx"
git commit -m "Derive navigation theme colors from app's own token palette"
git push
```

---

## Task 3: Shared `Button` component

**Files:**
- Create: `mobile/src/components/button.tsx`

**Interfaces:**
- Consumes: `Radius`, `Spacing` from `@/constants/theme` (Task 1); `useTheme` from `@/hooks/use-theme` (existing).
- Produces: `Button({ variant?: 'primary' | 'secondary' | 'danger', disabled?, onPress?, style?, testID?, children })` — used by Task 5 (Login) and Task 6 (Register).

- [ ] **Step 1: Create `mobile/src/components/button.tsx`**

```tsx
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function Button({
  variant = 'primary',
  disabled,
  onPress,
  style,
  testID,
  children,
}: {
  variant?: ButtonVariant;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const backgroundColor =
    variant === 'primary' ? theme.primary : variant === 'danger' ? theme.danger : theme.backgroundSelected;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.three,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
});
```

- [ ] **Step 2: Give the user the verification commands**

```bash
cd /data/iPermit/mobile
npx tsc --noEmit
npx eslint .
```

Expected: no errors (the component isn't used anywhere yet, so this only checks it compiles cleanly in isolation). Wait for pasted output before continuing.

- [ ] **Step 3: Commit**

```bash
cd /data/iPermit
git add mobile/src/components/button.tsx
git commit -m "Add shared Button component with press feedback"
git push
```

---

## Task 4: Shared `Card` component

**Files:**
- Create: `mobile/src/components/card.tsx`

**Interfaces:**
- Consumes: `Radius`, `Shadows`, `Spacing` from `@/constants/theme` (Task 1); `useTheme` from `@/hooks/use-theme` (existing).
- Produces: `Card({ style?, testID?, children })` — not consumed by any task in this plan; available for follow-up batches per the spec's Out of Scope section.

- [ ] **Step 1: Create `mobile/src/components/card.tsx`**

```tsx
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Card({
  style,
  testID,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, boxShadow: Shadows.card },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.one,
  },
});
```

- [ ] **Step 2: Give the user the verification commands**

```bash
cd /data/iPermit/mobile
npx tsc --noEmit
npx eslint .
```

Expected: no errors. Wait for pasted output before continuing.

- [ ] **Step 3: Commit**

```bash
cd /data/iPermit
git add mobile/src/components/card.tsx
git commit -m "Add shared Card component for future list-item screens"
git push
```

---

## Task 5: Migrate Login screen to `Button`

**Files:**
- Modify: `mobile/src/app/(auth)/login.tsx`

**Interfaces:**
- Consumes: `Button` from `@/components/button` (Task 3).

- [ ] **Step 1: Replace the full content of `mobile/src/app/(auth)/login.tsx`**

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TextField } from '@/components/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const theme = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !isSubmitting;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <ThemedView style={styles.form}>
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <Ionicons name="shield-checkmark" size={36} color={theme.onPrimary} />
        </View>
        <ThemedText type="title" style={styles.title}>
          iPermit
        </ThemedText>
        <ThemedText type="subtitle">Log in</ThemedText>

        <TextField
          label="Email or NIC"
          value={identifier}
          onChangeText={setIdentifier}
          keyboardType="email-address"
          testID="login-identifier"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          testID="login-password"
        />

        {error ? (
          <ThemedText type="small" themeColor="danger" selectable testID="login-error">
            {error}
          </ThemedText>
        ) : null}

        <Button
          variant="primary"
          disabled={!canSubmit}
          onPress={handleSubmit}
          testID="login-submit"
        >
          <ThemedText type="smallBold" themeColor="onPrimary">
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </ThemedText>
        </Button>

        <Link href="/(auth)/register" testID="login-go-register">
          <ThemedText type="link">Don&apos;t have an account? Register</ThemedText>
        </Link>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  badge: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  title: { textAlign: 'center' },
});
```

- [ ] **Step 2: Give the user the verification commands**

```bash
cd /data/iPermit/mobile
npx tsc --noEmit
npx eslint .
```

Expected: no errors (in particular, no unused-import warning for the now-removed `Pressable`). Wait for pasted output before continuing.

- [ ] **Step 3: Device check**

Ask the user to open the Login screen and confirm:
- No white-box-on-gray seam — the screen is one consistent background.
- "iPermit" and "Log in" are visibly smaller than before (34px/22px vs the old 48px/32px).
- The submit button visibly darkens/dims when pressed and held.
- The submit button is disabled (dimmed, ~0.4 opacity, unresponsive) exactly when the email/password fields are empty or mid-submit — same as before.

- [ ] **Step 4: Commit**

```bash
cd /data/iPermit
git add "mobile/src/app/(auth)/login.tsx"
git commit -m "Migrate Login screen to shared Button component"
git push
```

---

## Task 6: Migrate Register screen to `Button`

**Files:**
- Modify: `mobile/src/app/(auth)/register.tsx`

**Interfaces:**
- Consumes: `Button` from `@/components/button` (Task 3).

- [ ] **Step 1: Replace the full content of `mobile/src/app/(auth)/register.tsx`**

```tsx
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { extractErrorMessage } from '@/api/client';
import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TextField } from '@/components/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

// Mirrors backend/app/schemas/auth.py RegisterRequest — keep in sync.
const MIN_PASSWORD_LENGTH = 8;

type Field = 'email' | 'nic' | 'password' | 'confirmPassword';

function emailError(value: string): string | undefined {
  if (!value.includes('@')) return 'Enter a valid email address.';
  return undefined;
}

function nicError(value: string): string | undefined {
  if (value.trim().length < 5) return 'Enter a valid NIC.';
  return undefined;
}

function passwordError(value: string): string | undefined {
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return undefined;
}

function confirmPasswordError(value: string, password: string): string | undefined {
  if (value !== password) return 'Passwords do not match.';
  return undefined;
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [nic, setNic] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState<Record<Field, boolean>>({
    email: false,
    nic: false,
    password: false,
    confirmPassword: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function markTouched(field: Field) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  const fieldErrors = {
    email: emailError(email),
    nic: nicError(nic),
    password: passwordError(password),
    confirmPassword: confirmPasswordError(confirmPassword, password),
  };
  const hasAnyFieldError = Object.values(fieldErrors).some((e) => e !== undefined);

  async function handleSubmit() {
    setTouched({ email: true, nic: true, password: true, confirmPassword: true });
    if (hasAnyFieldError) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await register(email.trim(), nic.trim(), password);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <ThemedView style={styles.form}>
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <Ionicons name="shield-checkmark" size={36} color={theme.onPrimary} />
        </View>
        <ThemedText type="title" style={styles.title}>
          iPermit
        </ThemedText>
        <ThemedText type="subtitle">Create a driver account</ThemedText>

        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          onBlur={() => markTouched('email')}
          error={touched.email ? fieldErrors.email : undefined}
          keyboardType="email-address"
          testID="register-email"
        />
        <TextField
          label="NIC"
          value={nic}
          onChangeText={setNic}
          onBlur={() => markTouched('nic')}
          error={touched.nic ? fieldErrors.nic : undefined}
          testID="register-nic"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          onBlur={() => markTouched('password')}
          error={touched.password ? fieldErrors.password : undefined}
          secureTextEntry
          testID="register-password"
        />
        <TextField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onBlur={() => markTouched('confirmPassword')}
          error={touched.confirmPassword ? fieldErrors.confirmPassword : undefined}
          secureTextEntry
          testID="register-confirm-password"
        />

        {error ? (
          <ThemedText type="small" themeColor="danger" selectable testID="register-error">
            {error}
          </ThemedText>
        ) : null}

        <Button
          variant="primary"
          disabled={isSubmitting}
          onPress={handleSubmit}
          testID="register-submit"
        >
          <ThemedText type="smallBold" themeColor="onPrimary">
            {isSubmitting ? 'Creating account…' : 'Register'}
          </ThemedText>
        </Button>

        <Link href="/(auth)/login" testID="register-go-login">
          <ThemedText type="link">Already have an account? Log in</ThemedText>
        </Link>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  form: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  badge: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  title: { textAlign: 'center' },
});
```

- [ ] **Step 2: Give the user the verification commands**

```bash
cd /data/iPermit/mobile
npx tsc --noEmit
npx eslint .
```

Expected: no errors (no unused-import warning for the removed `Pressable`). Wait for pasted output before continuing.

- [ ] **Step 3: Device check**

Ask the user to open the Register screen and confirm the same four things as Task 5's Login check, plus: the submit button is disabled *only* while actually submitting (`isSubmitting`), not based on field validity — Register's original disabled condition, unlike Login's, was never tied to field completeness.

- [ ] **Step 4: Commit**

```bash
cd /data/iPermit
git add "mobile/src/app/(auth)/register.tsx"
git commit -m "Migrate Register screen to shared Button component"
git push
```

---

## Task 7: Multi-screen and dark-mode device check

**Files:** none — verification only, no code changes.

- [ ] **Step 1: Device check across screens and both color schemes**

Ask the user to check, in both light and dark mode (device/system theme toggle):
- **Login/Register**: no background seam, correct type sizes, button press feedback (already covered in Tasks 5/6, re-confirm in dark mode specifically).
- **Home (driver)**: no background seam between the screen and any `ThemedView`-based content.
- **A list screen** (Incidents or Fines): no background seam; existing (not-yet-migrated) local card/button styles on this screen should look unchanged from before this plan — this plan does not touch that screen's own styles, only the shared navigation-theme background underneath it.

Expected: a single consistent background color on every screen checked, in both themes, with no other visual regression on the not-yet-migrated screens.

- [ ] **Step 2: No commit** — this task is verification-only; if the check reveals a problem, treat it as a plan/code defect to fix (via `systematic-debugging`) before considering this plan done, not something to note and move past.
