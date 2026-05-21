import React, { useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { AlertModal } from '@/components/ui/AppModal'
import { SURFACE2, ACCENT, WARNING } from '@/lib/theme'

interface ProviderBadgeProps {
  provider: string
  durationMs?: number
  warnings?: string[]
}

export default function ProviderBadge({ provider, durationMs, warnings = [] }: ProviderBadgeProps) {
  const [showWarnings, setShowWarnings] = useState(false)

  const hasWarnings = warnings.length > 0

  return (
    <View style={s.container}>
      <Pressable
        onPress={() => hasWarnings && setShowWarnings(true)}
        style={[s.badge, { backgroundColor: SURFACE2 }]}
      >
        <Text style={[s.badgeText, { color: '#1D4ED8' }]}>
          {provider}
          {durationMs !== undefined && ` · ${durationMs}ms`}
        </Text>
        {hasWarnings && (
          <Ionicons
            name="warning"
            size={14}
            color={WARNING}
            style={s.warningIcon}
          />
        )}
      </Pressable>

      <AlertModal
        visible={showWarnings}
        title="Orchestration Details"
        message={`Some fallbacks were triggered during transcription:\n\n${warnings.map((w, idx) => `${idx + 1}. ${w}`).join('\n')}`}
        buttons={[{ text: 'Dismiss', onPress: () => setShowWarnings(false) }]}
        onDismiss={() => setShowWarnings(false)}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    alignSelf: 'center',
    marginVertical: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  warningIcon: {
    marginLeft: 6,
  },
})
