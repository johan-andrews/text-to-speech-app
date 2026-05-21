import React, { useState } from 'react'
import { View, StyleSheet, Pressable, TextInput, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, SUCCESS, ERROR, BORDER } from '@/lib/theme'

interface ApiKeyInputProps {
  label: string
  value: string
  onChangeText: (text: string) => void
  onTest: () => void
  testState: 'idle' | 'testing' | 'pass' | 'fail'
  placeholder?: string
}

export default function ApiKeyInput({
  label,
  value,
  onChangeText,
  onTest,
  testState,
  placeholder = 'Enter API key',
}: ApiKeyInputProps) {
  const [secureTextEntry, setSecureTextEntry] = useState(true)

  return (
    <View style={s.container}>
      <Text style={s.label}>{label}</Text>
      <View style={s.inputContainer}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          style={s.input}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {value.length > 0 && (
          <Pressable
            onPress={() => setSecureTextEntry(!secureTextEntry)}
            style={s.iconButton}
            hitSlop={8}
          >
            <Ionicons
              name={secureTextEntry ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={TEXT_SECONDARY}
            />
          </Pressable>
        )}

        <Pressable
          onPress={onTest}
          disabled={testState === 'testing' || !value}
          style={[
            s.testButton,
            { backgroundColor: value ? 'rgba(96,165,250,0.1)' : 'rgba(148,163,184,0.05)' },
          ]}
        >
          {testState === 'testing' ? (
            <ActivityIndicator size="small" color={ACCENT} />
          ) : testState === 'pass' ? (
            <Ionicons name="checkmark-circle" size={18} color={SUCCESS} />
          ) : testState === 'fail' ? (
            <Ionicons name="close-circle" size={18} color={ERROR} />
          ) : (
            <Text style={[s.testButtonText, { color: value ? ACCENT : '#94A3B8' }]}>Test</Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    height: '100%',
    color: TEXT_PRIMARY,
    fontSize: 14,
    paddingRight: 8,
  },
  iconButton: {
    padding: 6,
    marginRight: 4,
  },
  testButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
    height: 32,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
})
