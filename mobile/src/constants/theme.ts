/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    // Cards and tiles (backgroundElement) float white on a cool-grey canvas.
    background: '#F4F6FA',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    // 5.7:1 on white; the old #208AEF was 3.5:1, below AA for 14sp text.
    primary: '#1565C0',
    success: '#12805c',
    warning: '#b54708',
    danger: '#d92d20',
    onPrimary: '#ffffff',
    // Style-B brand: gradient hero and blue app bar. White text passes AA on all three.
    brandDeep: '#0B3D91',
    brand: '#1565C0',
    brandBright: '#3B8CF0',
    onBrand: '#ffffff',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    primary: '#4DA3F5',
    success: '#3dd68c',
    warning: '#f79009',
    danger: '#f04438',
    onPrimary: '#ffffff',
    brandDeep: '#061E4A',
    brand: '#0B3D91',
    brandBright: '#1552B0',
    onBrand: '#ffffff',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: Spacing.two, // 8 -- chips, inputs, small controls
  medium: Spacing.three, // 16 -- cards, buttons
  large: 22, // hero sheet corners
} as const;

export const Shadows = {
  card: '0 2px 10px rgba(15, 40, 90, 0.08)',
  raised: '0 8px 24px rgba(11, 61, 145, 0.18)',
} as const;

export const MaxContentWidth = 800;

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
