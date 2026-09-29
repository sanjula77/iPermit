# Style-B Foundation + Fines (Phase 2, Batch 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the mobile app the approved style-B look. The app-wide part: a light-grey canvas, white floating cards, a compact blue app bar, press and entrance motion, and haptics. The Fines screen gets the blue gradient hero, stat tiles and a Pay shortcut, and fine details are restyled.

**Architecture:**
- **Tokens:** they stay in `constants/theme.ts`, with brand colours, shadows and a large radius added.
- **Brand header:** one hook, `useBrandHeaderOptions()`, styles every native header blue, and `HeroScreen` draws the gradient hero for summary screens.
- **Motion primitives:** `PressableScale`, `FadeInItem` and `Skeleton` are small Reanimated components that respect reduce-motion.
- **Fines figures:** they come from a pure, Node-checked `summarizeFines()`.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19 (React Compiler on), expo-router 57, Reanimated 4.5.1 (CSS transitions and layout animations), plus two new packages: `expo-linear-gradient` and `expo-haptics`.

**Spec:** `docs/superpowers/specs/2026-09-28-ui-redesign-style-b-design.md` (the "Phase 2" and "Phase 2 batches, 1" sections).

## Global Constraints

- Mobile only (`mobile/`). No backend changes.
- **The only new dependencies are `expo-linear-gradient` and `expo-haptics`.** Install
  them with `npx expo install`, never with npm directly.
- **Load these skills before editing:** `expo:expo-overview`, `expo:expo-design-system`,
  `expo:expo-animation` (project preference).
- **Every task ends with these commands clean**, run from `mobile/`:
  - `npx tsc --noEmit`
  - `npx eslint .`

  The only accepted output is the existing warning in `.expo/types/router.d.ts`.
- **Tokens:** all colours come from `Colors` via `useTheme()`. Radii use `Radius.*`.
  Shadows use `Shadows.*`. Tints use `tint()`.
- **Motion** (from the expo-animation skill):
  - Reanimated only.
  - Press is a CSS transition: scale 0.97, 120ms, `cubicBezier(0.23, 1, 0.32, 1)`.
  - Entrances use `FadeInDown` at 250ms, with a 40ms stagger, capped at the first 8
    items.
  - Every animation honours reduce-motion (`ReduceMotion.System` or
    `useReducedMotion()`).
  - Never animate width, height or margin.
- **Haptics:** one per committed user action (a payment or appeal succeeding or
  failing). Always paired with the visual banner, never on scroll or press-in.
- Keep the app's existing "license" spelling in UI strings.
- **Commits:** batched, where the plan says. Work on `dev`. Never add a
  `Co-Authored-By` trailer.

## Deviations from the spec (decided while planning)

1. **No new `surface` token.** Light `background` becomes the `#F4F6FA` canvas and
   light `backgroundElement` becomes `#FFFFFF`. Every card, tile, tab bar, segmented
   track and photo tile is `backgroundElement` already, so they all turn white on grey
   in one change. Dark values are unchanged (spec: dark mode is kept legible, not
   polished).
2. **Tone pairs are not added.** Phase 1's `tint(color, strength)` already derives
   every soft background from a tone colour, so a second mechanism would be a
   duplicate.
3. **Typography:** only `display` is added. `title` and `subtitle` are retuned in the
   batches that restyle their screens (auth, Home, police), so batch 1 doesn't restyle
   screens it doesn't own.
4. **Press feedback:**
   - `PressableScale` scales and has no `android_ripple`. The expo-animation skill says
     a custom-designed app should use the same scale on both platforms.
   - It has no haptic prop either. Haptics fire at commit points only, so a
     press-level haptic would break the one-per-action rule.
   - List rows keep their opacity highlight. The skill says full-width rows shouldn't
     scale.
5. **Skeleton:** only the Fines list uses it in this batch. Fine details keep the
   spinner (the data is usually already cached by the list). Other screens adopt the
   skeleton in their own batches.
6. **The segmented-control slide and status-badge change animations** move to batch 4
   (Incidents), the first batch that restyles a segmented screen. Banners do get their
   fade-in here, because every screen uses `Banner`.
7. **iOS large titles are turned off.** A coloured compact bar is the approved
   option 2, and large titles on a coloured bar need separate styling.

## Review Focus

1. **Status-bar contrast:**
   - Every signed-in screen has blue at the top (hero or bar), so the status bar is
     light there.
   - The auth screens are on the light canvas, so theirs is dark.
   - Leaving or entering the signed-in area must switch correctly.

   *Task 1 renders `StatusBar` in both layouts; Task 7's phone checklist.*
2. **Large system font:**
   - The hero balance (`display`) shrinks to fit on one line.
   - The stat tiles' figures shrink rather than wrap.
   - The Pay button label fits.

   *Task 3's `adjustsFontSizeToFit` on `StatTile` and Task 5's on the balance; Task 7
   checklist.*
3. **Year boundaries and missing dates in the Fines figures:**
   - A fine paid last year isn't counted in "Paid this year".
   - A paid fine with a null `paid_at` isn't counted.
   - Fines under a pending appeal are never the Pay target.

   *Pinned by `scripts/check-fine-summary.mjs` in Task 4.*
4. **Reduce motion on:** no entrance slide, no skeleton pulse, and no press scale
   transition beyond an instant state change. *Implemented in Task 2's components;
   Task 7 checklist.*
5. **Screens this batch doesn't redesign** still read correctly on the new canvas: the
   blue bar, white cards on grey, the Incidents "Report" header button in white, the
   selected segmented option visible. *Task 1 fixes the known contrast cases; Task 7
   checklist visits Home, Incidents, Alerts, Profile and a police screen.*

## File Map

| File | Status | Responsibility |
|---|---|---|
| `mobile/package.json` | modify | `expo-linear-gradient`, `expo-haptics` |
| `mobile/tsconfig.json` | modify | `allowImportingTsExtensions` (Node-checkable lib files) |
| `mobile/src/constants/theme.ts` | modify | Canvas/card colours, brand colours, `Shadows.raised`, `Radius.large` |
| `mobile/src/constants/violations.ts` | modify | `VIOLATION_COLOR` |
| `mobile/src/components/themed-text.tsx` | modify | `display` type |
| `mobile/src/hooks/use-brand-header.ts` | create | Blue native-header options |
| `mobile/src/components/tab-stack.tsx` | modify | Use the brand header |
| `mobile/src/app/(app)/_layout.tsx` | modify | Brand header on pushed screens; light status bar |
| `mobile/src/app/(auth)/_layout.tsx` | modify | Dark (auto) status bar |
| `mobile/src/app/(app)/(tabs)/_layout.tsx` | no change | Tab bar already uses `backgroundElement` (now white) |
| `mobile/src/components/segmented-control.tsx` | modify | Visible selected state on a white track |
| `mobile/src/app/(app)/(tabs)/(incidents)/incidents.tsx` | modify | White header "Report" button |
| `mobile/src/components/pressable-scale.tsx` | create | Press-scale wrapper |
| `mobile/src/components/button.tsx` | modify | Built on `PressableScale`; `ghost` variant |
| `mobile/src/components/fade-in-item.tsx` | create | Staggered list entrance |
| `mobile/src/components/skeleton.tsx` | create | Pulsing placeholder block |
| `mobile/src/components/banner.tsx` | modify | Fade in on mount |
| `mobile/src/components/card.tsx` | modify | `raised` variant |
| `mobile/src/components/stat-tile.tsx` | create | Label and figure tile |
| `mobile/src/components/hero-screen.tsx` | create | Gradient hero, overlapping sheet, `HeroChip` |
| `mobile/src/lib/fine-summary.ts` | create | `summarizeFines()` |
| `mobile/scripts/check-fine-summary.mjs` | create | Assertions for `summarizeFines()` |
| `mobile/src/app/(app)/(tabs)/(fines)/_layout.tsx` | modify | Hide the native header on the Fines list |
| `mobile/src/app/(app)/(tabs)/(fines)/fines.tsx` | modify | Hero, stat tiles, Pay, skeleton, entrances |
| `mobile/src/app/(app)/(tabs)/(fines)/fine/[id].tsx` | modify | Raised summary card, ghost Cancel, haptics |

---

### Task 1: Tokens, brand header and status bar

**Files:** `package.json`, `constants/theme.ts`, `components/themed-text.tsx`,
`hooks/use-brand-header.ts` (create), `components/tab-stack.tsx`,
`app/(app)/_layout.tsx`, `app/(auth)/_layout.tsx`,
`components/segmented-control.tsx:39`, `app/(app)/(tabs)/(incidents)/incidents.tsx`
(header button). All paths are under `mobile/src/` except `package.json`.

**Interfaces:**
- **Produces:**
  - Colour keys `brandDeep`, `brand`, `brandBright` and `onBrand` in both schemes, so
    `ThemeColor` includes them
  - `Shadows.raised`
  - `Radius.large`
  - `ThemedText` `type="display"`
  - `useBrandHeaderOptions(): NativeStackNavigationOptions`-compatible object

- [ ] **Step 1: Install the two packages**

Run: `cd mobile && npx expo install expo-linear-gradient expo-haptics`
Expected: both added to `package.json` `dependencies` with `~57.x` versions. No other
dependency changes (`git diff package.json` shows only two added lines).

- [ ] **Step 2: Theme tokens**

In `constants/theme.ts`:

Light scheme: change `background: '#ffffff',` to `background: '#F4F6FA',` and
`backgroundElement: '#F0F0F3',` to `backgroundElement: '#FFFFFF',`, with this comment
above them:

```ts
    // Cards and tiles (backgroundElement) float white on a cool-grey canvas.
```

Add to the end of the **light** object:

```ts
    // Style-B brand: gradient hero and blue app bar. White text passes AA on all three.
    brandDeep: '#0B3D91',
    brand: '#1565C0',
    brandBright: '#3B8CF0',
    onBrand: '#ffffff',
```

Add to the end of the **dark** object:

```ts
    brandDeep: '#061E4A',
    brand: '#0B3D91',
    brandBright: '#1552B0',
    onBrand: '#ffffff',
```

Replace `Radius` and `Shadows` with:

```ts
export const Radius = {
  small: Spacing.two, // 8 -- chips, inputs, small controls
  medium: Spacing.three, // 16 -- cards, buttons
  large: 22, // hero sheet corners
} as const;

export const Shadows = {
  card: '0 2px 10px rgba(15, 40, 90, 0.08)',
  raised: '0 8px 24px rgba(11, 61, 145, 0.18)',
} as const;
```

- [ ] **Step 3: `display` text type**

In `components/themed-text.tsx`:
- Add `'display'` to the `type` union.
- Add `type === 'display' && styles.display,` after the `title` line.
- Add the style:

```ts
  // Hero figures (balances). Callers add numberOfLines={1} + adjustsFontSizeToFit.
  display: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
```

- [ ] **Step 4: Brand header hook**

Create `hooks/use-brand-header.ts`:

```ts
import { useTheme } from '@/hooks/use-theme';

// Style-B compact app bar: every native header is brand blue with white title
// and back button. Screens with a HeroScreen hide the header instead.
export function useBrandHeaderOptions() {
  const theme = useTheme();
  return {
    headerLargeTitleEnabled: false,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: theme.brand },
    headerTintColor: theme.onBrand,
    headerTitleStyle: { color: theme.onBrand },
  } as const;
}
```

In `components/tab-stack.tsx`, replace the component and its comment:

```tsx
import type { ReactNode } from 'react';
import { Stack } from 'expo-router';

import { useBrandHeaderOptions } from '@/hooks/use-brand-header';

// Header configuration shared by every tab's stack: the style-B blue app bar.
//
// Pass <Stack.Screen> children to configure extra screens in the tab (e.g. a
// modal). Declare the tab's main screen first: the first declared screen is the
// stack's initial route.
export function TabStack({ title, children }: { title: string; children?: ReactNode }) {
  const brandHeader = useBrandHeaderOptions();
  return <Stack screenOptions={{ title, ...brandHeader }}>{children}</Stack>;
}
```

In `app/(app)/_layout.tsx`:
- Add `import { StatusBar } from 'expo-status-bar';` and
  `import { useBrandHeaderOptions } from '@/hooks/use-brand-header';`.
- Call `const brandHeader = useBrandHeaderOptions();` at the top of `AppLayout`,
  before the early returns. It's a hook, so it must run unconditionally.
- Replace the final `return (…)` with:

```tsx
  return (
    <>
      {/* Every signed-in screen has blue at the top (hero or app bar). */}
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="apply" options={{ ...brandHeader, headerShown: true, title: 'Apply for License' }} />
        <Stack.Screen name="police-driver" options={{ ...brandHeader, headerShown: true, title: 'Driver Details' }} />
      </Stack>
    </>
  );
```

In `app/(auth)/_layout.tsx`, add `import { StatusBar } from 'expo-status-bar';` and replace the final `return (…)` with:

```tsx
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
    </>
  );
```

- [ ] **Step 5: Fix contrast on the new surfaces**

`components/segmented-control.tsx`: the track is now white, so the selected segment
can't be the canvas colour. Change

```tsx
              selected && { backgroundColor: theme.background, boxShadow: '0 1px 2px rgba(0, 0, 0, 0.12)' },
```

to

```tsx
              selected && { backgroundColor: theme.backgroundSelected },
```

and change the track: in the container style usage, replace
`{ backgroundColor: theme.backgroundElement }` with
`{ backgroundColor: theme.backgroundElement, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.backgroundSelected }`,
so the white track shows on the grey canvas.

`app/(app)/(tabs)/(incidents)/incidents.tsx`: the header "Report" button sits on the
blue bar. Change its icon `color={theme.primary}` to `color={theme.onBrand}` and its
label `themeColor="primary"` to `themeColor="onBrand"`. Only change the two inside
`headerRight`; the row Confirm buttons keep `primary`.

- [ ] **Step 6: Verify**

Run: `cd mobile && npx tsc --noEmit && npx eslint .`
Expected: clean.

---

### Task 2: Motion primitives: `PressableScale`, `Button`, `FadeInItem`, `Skeleton`, `Banner` fade

**Files:** `components/pressable-scale.tsx` (create), `components/button.tsx`,
`components/fade-in-item.tsx` (create), `components/skeleton.tsx` (create),
`components/banner.tsx`.

**Interfaces:**
- **Produces:**
  - `PressableScale(props: PressableProps & { style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle>; children })`,
    where `style` sets outer layout and `contentStyle` is the scaled visual
  - `Button` gains `variant="ghost"`
  - `FadeInItem({ index, children })`
  - `Skeleton({ width?, height, radius?, style? })`

- [ ] **Step 1: `PressableScale`**

Create `components/pressable-scale.tsx`:

```tsx
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

// Press feedback for buttons and tappable tiles: a 3% scale-down in 120ms on
// press-in (feedback), released on press-out. A CSS transition, not a shared
// value -- it's a two-state change. Full-width list rows don't use this; they
// keep an opacity highlight (a scaling row reads as the screen squishing).
// `style` is outer layout (margins, alignSelf); `contentStyle` is the visual.
export function PressableScale({
  style,
  contentStyle,
  children,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      pressRetentionOffset={16}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      style={style}
    >
      <Animated.View
        style={[
          styles.content,
          reduceMotion ? styles.instant : null,
          contentStyle,
          pressed && !disabled && styles.pressed,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    transform: [{ scale: 1 }],
    transitionProperty: 'transform',
    transitionDuration: 120,
    transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
  },
  // Reduce motion: the state still changes, just without the tween.
  instant: { transitionDuration: 0 },
  pressed: { transform: [{ scale: 0.97 }] },
});
```

- [ ] **Step 2: Rebuild `Button` on it**

Replace `components/button.tsx` with:

```tsx
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

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
  // Outer layout only (margins, alignSelf); the variant owns the look.
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const backgroundColor =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? theme.danger
        : variant === 'secondary'
          ? theme.backgroundSelected
          : 'transparent';

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={style}
      contentStyle={[styles.button, { backgroundColor }, disabled && styles.disabled]}
    >
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  disabled: { opacity: 0.4 },
});
```

- [ ] **Step 3: `FadeInItem` and `Skeleton`**

Create `components/fade-in-item.tsx`:

```tsx
import { useMemo, type ReactNode } from 'react';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

// Entrance for content the user is waiting on (a list's first load): fade up
// 250ms, staggered 40ms per item. Only the first 8 animate; later ones would
// arrive too late to read as one list. Reduce motion: appears in place.
const MAX_ANIMATED = 8;

export function FadeInItem({ index, children }: { index: number; children: ReactNode }) {
  const entering = useMemo(
    () =>
      index < MAX_ANIMATED
        ? FadeInDown.duration(250).delay(index * 40).reduceMotion(ReduceMotion.System)
        : undefined,
    [index],
  );
  return <Animated.View entering={entering}>{children}</Animated.View>;
}
```

Create `components/skeleton.tsx`:

```tsx
import { type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const PULSE = {
  from: { opacity: 1 },
  to: { opacity: 0.45 },
};

// A placeholder block shaped like the content it stands in for, pulsing gently
// while the first load runs. Static under reduce motion.
export function Skeleton({
  width = '100%',
  height,
  radius = Radius.small,
  style,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.backgroundSelected },
        reduceMotion
          ? null
          : {
              animationName: PULSE,
              animationDuration: 900,
              animationIterationCount: 'infinite',
              animationDirection: 'alternate',
              animationTimingFunction: 'ease-in-out',
            },
        style,
      ]}
    />
  );
}
```

- [ ] **Step 4: Fade banners in**

In `components/banner.tsx`:
- Add `import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';`.
- Add, below the `TONE` constant:

```ts
// Banners explain a state change (a payment went through, a refresh failed), so
// they fade in rather than pop. Module scope: the builder isn't rebuilt per render.
const ENTERING = FadeIn.duration(200).reduceMotion(ReduceMotion.System);
```

- Change the outer `<View … accessibilityLiveRegion="polite" testID={testID}>` to
  `<Animated.View entering={ENTERING} …same props…>`, and change its closing tag to
  `</Animated.View>`.

- [ ] **Step 5: Verify**

Run: `cd mobile && npx tsc --noEmit && npx eslint .`
Expected: clean. If tsc rejects `transitionDuration: 120` or
`animationDuration: 900` as numbers, use the string forms `'120ms'` and `'900ms'`
(both are accepted by Reanimated 4's CSS API). Record which one was used.

---

### Task 3: `HeroScreen`, `StatTile`, raised `Card`, violation colours

**Files:** `components/hero-screen.tsx` (create), `components/stat-tile.tsx` (create),
`components/card.tsx`, `constants/violations.ts`.

**Interfaces:**
- **Consumes:** `Colors.brand*`, `Shadows.raised`, `Radius.large`, `display` (Task 1),
  `PressableScale` (Task 2).
- **Produces:**
  - `HeroScreen({ title, summary?, children, heroContent?, refreshControl?, testID? })`
  - `HeroChip({ icon, label, testID? })`
  - `HeroAction({ label, icon, onPress, testID? })`
  - `StatTile({ label, value, valueColor?: ThemeColor, testID? })`
  - `Card` prop `variant?: 'flat' | 'raised'`
  - `VIOLATION_COLOR: Record<ViolationType, ThemeColor>`

- [ ] **Step 1: Raised card and violation colours**

Replace `components/card.tsx`'s component with:

```tsx
export function Card({
  variant = 'flat',
  style,
  testID,
  children,
}: {
  // 'raised' lifts hero-adjacent tiles and summary cards above ordinary cards.
  variant?: 'flat' | 'raised';
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
        {
          backgroundColor: theme.backgroundElement,
          boxShadow: variant === 'raised' ? Shadows.raised : Shadows.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
```

Append to `constants/violations.ts` (and add
`import type { ThemeColor } from '@/constants/theme';`):

```ts
// Icon-tile colour per violation, so rows are scannable at a glance.
export const VIOLATION_COLOR: Record<ViolationType, ThemeColor> = {
  WHITE_LINE: 'primary',
  SPEEDING: 'warning',
  RED_LIGHT: 'danger',
  DRUNK_DRIVING: 'danger',
};
```

- [ ] **Step 2: `StatTile`**

Create `components/stat-tile.tsx`:

```tsx
import { StyleSheet } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';

// A small raised tile with one figure, used in a row under a hero.
export function StatTile({
  label,
  value,
  valueColor = 'text',
  testID,
}: {
  label: string;
  value: string;
  valueColor?: ThemeColor;
  testID?: string;
}) {
  return (
    <Card variant="raised" style={styles.tile} testID={testID}>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText
        type="subtitle"
        themeColor={valueColor}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={styles.value}
      >
        {value}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minWidth: 0, gap: Spacing.half },
  value: { fontVariant: ['tabular-nums'] },
});
```

- [ ] **Step 3: `HeroScreen`, `HeroChip`, `HeroAction`**

Create `components/hero-screen.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactElement, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type RefreshControlProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Style-B summary screen: a brand gradient hero holding the screen's key figure,
// with the content on a rounded sheet that overlaps the hero's lower edge.
// Used with the native header hidden, so the hero draws under the status bar.
export function HeroScreen({
  title,
  summary,
  heroContent,
  refreshControl,
  testID,
  children,
}: {
  title: string;
  summary?: string;
  // The key figure and any chip/action, rendered below the title.
  heroContent?: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
  testID?: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      refreshControl={refreshControl}
      testID={testID}
    >
      <LinearGradient
        colors={[theme.brandDeep, theme.brand, theme.brandBright]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + Spacing.three }]}
      >
        <View style={styles.inner}>
          <ThemedText type="subtitle" themeColor="onBrand" accessibilityRole="header">
            {title}
          </ThemedText>
          {summary ? (
            <ThemedText type="small" themeColor="onBrand" style={styles.summary}>
              {summary}
            </ThemedText>
          ) : null}
          {heroContent ? <View style={styles.heroContent}>{heroContent}</View> : null}
        </View>
      </LinearGradient>
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={[styles.inner, styles.body]}>{children}</View>
      </View>
    </ScrollView>
  );
}

// A status chip that reads on the blue hero (translucent white, white text).
export function HeroChip({
  icon,
  label,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.chip} testID={testID} accessible accessibilityLabel={label}>
      <Ionicons name={icon} size={14} color={theme.onBrand} />
      <ThemedText type="smallBold" themeColor="onBrand" numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

// The hero's one primary action: a white pill with brand-coloured text.
export function HeroAction({
  label,
  icon,
  onPress,
  testID,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
      hitSlop={4}
      style={styles.actionOuter}
      contentStyle={[styles.action, { backgroundColor: theme.onBrand }]}
    >
      <Ionicons name={icon} size={18} color={theme.brand} />
      <ThemedText type="smallBold" themeColor="brand" numberOfLines={1}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1 },
  hero: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    // Room for the sheet to overlap without covering hero content.
    paddingBottom: Spacing.six,
  },
  inner: { width: '100%', maxWidth: MaxContentWidth },
  summary: { opacity: 0.85 },
  heroContent: { marginTop: Spacing.three, gap: Spacing.two, alignItems: 'flex-start' },
  sheet: {
    flexGrow: 1,
    alignItems: 'center',
    marginTop: -Spacing.five,
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
  },
  body: { gap: Spacing.four },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.half,
    paddingVertical: Spacing.half,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  actionOuter: { alignSelf: 'flex-start', marginTop: Spacing.one },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
  },
});
```

(`rgba(255,255,255,0.18)` and the pill radius 999 are local to the hero: the chip is
the only translucent-white surface in the app. The comment on `HeroChip` says so.)

- [ ] **Step 4: Verify, then commit Tasks 1–3**

Run: `cd mobile && npx tsc --noEmit && npx eslint .`
Expected: clean.

```bash
cd /data/iPermit && git add mobile && git commit -m "Add style-B foundation: brand header, canvas, motion primitives

Every native header becomes the brand-blue app bar with a light status
bar in the signed-in area. The canvas turns cool grey so cards float
white with a soft blue shadow. Adds PressableScale (buttons now scale on
press), FadeInItem, Skeleton, a fading Banner, HeroScreen with HeroChip
and HeroAction, StatTile, a raised Card and per-violation colours, plus
expo-linear-gradient and expo-haptics."
```

---

### Task 4: `summarizeFines()` (test first)

**Files:** `tsconfig.json`, `src/lib/fine-summary.ts` (create),
`scripts/check-fine-summary.mjs` (create). All paths are under `mobile/`.

**Interfaces:**
- **Consumes:** `canPayFine`, `appealForFine` from `src/lib/fine-status.ts`.
- **Produces:** `summarizeFines(fines: FineWithViolation[], appeals: Appeal[], now?: Date): FineSummary`,
  where `FineSummary = { outstanding: number; unpaidCount: number; paidThisYear: number; finesThisYear: number; payableCount: number; oldestPayableId: string | null }`.

- [ ] **Step 1: Allow `.ts` import specifiers**

In `mobile/tsconfig.json` `compilerOptions`, add `"allowImportingTsExtensions": true`.
It's valid because the Expo base config sets `noEmit`. Node's type-stripping needs the
explicit extension; Metro accepts it too.

- [ ] **Step 2: Write the failing check**

Create `mobile/scripts/check-fine-summary.mjs`:

```js
// Assertions for src/lib/fine-summary.ts (no test runner in the mobile app).
// Run from mobile/:  TZ=Asia/Colombo node scripts/check-fine-summary.mjs
import assert from 'node:assert/strict';

import { summarizeFines } from '../src/lib/fine-summary.ts';

const NOW = new Date('2026-09-29T12:00:00+05:30');

function fine(id, { status = 'UNPAID', amount = 5000, confirmed = '2026-09-01T10:00:00+00:00', paid = null } = {}) {
  return {
    id,
    amount,
    status,
    created_at: confirmed,
    paid_at: paid,
    payment_method: paid ? 'CARD' : null,
    violation: { id: `v-${id}`, type: 'SPEEDING', points_deducted: 4, confirmed_at: confirmed, evidence_ref: null },
  };
}
function appeal(fineId, status) {
  return { id: `a-${fineId}`, fine: { id: fineId }, status, reason: 'x', created_at: '2026-09-02T00:00:00+00:00', resolved_at: null };
}

// Empty list.
assert.deepEqual(summarizeFines([], [], NOW), {
  outstanding: 0, unpaidCount: 0, paidThisYear: 0, finesThisYear: 0, payableCount: 0, oldestPayableId: null,
});

const fines = [
  fine('new-unpaid', { amount: 5000, confirmed: '2026-09-20T10:00:00+00:00' }),
  fine('old-unpaid', { amount: 10000, confirmed: '2026-08-01T10:00:00+00:00' }),
  // Oldest of all, but under a pending appeal: can't be paid, so never the Pay target.
  fine('appealed', { amount: 2000, confirmed: '2026-07-01T10:00:00+00:00' }),
  fine('paid-this-year', { status: 'PAID', amount: 4000, confirmed: '2026-03-01T10:00:00+00:00', paid: '2026-03-05T10:00:00+00:00' }),
  // Paid last year: not "this year" (paid 31 Dec 2025 23:00 in Colombo).
  fine('paid-last-year', { status: 'PAID', amount: 7000, confirmed: '2025-12-20T10:00:00+00:00', paid: '2025-12-31T17:30:00+00:00' }),
  // Paid but the timestamp is missing: counted nowhere in "paid this year".
  fine('paid-no-date', { status: 'PAID', amount: 1000, confirmed: '2026-02-01T10:00:00+00:00', paid: null }),
  fine('reversed', { status: 'REVERSED', amount: 25000, confirmed: '2026-01-10T10:00:00+00:00' }),
];
const appeals = [appeal('appealed', 'PENDING')];

const s = summarizeFines(fines, appeals, NOW);
assert.equal(s.outstanding, 17000, 'all unpaid, including the appealed one');
assert.equal(s.unpaidCount, 3);
assert.equal(s.paidThisYear, 4000);
assert.equal(s.finesThisYear, 6, 'every fine confirmed in 2026, whatever its status');
assert.equal(s.payableCount, 2);
assert.equal(s.oldestPayableId, 'old-unpaid');

// A rejected (UPHELD) appeal leaves the fine payable again.
assert.equal(summarizeFines([fine('f')], [appeal('f', 'UPHELD')], NOW).oldestPayableId, 'f');

console.log('fine summary checks passed');
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `cd mobile && TZ=Asia/Colombo node scripts/check-fine-summary.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/lib/fine-summary.ts`.

- [ ] **Step 4: Implement**

Create `mobile/src/lib/fine-summary.ts`:

```ts
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
```

- [ ] **Step 5: Run it and confirm it passes**

Run: `cd mobile && TZ=Asia/Colombo node scripts/check-fine-summary.mjs && TZ=Asia/Colombo node scripts/check-format.mjs && npx tsc --noEmit && npx eslint .`
Expected: `fine summary checks passed`, `format checks passed`, and tsc and eslint clean.

If Node fails on `fine-status.ts`, it's the value imports inside it. Its imports are
all `import type`, so they're erased. If one isn't, change it to `import type` and
record a ruling.

---

### Task 5: Fines screen on the hero

**Files:**
- Modify: `mobile/src/app/(app)/(tabs)/(fines)/_layout.tsx`
- Modify: `mobile/src/app/(app)/(tabs)/(fines)/fines.tsx`

**Interfaces:**
- **Consumes:** `HeroScreen`, `HeroChip`, `HeroAction`, `StatTile`, `Skeleton`,
  `FadeInItem`, `Card`, `ListRow`, `IconTile`, `VIOLATION_COLOR`, `summarizeFines`,
  `formatLkr`, `formatDate`.

- [ ] **Step 1: Hide the native header on the list only**

Replace `(fines)/_layout.tsx` with:

```tsx
import { Stack } from 'expo-router';

import { TabStack } from '@/components/tab-stack';

export default function FinesLayout() {
  return (
    <TabStack title="Fines">
      {/* The list draws its own hero; fine details keep the blue app bar. */}
      <Stack.Screen name="fines" options={{ headerShown: false }} />
      <Stack.Screen name="fine/[id]" />
    </TabStack>
  );
}
```

- [ ] **Step 2: Rewrite `FinesScreen` and `FinesContent`**

In `fines.tsx`, replace `FinesScreen` and `FinesContent` with:

```tsx
export default function FinesScreen() {
  const { fines, appeals, error, isLoading, reload } = useMyFines();
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const summary = fines ? summarizeFines(fines, appeals) : null;

  async function handleRefresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  const openOldestPayable = () => {
    if (!summary?.oldestPayableId) return;
    router.push({ pathname: '/(app)/(tabs)/(fines)/fine/[id]', params: { id: summary.oldestPayableId } });
  };

  return (
    <HeroScreen
      title="Fines"
      testID="fines-screen"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.brand]} tintColor={theme.onBrand} />
      }
      heroContent={
        summary ? (
          <>
            <ThemedText type="small" themeColor="onBrand" style={styles.heroLabel}>
              Outstanding balance
            </ThemedText>
            <ThemedText
              type="display"
              themeColor="onBrand"
              testID="outstanding-total"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {formatLkr(summary.outstanding)}
            </ThemedText>
            {summary.unpaidCount ? (
              <HeroChip
                icon="alert-circle"
                label={`${summary.unpaidCount} unpaid ${summary.unpaidCount === 1 ? 'fine' : 'fines'}`}
                testID="fines-unpaid-chip"
              />
            ) : (
              <HeroChip icon="checkmark-circle" label="All clear" testID="fines-all-clear" />
            )}
            {summary.oldestPayableId ? (
              <HeroAction
                icon="card-outline"
                label={summary.payableCount > 1 ? 'Pay oldest fine' : 'Pay fine'}
                onPress={openOldestPayable}
                testID="fines-hero-pay"
              />
            ) : null}
          </>
        ) : error && !isLoading ? undefined : (
          // First load: placeholders; after a failed first load the hero stays
          // plain and the error with Retry shows below.
          <View style={styles.heroSkeleton}>
            <Skeleton width={140} height={14} style={styles.onHero} />
            <Skeleton width={200} height={36} style={styles.onHero} />
          </View>
        )
      }
    >
      {fines !== null && error ? (
        // Keep showing the last good data, but say the refresh failed.
        <Banner tone="danger" text={`Couldn't refresh: ${error}`} testID="fines-refresh-error" />
      ) : null}
      {fines === null ? (
        isLoading || !error ? (
          <FinesSkeleton />
        ) : (
          <ScreenState error={error} onRetry={handleRefresh} testID="fines" />
        )
      ) : fines.length === 0 ? (
        <EmptyState
          testID="fines-empty"
          icon="shield-checkmark-outline"
          title="No fines"
          message="You have no traffic fines. Keep driving safely."
        />
      ) : (
        <FinesContent fines={fines} appeals={appeals} summary={summary!} />
      )}
    </HeroScreen>
  );
}

function FinesSkeleton() {
  return (
    <View style={styles.skeleton} testID="fines-loading">
      <View style={styles.stats}>
        <Skeleton height={64} radius={Radius.medium} style={styles.flex} />
        <Skeleton height={64} radius={Radius.medium} style={styles.flex} />
      </View>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} height={72} radius={Radius.medium} />
      ))}
    </View>
  );
}

function FinesContent({
  fines,
  appeals,
  summary,
}: {
  fines: FineWithViolation[];
  appeals: Appeal[];
  summary: FineSummary;
}) {
  const unpaid = fines.filter((f) => f.status === 'UNPAID');
  const history = fines.filter((f) => f.status !== 'UNPAID');

  return (
    <>
      <View style={styles.stats}>
        <StatTile label="Paid this year" value={formatLkr(summary.paidThisYear)} testID="fines-paid-this-year" />
        <StatTile label="Fines this year" value={String(summary.finesThisYear)} testID="fines-this-year" />
      </View>

      <FineSection title="Unpaid" fines={unpaid} appeals={appeals} startIndex={0} />
      <FineSection title="History" fines={history} appeals={appeals} startIndex={unpaid.length} />
    </>
  );
}
```

Replace `FineSection` with (it adds the staggered entrance; `startIndex` continues the
stagger across both sections):

```tsx
function FineSection({
  title,
  fines,
  appeals,
  startIndex,
}: {
  title: string;
  fines: FineWithViolation[];
  appeals: Appeal[];
  startIndex: number;
}) {
  if (fines.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel} accessibilityRole="header">
        {title}
      </ThemedText>
      {/* One card per fine, with space between them. */}
      {fines.map((fine, i) => (
        <FadeInItem key={fine.id} index={startIndex + i}>
          <Card style={styles.rowCard}>
            <FineRow fine={fine} appeal={appealForFine(appeals, fine.id)} />
          </Card>
        </FadeInItem>
      ))}
    </View>
  );
}
```

In `FineRow`, change the leading tile to the violation colour:

```tsx
      leading={<IconTile icon={VIOLATION_ICON[fine.violation.type]} color={theme[VIOLATION_COLOR[fine.violation.type]]} />}
```

Replace `styles` with:

```ts
const styles = StyleSheet.create({
  heroLabel: { opacity: 0.85 },
  heroSkeleton: { gap: Spacing.two },
  // Skeleton blocks on the blue hero: white at low opacity instead of grey.
  onHero: { backgroundColor: 'rgba(255, 255, 255, 0.25)' },
  skeleton: { gap: Spacing.three },
  stats: { flexDirection: 'row', gap: Spacing.three },
  flex: { flex: 1 },
  rowCard: { paddingVertical: 0 },
  section: { gap: Spacing.two },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
```

Update the imports:
- Remove `ScreenScroll`.
- Keep `Card`, `EmptyState`, `ScreenState`, `StatusBadge`, `IconTile`, `ListRow`,
  `Banner` and `ThemedText`.
- Add:

```tsx
import { FadeInItem } from '@/components/fade-in-item';
import { HeroAction, HeroChip, HeroScreen } from '@/components/hero-screen';
import { Skeleton } from '@/components/skeleton';
import { StatTile } from '@/components/stat-tile';
import { Radius, Spacing } from '@/constants/theme';
import { VIOLATION_COLOR, VIOLATION_ICON, VIOLATION_LABEL } from '@/constants/violations';
import { summarizeFines, type FineSummary } from '@/lib/fine-summary';
```

(The `Spacing`-only theme import and the `VIOLATION_ICON, VIOLATION_LABEL` import are
replaced by the lines above.)

- [ ] **Step 3: Verify**

Run: `cd mobile && npx tsc --noEmit && npx eslint .`
Expected: clean.

- If the React Compiler lint objects to the non-null assertion `summary!`, pass
  `summary` through a guard instead:
  `: summary ? <FinesContent … summary={summary} /> : null`.
  `summary` is non-null whenever `fines` is.
- If `Skeleton`'s `style` override doesn't beat its own `backgroundColor`, check the
  style order in `skeleton.tsx`: `style` is last in the array, so it wins.

---

### Task 6: Fine details: raised summary card, ghost Cancel, haptics

**Files:**
- Modify: `mobile/src/app/(app)/(tabs)/(fines)/fine/[id].tsx`

**Interfaces:**
- **Consumes:** `Card` `variant="raised"`, `Button` `variant="ghost"`, `IconTile`,
  `VIOLATION_COLOR`, `display`, `expo-haptics`.

- [ ] **Step 1: Summary card**

Replace the hero `View` (the block starting `<View style={styles.hero}>`, through its
closing `</View>`) with:

```tsx
      <Card variant="raised" style={styles.summary}>
        <IconTile
          icon={VIOLATION_ICON[fine.violation.type]}
          color={theme[VIOLATION_COLOR[fine.violation.type]]}
          size={56}
        />
        <ThemedText type="subtitle" style={styles.centered}>
          {label}
        </ThemedText>
        <ThemedText type="display" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {formatLkr(fine.amount)}
        </ThemedText>
        <StatusBadge testID="fine-detail-status" tone={badge.tone} icon={badge.icon} label={badge.label} />
      </Card>
```

In `styles`:
- Replace `hero: { alignItems: 'center', gap: Spacing.two },` with
  `summary: { alignItems: 'center', gap: Spacing.two, padding: Spacing.four },` and
  `centered: { textAlign: 'center' },`.
- Delete `tabular` if nothing else uses it (tsc and eslint won't flag an unused style
  key; check with grep).

Change the import to
`import { VIOLATION_COLOR, VIOLATION_ICON, VIOLATION_LABEL } from '@/constants/violations';`.

- [ ] **Step 2: Ghost Cancel buttons**

Change both
`<Button variant="secondary" onPress={() => setAction(null)} disabled={isSubmitting}>`
to `<Button variant="ghost" onPress={() => setAction(null)} disabled={isSubmitting}>`.
Leave the child `<ThemedText type="smallBold">Cancel</ThemedText>` as it is.

- [ ] **Step 3: Haptics at the commit moment**

Add `import * as Haptics from 'expo-haptics';`. In `run()`:

```ts
    try {
      const message = await task();
      // Same moment the success banner appears; one haptic per committed action.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAction(null);
      setResolved(true);
      setNotice(message);
      await onChanged();
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(extractErrorMessage(err));
    } finally {
```

(`notificationAsync` returns a promise that's intentionally not awaited: the feedback
must not delay the banner. It's a no-op on web and on devices with haptics off. The
validation error in `handleAppeal`, an empty reason, is not a committed action and gets
no haptic.)

- [ ] **Step 4: Verify**

Run: `cd mobile && npx tsc --noEmit && npx eslint .`
Expected: clean. If eslint's `@typescript-eslint/no-floating-promises` is enabled
and flags `notificationAsync`, prefix both calls with `void`.

---

### Task 7: Final verification, spec note, commit, phone check

**Files:**
- Modify: `docs/superpowers/specs/2026-09-28-ui-redesign-style-b-design.md` (Phase 2)

- [ ] **Step 1: All automated checks**

Run from `mobile/`:

```bash
TZ=Asia/Colombo node scripts/check-format.mjs && TZ=Asia/Colombo node scripts/check-fine-summary.mjs && \
npx tsc --noEmit && npx eslint . && git -C .. diff --stat HEAD~1 -- mobile/package.json
```

Expected: both checks pass, tsc and eslint are clean, and `package.json` shows only the
two new dependencies (from Task 1).

- [ ] **Step 2: Record the deviations in the spec**

At the end of the spec's "Phase 2: style-B design system" section, append:

```markdown
### As built in batch 1 (2026-09-29)

- No `surface` token: light `background` is the `#F4F6FA` canvas and light
  `backgroundElement` is `#FFFFFF`, so every card and tile floats white.
- Tone pairs weren't added; `tint()` from Phase 1 already derives soft backgrounds.
- Only `display` was added to typography; `title`/`subtitle` are retuned in the
  batches that restyle their screens.
- `PressableScale` has no ripple and no haptic prop (expo-animation skill: same scale
  on both platforms; haptics only at commit points). List rows keep an opacity
  highlight.
- The skeleton is used on the Fines list only so far; the segmented-control slide and
  badge-change animations move to batch 4.
- iOS large titles are off: the compact blue bar replaces them.
```

- [ ] **Step 3: Commit Tasks 4–7**

```bash
cd /data/iPermit && git add mobile docs/superpowers/specs/2026-09-28-ui-redesign-style-b-design.md \
  docs/superpowers/plans/2026-09-29-ui-style-b-batch-1.md && git commit -m "Redesign Fines on the style-B hero

The Fines list opens on a blue gradient hero with the outstanding
balance, an all-clear or unpaid chip and a Pay shortcut to the oldest
payable fine. Stat tiles show paid-this-year and fines-this-year (from a
Node-checked summarizeFines), rows use per-violation colours and fade in
on first load, and a skeleton replaces the spinner. Fine details get a
raised summary card, a ghost Cancel and success/error haptics."
```

- [ ] **Step 4: Phone check (user)**

Ask the user to reload in Expo Go (`npx expo start` must be restarted after the new
packages; Expo Go on SDK 57 includes both) and check:

1. **Fines:**
   - The blue hero sits under a light status bar.
   - Balance, chip and, if a fine is unpaid, "Pay fine" / "Pay oldest fine", which
     opens that fine.
   - Two white stat tiles.
   - Coloured violation tiles, and cards that fade up on first open.
   - Pull to refresh works.
2. **First load on a slow connection:** grey pulsing placeholders, not a spinner.
3. **A fine's details:**
   - Blue app bar with a white back arrow.
   - Raised white summary card.
   - Cancel is a text button.
   - Paying gives a short vibration with the success banner.
4. **Buttons** shrink slightly when pressed.
5. **The other tabs** (Home, Incidents, Alerts, Profile, and police Verify on a police
   account):
   - Blue app bar, white cards on light grey.
   - The Incidents "Report" button is white.
   - The selected segment is visible.
6. **Log out:** the login screen's status bar icons are dark again.
7. **Largest system font:** the balance and stat figures shrink to fit on one line.
8. **Reduce motion / remove animations on:** Fines appears without sliding, and the
   placeholders don't pulse.
9. **Dark mode:** a quick look; the hero is navy and everything is readable.

Batch 2 (driver Home, licence card, Profile) is planned after the user signs this off.
