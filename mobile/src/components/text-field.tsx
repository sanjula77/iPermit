import { Ionicons } from '@expo/vector-icons';
import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

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
  // icon sits inside on the left and the label becomes the placeholder (still
  // announced to screen readers). Without one, the label sits above.
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
  const isPasswordField = secureTextEntry === true;
  const inset = icon !== undefined;
  const borderColor = error ? theme.danger : isFocused ? theme.primary : theme.textSecondary;

  return (
    <ThemedView style={styles.container}>
      {inset ? null : <ThemedText type="smallBold">{label}</ThemedText>}
      <View style={styles.inputWrapper}>
        {inset ? (
          <Ionicons
            name={icon}
            size={22}
            color={error ? theme.danger : isFocused ? theme.primary : theme.textSecondary}
            style={styles.leadingIcon}
            pointerEvents="none"
          />
        ) : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholder={inset ? (placeholder ?? label) : placeholder}
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
    minHeight: 56,
    borderRadius: Radius.medium,
    borderCurve: 'continuous',
    paddingLeft: Spacing.six - Spacing.two,
  },
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
