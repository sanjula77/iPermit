import { Ionicons } from '@expo/vector-icons';
import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  // Guidance shown below the input while there's no error.
  hint?: string;
  // With an icon the field is the compact "inset" style (auth screens): the
  // icon sits inside on the left and the label floats -- inside the empty box,
  // then up onto the top border once the field is focused or filled. There,
  // `placeholder` (e.g. "At least 8 characters") shows only while focused.
  // Without an icon, the label sits above the box.
  icon?: keyof typeof Ionicons.glyphMap;
  ref?: Ref<TextInput>;
}

export function TextField({
  label,
  error,
  hint,
  icon,
  ref,
  style,
  secureTextEntry,
  placeholder,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const [isRevealed, setIsRevealed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const reduceMotion = useReducedMotion();
  const isPasswordField = secureTextEntry === true;
  const inset = icon !== undefined;
  const floated = isFocused || !!rest.value;
  const accent = error ? theme.danger : isFocused ? theme.primary : theme.textSecondary;
  const borderColor = error ? theme.danger : isFocused ? theme.primary : theme.textSecondary;

  return (
    <ThemedView style={styles.container}>
      {inset ? null : <ThemedText type="smallBold">{label}</ThemedText>}
      <View style={styles.inputWrapper}>
        {inset ? (
          <Ionicons
            name={icon}
            size={20}
            color={accent}
            style={styles.leadingIcon}
            pointerEvents="none"
          />
        ) : null}
        {inset ? (
          // The floating label: moves (transform only) from inside the box to
          // the top border. Its white backing masks the border line behind it.
          <Animated.Text
            pointerEvents="none"
            numberOfLines={1}
            style={[
              styles.floatingLabel,
              LABEL_MOTION,
              reduceMotion ? styles.instant : null,
              {
                color: accent,
                backgroundColor: theme.backgroundElement,
                transform: floated
                  ? [{ translateX: LABEL_FLOAT_X }, { translateY: LABEL_FLOAT_Y }, { scale: 0.8 }]
                  : [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
              },
            ]}
          >
            {label}
          </Animated.Text>
        ) : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholder={inset ? (isFocused ? placeholder : undefined) : placeholder}
          style={[
            styles.input,
            inset && styles.inputInset,
            isPasswordField && styles.inputWithToggle,
            // Filled white so the field stands out on the grey canvas.
            { color: theme.text, backgroundColor: theme.backgroundElement, borderColor },
            style,
          ]}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={isPasswordField && !isRevealed}
          {...rest}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
        />
        {isPasswordField ? (
          <Pressable
            style={styles.toggleButton}
            onPress={() => setIsRevealed((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={isRevealed ? 'Hide password' : 'Show password'}
            testID={rest.testID ? `${rest.testID}-toggle-visibility` : undefined}
          >
            <Ionicons
              name={isRevealed ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={theme.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <ThemedText type="small" themeColor="danger" selectable>
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

// Resting label: vertically centred in the 52dp box, after the icon. Floated:
// scaled to 80% from its top-left corner and moved onto the top border.
const LABEL_LEFT = Spacing.six - Spacing.two;
const LABEL_TOP = 16;
const LABEL_FLOAT_X = Spacing.three - Spacing.one - LABEL_LEFT;
const LABEL_FLOAT_Y = -LABEL_TOP - 8;

// Outside StyleSheet.create: RN's style types don't know Reanimated's cubicBezier.
const LABEL_MOTION = {
  transformOrigin: 'left top',
  transitionProperty: 'transform',
  transitionDuration: 150,
  transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
} as const;

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
    backgroundColor: 'transparent',
  },
  inputWrapper: {
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  inputInset: {
    // Smaller text inside the compact auth fields (typed text and placeholder).
    fontSize: 14,
    minHeight: 52,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    paddingLeft: Spacing.six - Spacing.two,
  },
  floatingLabel: {
    position: 'absolute',
    top: LABEL_TOP,
    left: LABEL_LEFT,
    zIndex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
    paddingHorizontal: Spacing.one,
  },
  instant: { transitionDuration: 0 },
  leadingIcon: {
    position: 'absolute',
    left: Spacing.three,
    zIndex: 1,
  },
  inputWithToggle: {
    paddingRight: Spacing.six,
  },
  toggleButton: {
    position: 'absolute',
    right: Spacing.one,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
