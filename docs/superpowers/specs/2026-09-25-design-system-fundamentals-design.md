# Design System Fundamentals — Design Spec

Date: 2026-09-25
Status: Approved (conversational design, brainstorming skill — architectural path)

## Summary

The mobile app's UI reads as unpolished/"not production ready" (per user
screenshot of the Login screen) for four concrete, fixable reasons, not a
palette problem — the direction confirmed with the user is "fix the
fundamentals, same palette":

1. **A systemic background mismatch.** `app/_layout.tsx` wraps the whole
   app in React Navigation's stock `DefaultTheme`/`DarkTheme`, whose
   background color is unrelated to this app's own `Colors.light/dark`
   tokens. Every screen's `ThemedView` content (this app's white) sits on
   top of React Navigation's own gray screen background — the "white box
   floating in gray" effect is this seam, present on every screen, not
   just Login.
2. **Oversized typography.** `ThemedText`'s `title` (48px) and `subtitle`
   (32px) steps are oversized for a phone screen — `title` alone is
   larger than iOS's own `largeTitle` (34px).
3. **No depth token exists anywhere.** `theme.ts` has no shadow/elevation
   concept at all, so every repeated card-like view (fines, incidents,
   license, driver summary, applications) is a flat, borderless rectangle
   differentiated from its background only by a slightly different fill
   color.
4. **No pressed-state feedback on any button.** Every screen defines its
   own local `Pressable` + `StyleSheet` button from scratch (10+ separate
   copies across the app) and none of them react visually to a touch
   in progress — only to `disabled`. This is why the Login button reads
   as "broken" in the screenshot even though it's just idle-enabled.

## Decisions (from brainstorming Q&A)

- **Direction:** fix the fundamentals (hierarchy, depth, spacing, press
  feedback) using the existing blue/white palette — not a new visual
  identity, not a palette change.
- **Sequencing:** fix shared tokens/primitives first, apply to Login/
  Register as a flagship pass, get sign-off on-device, then roll the same
  primitives out to the remaining screens (Home, Apply, Fines, Incidents,
  Notifications, Police Verify, Police Driver, License Card) in follow-up
  batches — matching the batch rhythm already used earlier this session
  for the icon/status-pill pass. **This spec and its plan cover the
  flagship pass only** (tokens + shared components + Login/Register).
  Each follow-up batch gets its own plan when picked up, reusing these
  same primitives — no new design decisions expected there.
- **No new "Card" wrapper on the auth screen.** Once the background seam
  is fixed, Login/Register's form sits directly on the unified
  background, matching how native auth screens actually look. The shared
  `Card` component is still built in this pass (for the app's many
  genuine repeated list-item cards), just not applied to Login/Register.

## Token Changes (`mobile/src/constants/theme.ts`)

Same names, same file, no new file/folder structure introduced (this
project's existing `constants/theme.ts` + `ThemedText`/`ThemedView` is
already a declared system per the expo-design-system skill's "adopt
before you build" rule — extend it in its own idiom, don't replace it).

- `Spacing`, `Colors`, `Fonts`, `BottomTabInset`, `MaxContentWidth`:
  unchanged.
- New `Radius` export, naming the two border-radius values already reused
  ad hoc throughout the app (`Spacing.two`/`Spacing.three`) so intent is
  explicit:
  ```ts
  export const Radius = {
    small: Spacing.two,   // 8 -- chips, inputs, small controls
    medium: Spacing.three, // 16 -- cards, buttons
  } as const;
  ```
- New `Shadows` export — the app currently has zero elevation anywhere:
  ```ts
  export const Shadows = {
    card: '0 1px 3px rgba(0, 0, 0, 0.08)',
  } as const;
  ```
  One level is enough for this app's needs (list-item cards). Applied via
  React Native's `boxShadow` style property (not the deprecated
  `shadow*`/`elevation` props). In dark mode this reads as very subtle
  against a near-black background, which is expected/standard — dark-mode
  elevation is already primarily conveyed by `backgroundElement` vs
  `background` fill contrast (already present in `Colors.dark`), the
  shadow is a light-mode-primary affordance.

## `ThemedText` Type Scale Changes (`mobile/src/components/themed-text.tsx`)

Only values change; the `type` union's member names stay the same, so no
call site (`type="title"`, `type="subtitle"`, etc.) needs to change
anywhere in the app:

```ts
title: {
  fontSize: 34,   // was 48
  fontWeight: 700, // was 600
  lineHeight: 40,  // was 52
},
subtitle: {
  fontSize: 22,   // was 32
  lineHeight: 28,  // was 44
  fontWeight: 600, // unchanged
},
```

`default`, `small`, `smallBold`, `link`, `linkPrimary`, `code`: unchanged
— these are already reasonably sized; the oversized steps were `title`
and `subtitle` only.

## Root Navigation Theme (`mobile/src/app/_layout.tsx`)

Replace the stock `DefaultTheme`/`DarkTheme` with themes derived from
this app's own `Colors.light`/`Colors.dark`, so the navigation-level
screen background (and header/border/tint colors, for consistency)
matches the app's own tokens instead of React Navigation's defaults:

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

This is the single highest-impact fix in this spec — it removes the
background seam from every screen in the app, not just Login/Register,
the moment it lands.

## New Shared Component: `Button` (`mobile/src/components/button.tsx`)

Replaces the ad hoc `Pressable` + local `StyleSheet` button pattern
duplicated across every screen. Composition over configuration — accepts
`children` (so icon+label pairs already used throughout the app, e.g.
`<Ionicons/>` + `<ThemedText/>`, keep working unchanged), not a flat
`title` string prop.

```tsx
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
  children: React.ReactNode;
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

Content color (`onPrimary` vs `text`) stays the caller's responsibility
via `ThemedText themeColor="..."` inside `children`, exactly as every
screen already does today — this keeps the component's API smaller than
reimplementing per-variant text-color logic redundantly.

## New Shared Component: `Card` (`mobile/src/components/card.tsx`)

For the app's many genuine repeated list-item cards (fines, incidents,
violations, license, driver summary, applications) — not for
Login/Register's form. Not part of this pass's screen changes (no
screen is migrated to it in the flagship pass), but built now so the
follow-up batches have it available immediately.

```tsx
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
  children: React.ReactNode;
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

## Flagship Screens: Login / Register

`mobile/src/app/(auth)/login.tsx` and `register.tsx`:

- No structural change to `styles.form`/`styles.content` — vertical
  centering is already correct (`content` already has
  `justifyContent: 'center'`); the fix is the background seam (above)
  and the type scale (above), not the layout.
- Swap the local `Pressable` + `styles.button`/`styles.buttonDisabled`
  submit button for `<Button variant="primary" disabled={...}>` with the
  existing `ThemedText type="smallBold" themeColor="onPrimary">` label
  inside as `children` — same visual content, now with real press
  feedback.
- Remove the now-unused local `button`/`buttonDisabled` style entries
  from each file's `StyleSheet.create`.
- Everything else (badge, title, subtitle, `TextField` usage, error
  text, footer link) is unchanged — the type-scale and background fixes
  apply automatically since they're token-level, not per-screen.

## Error Handling / Edge Cases

- `Card`'s `boxShadow` uses the CSS `box-shadow` string syntax (React
  Native's supported cross-platform shadow API on recent RN/Expo SDKs,
  not the deprecated `shadowColor`/`shadowOffset`/`elevation` props) —
  matches this project's Expo SDK 57 baseline.
- The navigation theme change touches every screen simultaneously; the
  plan's device-check step must visually confirm at least one screen
  from each major area (auth, driver home, a list screen) shows a single
  consistent background with no visible seam, not just Login.
- `Button`'s `disabled` and `pressed` styles are mutually exclusive by
  construction (`pressed && !disabled`), so a disabled button never
  shows transient press-darkening on an already-dimmed state.

## Testing

- No automated test suite exists for mobile screens/components in this
  project (established convention, see the danger-zones spec's Testing
  section) — verification stays `tsc --noEmit`, `eslint .`, an Ionicons
  glyph-existence check for any new icon name (this pass introduces
  none), then manual on-device verification against both the screenshot
  issues above and the multi-screen background-consistency check.

## Out of Scope (this pass)

- Migrating any screen other than Login/Register to the new tokens/
  components — follow-up batches, each gets its own plan.
- A `Card` rollout to Fines/Incidents/License/etc. — component is built,
  application is future work.
- Any palette/branding change (explicitly ruled out by the user).
- A `size` prop on `Button` (every button in this app is currently one
  size) — add only if a real screen needs a second size.
- Dark-mode-specific shadow tuning beyond noting it's expected to read
  as subtle.
