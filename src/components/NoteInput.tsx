import React, {useRef} from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  useColorScheme,
} from 'react-native';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function NoteInput({value, onChangeText, placeholder}: Props): React.JSX.Element {
  const isDark = useColorScheme() === 'dark';
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={[styles.container, {backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF'}]}>
      <Text style={[styles.label, {color: isDark ? '#8E8E93' : '#6C6C70'}]}>NOTE</Text>
      <TextInput
        ref={inputRef}
        style={[styles.input, {color: isDark ? '#FFFFFF' : '#1C1C1E'}]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? 'Add a note… (optional)'}
        placeholderTextColor={isDark ? '#48484A' : '#C7C7CC'}
        multiline
        textAlignVertical="top"
        returnKeyType="default"
        autoCorrect
        autoCapitalize="sentences"
        accessibilityLabel="Note input"
        accessibilityHint="Optional annotation to add to the org entry"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C6C70',
    letterSpacing: 0.5,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  input: {
    fontSize: 15,
    color: '#1C1C1E',
    lineHeight: 22,
    paddingHorizontal: 14,
    paddingBottom: 14,
    minHeight: 80,
  },
});
