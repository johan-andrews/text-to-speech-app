import React, { useRef, useState } from 'react'
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

  // Track the actual current value to help with multi-stage gestures
  translateX.addListener(({ value }) => {
    currentTranslation.current = value
  })

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Fast horizontal swipe detection
        return Math.abs(gestureState.dx) > 6 && Math.abs(gestureState.dy) < 6
      },
      onPanResponderGrant: () => {
        // Record starting position of this gesture segment
        startX.current = currentTranslation.current
      },
      onPanResponderMove: (_, gestureState) => {
        const totalTranslation = startX.current + gestureState.dx

        // Clamp values and add smooth friction beyond threshold limits
        let targetX = totalTranslation
        if (totalTranslation < CONFIRM_SPACE - 20) {
          // Friction dragging past delete button (-120px)
          targetX = CONFIRM_SPACE - 20 + (totalTranslation - (CONFIRM_SPACE - 20)) * 0.25
        } else if (totalTranslation > SWIPE_THRESHOLD + 20) {
          // Friction dragging past star swipe threshold (+80px)
          targetX = SWIPE_THRESHOLD + 20 + (totalTranslation - (SWIPE_THRESHOLD + 20)) * 0.25
        }

        translateX.setValue(targetX)
      },
      onPanResponderRelease: (_, gestureState) => {
        const finalDx = currentTranslation.current

        if (finalDx < -45) {
          // Swiped left -> Snap to delete confirm stop
          setIsDeleteConfirmVisible(true)
          Animated.spring(translateX, {
            toValue: CONFIRM_SPACE,
            useNativeDriver: true,
            bounciness: 4,
            speed: 12,
          }).start()
        } else if (finalDx > SWIPE_THRESHOLD) {
          // Swiped right -> Star/Unstar triggers and snap back to center
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
            speed: 12,
          }).start(() => {
            onStar()
          })
        } else {
          // Snap back to 0
          setIsDeleteConfirmVisible(false)
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
            speed: 12,
          }).start()
        }
      },
    })
  ).current

  const handleConfirmDelete = () => {
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setIsDeleteConfirmVisible(false)
      if (onDelete) onDelete()
    })
  }

  const dateStr = new Date(session.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const previewText = session.cleaned_text || session.raw_text || ''

  // Dynamic right side underlay color (Star is Green, Unstar is Orange)
  const starUnderlayColor = session.is_starred ? '#F97316' : '#22C55E'

  // Interpolations for background action underlays to prevent idle bleed-through
  const leftOpacity = translateX.interpolate({
    inputRange: [-100, -20, 0],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  })

  const rightOpacity = translateX.interpolate({
    inputRange: [0, 20, 60],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  })

  return (
    <View style={s.container}>
      {/* Background Actions Underlay */}
      <View style={StyleSheet.absoluteFillObject}>
        {/* Left swipe underlay (Delete action on swipe left) */}
        <Animated.View 
          style={[s.underlay, s.underlayLeft, { opacity: leftOpacity }]}
          pointerEvents={isDeleteConfirmVisible ? 'auto' : 'none'}
        >
          {/* Cancel zone on the left */}
          <Pressable 
            onPress={() => {
              setIsDeleteConfirmVisible(false)
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 4,
                speed: 12,
              }).start()
            }}
            style={s.underlayCancelZone} 
          />
          {/* Confirm delete button on the right */}
          <Pressable onPress={handleConfirmDelete} style={s.deleteConfirmBtn}>
            <View style={s.underlayActionContentLeft}>
              <Ionicons name="trash" size={18} color="#FFFFFF" />
              <Text style={s.underlayText}>Confirm</Text>
            </View>
          </Pressable>
        </Animated.View>

        {/* Right swipe underlay (Star/Unstar action on swipe right) */}
        <Animated.View style={[s.underlay, s.underlayRight, { backgroundColor: starUnderlayColor, opacity: rightOpacity }]}>
          <View style={s.underlayActionContentRight}>
            <Ionicons name={session.is_starred ? 'star-outline' : 'star'} size={18} color="#FFFFFF" />
            <Text style={s.underlayText}>{session.is_starred ? 'Unstar' : 'Star'}</Text>
          </View>
        </Animated.View>
      </View>

      {/* Swipeable Foreground Card */}
      <Animated.View
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
        pointerEvents={isDeleteConfirmVisible ? 'none' : 'auto'}
      >
        <Pressable 
          onPress={() => {
            if (isDeleteConfirmVisible) {
              // Tap to cancel/close confirm
              setIsDeleteConfirmVisible(false)
              Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start()
            } else {
              onPress()
            }
          }}
        >
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
                    size={15}
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
    marginBottom: 8,
    borderRadius: 8,
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
    width: 3,
    backgroundColor: ACCENT,
  },
  content: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    flex: 1,
    marginRight: 6,
  },
  starBtn: {
    padding: 1,
  },
  preview: {
    fontSize: 11.5,
    color: TEXT_SECONDARY,
    lineHeight: 15,
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  date: {
    fontSize: 10,
    color: TEXT_SECONDARY,
  },
  badge: {
    backgroundColor: 'rgba(96,165,250,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: ACCENT,
  },
  underlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '100%',
    justifyContent: 'center',
    borderRadius: 8,
  },
  underlayLeft: {
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: ERROR,
  },
  underlayRight: {
    left: 0,
    alignItems: 'flex-start',
  },
  deleteConfirmBtn: {
    width: 100,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ERROR,
  },
  underlayActionContentLeft: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  underlayActionContentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    gap: 4,
  },
  underlayText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  underlayCancelZone: {
    flex: 1,
    height: '100%',
    backgroundColor: 'transparent',
  },
})
