import React from 'react'
import { StyleSheet, Pressable, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { DictationSession } from '@/hooks/useDictationHistory'
import { ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, WARNING } from '@/lib/theme'

interface TranscriptionCardProps {
  session: DictationSession
  onPress: () => void
  onStar: () => void
  onDelete?: () => void
}

export default function TranscriptionCard({ session, onPress, onStar, onDelete }: TranscriptionCardProps) {
  const dateStr = new Date(session.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Get preview text from cleaned or raw
  const previewText = session.cleaned_text || session.raw_text || ''

  return (
    <Pressable onPress={onPress}>
      <Card style={s.card}>
        <View style={s.accentBorder} />
        <View style={s.content}>
          <View style={s.header}>
            <Text style={s.title} numberOfLines={1}>
              {session.title || 'Untitled Dictation'}
            </Text>
            <Pressable onPress={onStar} hitSlop={8} style={s.starBtn}>
              <Ionicons
                name={session.is_starred ? 'star' : 'star-outline'}
                size={18}
                color={session.is_starred ? WARNING : TEXT_SECONDARY}
              />
            </Pressable>
          </View>

          <Text style={s.preview} numberOfLines={2}>
            {previewText}
          </Text>

          <View style={s.footer}>
            <Text style={s.date}>{dateStr}</Text>
            <View style={s.badge}>
              <Text style={s.badgeText}>{session.provider || 'On-device'}</Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  )
}

const s = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 12,
  },
  accentBorder: {
    width: 4,
    backgroundColor: ACCENT,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    flex: 1,
    marginRight: 8,
  },
  starBtn: {
    padding: 2,
  },
  preview: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 18,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  date: {
    fontSize: 11,
    color: TEXT_SECONDARY,
  },
  badge: {
    backgroundColor: 'rgba(96,165,250,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: ACCENT,
  },
})
