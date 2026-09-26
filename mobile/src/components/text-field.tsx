import { Ionicons } from '@expo/vector-icons';
import { useState, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  // Guidance shown below the input while there's no error.
  hint?: string;
  ref?: Ref<TextInput>;
}

export function TextField({ label, error, hint, ref, style, secureTextEntry, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [isRevealed, setIsRevealed] = useState(false);
  const isPasswordField = secureTextEntry === true;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={ref}
          style={[
            styles.input,
            isPasswordField && styles.inputWithToggle,
            { color: theme.text, borderColor: error ? theme.danger : theme.backgroundSelected },
            style,
          ]}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={isPasswordField && !isRevealed}
          {...rest}
        />
        {isPasswordField ? (
          <Pressable
            style={styles.toggleButton}
            onPress={() => setIsRevealed((v) => !v)}
            hitSlop={8}
            testID={rest.testID ? `${rest.testID}-toggle-visibility` : undefined}
          >
            <Ionicons
              name={isRevealed ? 'eye-off-outline' : 'eye-outline'}
              size={20}
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
  },
  inputWrapper: {
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  inputWithToggle: {
    paddingRight: Spacing.six,
  },
  toggleButton: {
    position: 'absolute',
    right: Spacing.three,
    padding: Spacing.half,
  },
});
