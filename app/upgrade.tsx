import React from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { BACKGROUND, TEXT_PRIMARY, TEXT_SECONDARY, ACCENT, BORDER } from '@/lib/theme'

export default function UpgradeScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={s.title}>Premium Features</Text>
      </View>

      <View style={s.content}>
        <Card style={s.card}>
          <View style={s.iconBadge}>
            <Ionicons name="sparkles" size={32} color={ACCENT} />
          </View>
          <Text style={s.cardTitle}>You're on the Pro Plan!</Text>
          <Text style={s.cardSubtitle}>
            All features, including advanced transcription engines (Groq, Deepgram, OpenAI Whisper), AI Cleanup, custom vocabulary, and offline fallback, are fully unlocked for you.
          </Text>
        </Card>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  backBtn: {
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    padding: 24,
    alignItems: 'center',
    width: '100%',
    borderColor: BORDER,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(96,165,250,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 13.5,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    textAlign: 'center',
  },
})
