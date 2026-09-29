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
