import React, { useRef } from 'react'
import { StyleSheet, Pressable, View, Animated, PanResponder, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { DictationSession } from '@/hooks/useDictationHistory'
import { ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, WARNING, ERROR } from '@/lib/theme'

interface TranscriptionCardProps {
  session: DictationSession
  onPress: () => void
  onStar: () => void
  onDelete?: () => void
}

const SCREEN_WIDTH = Dimensions.get('window').width
const SWIPE_THRESHOLD = 80

export default function TranscriptionCard({ session, onPress, onStar, onDelete }: TranscriptionCardProps) {
  const translateX = useRef(new Animated.Value(0)).current

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Set pan responder only for horizontal swipe
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 8
      },
      onPanResponderMove: (_, gestureState) => {
        translateX.setValue(gestureState.dx)
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left -> Star toggle
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 5,
          }).start()
          onStar()
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe right -> Delete
          Animated.timing(translateX, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            if (onDelete) {
              onDelete()
            } else {
              // Fallback reset if onDelete not provided
              translateX.setValue(0)
            }
          })
        } else {
          // Reset position
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 5,
          }).start()
        }
      },
    })
  ).current

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
    <View style={s.container}>
      {/* Background Actions Underlay */}
      <View style={StyleSheet.absoluteFillObject}>
        {/* Left swipe underlay (Delete action on swipe right) */}
        <View style={[s.underlay, s.underlayLeft]}>
          <View style={s.underlayActionContentLeft}>
            <Ionicons name="trash" size={22} color="#FFFFFF" />
            <Text style={s.underlayText}>Delete</Text>
          </View>
        </View>

        {/* Right swipe underlay (Star action on swipe left) */}
        <View style={[s.underlay, s.underlayRight]}>
          <View style={s.underlayActionContentRight}>
            <Ionicons name={session.is_starred ? 'star-dislike' : 'star'} size={22} color="#FFFFFF" />
            <Text style={s.underlayText}>{session.is_starred ? 'Unstar' : 'Star'}</Text>
          </View>
        </View>
      </View>

      {/* Swipeable Foreground Card */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
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
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  card: {
    padding: 0,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 0,
    backgroundColor: '#FFFFFF',
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
  underlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
    justifyContent: 'center',
    borderRadius: 12,
  },
  underlayLeft: {
    left: 0,
    backgroundColor: ERROR,
    alignItems: 'flex-start',
  },
  underlayRight: {
    right: 0,
    backgroundColor: WARNING,
    alignItems: 'flex-end',
  },
  underlayActionContentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    gap: 6,
  },
  underlayActionContentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 20,
    gap: 6,
  },
  underlayText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
})
