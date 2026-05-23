import React, { useRef, useState, useCallback } from 'react'
import { StyleSheet, Pressable, View, Animated, PanResponder, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Card } from '@/components/ui/Card'
import { Text } from '@/components/ui/Text'
import { DictationSession } from '@/hooks/useDictationHistory'
import { ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, WARNING, ERROR, SUCCESS } from '@/lib/theme'

interface TranscriptionCardProps {
  session: DictationSession
  onPress: () => void
  onStar: () => void
  onDelete?: () => void
}

const SCREEN_WIDTH = Dimensions.get('window').width
const SWIPE_THRESHOLD = 60
const CONFIRM_SPACE = -100 // Visual stop position for delete confirm

export default function TranscriptionCard({ session, onPress, onStar, onDelete }: TranscriptionCardProps) {
  const translateX = useRef(new Animated.Value(0)).current
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false)
  const currentTranslation = useRef(0)
  const startX = useRef(0)
  const isSwiping = useRef(false)

  // Track the actual current value
  React.useEffect(() => {
    const id = translateX.addListener(({ value }) => {
      currentTranslation.current = value
    })
    return () => translateX.removeListener(id)
  }, [])

  const snapBack = useCallback(() => {
    setIsDeleteConfirmVisible(false)
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 5,
      speed: 14,
    }).start()
  }, [translateX])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        // Require clear horizontal intent
        if (Math.abs(gs.dx) > 8 && Math.abs(gs.dy) < 10) {
          isSwiping.current = true
          return true
        }
        return false
      },
      onPanResponderGrant: () => {
        startX.current = currentTranslation.current
      },
      onPanResponderMove: (_, gs) => {
        const raw = startX.current + gs.dx

        // Apply friction at extremes
        let targetX = raw
        if (raw < CONFIRM_SPACE - 20) {
          targetX = CONFIRM_SPACE - 20 + (raw - (CONFIRM_SPACE - 20)) * 0.2
        } else if (raw > SWIPE_THRESHOLD + 30) {
          targetX = SWIPE_THRESHOLD + 30 + (raw - (SWIPE_THRESHOLD + 30)) * 0.2
        }

        translateX.setValue(targetX)
      },
      onPanResponderRelease: (_, gs) => {
        isSwiping.current = false
        const pos = currentTranslation.current

        if (pos < -45) {
          // Swiped left → show delete confirm
          setIsDeleteConfirmVisible(true)
          Animated.spring(translateX, {
            toValue: CONFIRM_SPACE,
            useNativeDriver: true,
            bounciness: 3,
            speed: 14,
          }).start()
        } else if (pos > SWIPE_THRESHOLD) {
          // Swiped right → toggle star and snap back
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 5,
            speed: 14,
          }).start(() => {
            onStar()
          })
        } else {
          // Snap back to center
          setIsDeleteConfirmVisible(false)
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 5,
            speed: 14,
          }).start()
        }
      },
    })
  ).current

  const handleConfirmDelete = useCallback(() => {
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setIsDeleteConfirmVisible(false)
      if (onDelete) onDelete()
    })
  }, [onDelete, translateX])

  const dateStr = new Date(session.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const previewText = session.cleaned_text || session.raw_text || ''

  // Underlay colors
  const starUnderlayColor = session.is_starred ? '#F97316' : '#10B981'

  // Opacity interpolations — hide underlays at rest
  const leftOpacity = translateX.interpolate({
    inputRange: [-100, -15, 0],
    outputRange: [1, 0.8, 0],
    extrapolate: 'clamp',
  })

  const rightOpacity = translateX.interpolate({
    inputRange: [0, 15, 60],
    outputRange: [0, 0.8, 1],
    extrapolate: 'clamp',
  })

  // Scale the star icon for visual delight
  const starScale = translateX.interpolate({
    inputRange: [0, 40, 80],
    outputRange: [0.6, 1, 1.15],
    extrapolate: 'clamp',
  })

  // Scale the delete icon
  const deleteScale = translateX.interpolate({
    inputRange: [-100, -50, 0],
    outputRange: [1.1, 1, 0.6],
    extrapolate: 'clamp',
  })

  return (
    <View style={s.container}>
      {/* Background Actions Underlay */}
      <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden', borderRadius: 12 }]}>
        {/* Left swipe underlay (Delete) */}
        <Animated.View style={[s.underlay, s.underlayLeft, { opacity: leftOpacity }]}>
          <Animated.View style={[s.underlayActionContentLeft, { transform: [{ scale: deleteScale }] }]}>
            <Ionicons name="trash" size={20} color="#FFFFFF" />
            <Text style={s.underlayText}>{isDeleteConfirmVisible ? 'Confirm' : 'Delete'}</Text>
          </Animated.View>
        </Animated.View>

        {/* Right swipe underlay (Star/Unstar) */}
        <Animated.View style={[s.underlay, s.underlayRight, { backgroundColor: starUnderlayColor, opacity: rightOpacity }]}>
          <Animated.View style={[s.underlayActionContentRight, { transform: [{ scale: starScale }] }]}>
            <Ionicons name={session.is_starred ? 'star-outline' : 'star'} size={20} color="#FFFFFF" />
            <Text style={s.underlayText}>{session.is_starred ? 'Unstar' : 'Star'}</Text>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Swipeable Foreground Card */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <Pressable
          onPress={() => {
            if (isDeleteConfirmVisible) {
              // If delete confirm is showing, tap should either confirm or cancel
              // We'll treat tap on card as cancel — swipe-back
              snapBack()
            } else {
              onPress()
            }
          }}
        >
          <Card style={s.card}>
            <View style={[s.accentBorder, session.is_starred && { backgroundColor: '#F59E0B' }]} />
            <View style={s.content}>
              <View style={s.header}>
                <Text style={s.title} numberOfLines={1}>
                  {session.title || 'Untitled Dictation'}
                </Text>
                <Pressable onPress={onStar} hitSlop={8} style={s.starBtn}>
                  <Ionicons
                    name={session.is_starred ? 'star' : 'star-outline'}
                    size={16}
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

      {/* Floating Confirm Delete Button — only when swiped open */}
      {isDeleteConfirmVisible && (
        <View style={s.confirmOverlay}>
          <Pressable onPress={snapBack} style={s.confirmCancelZone} />
          <Pressable
            onPress={handleConfirmDelete}
            style={s.confirmDeleteBtn}
          >
            <Ionicons name="trash" size={18} color="#FFFFFF" />
            <Text style={s.confirmDeleteText}>Delete</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'visible',
  },
  card: {
    padding: 0,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  accentBorder: {
    width: 4,
    backgroundColor: ACCENT,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    flex: 1,
    marginRight: 6,
  },
  starBtn: {
    padding: 2,
  },
  preview: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    lineHeight: 16,
    marginBottom: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  date: {
    fontSize: 10.5,
    color: TEXT_SECONDARY,
  },
  badge: {
    backgroundColor: 'rgba(96,165,250,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9.5,
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
    right: 0,
    backgroundColor: '#EF4444',
    alignItems: 'flex-end',
  },
  underlayRight: {
    left: 0,
    alignItems: 'flex-start',
  },
  underlayActionContentLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 20,
    gap: 2,
  },
  underlayActionContentRight: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 20,
    gap: 2,
  },
  underlayText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10.5,
  },
  // Floating confirm button overlay
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 10,
  },
  confirmCancelZone: {
    flex: 1,
  },
  confirmDeleteBtn: {
    width: 100,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
})
