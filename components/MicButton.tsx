import React, { useEffect } from 'react'
import { Pressable, StyleSheet, ActivityIndicator, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated'
import { ACCENT, ERROR } from '@/lib/theme'

interface MicButtonProps {
  state: 'idle' | 'recording' | 'processing'
  onPress: () => void
  onLongPress?: () => void
  onPressOut?: () => void
  color?: string
}

export default function MicButton({ state, onPress, onLongPress, onPressOut, color }: MicButtonProps) {
  const scale = useSharedValue(1)
  const pulseScale = useSharedValue(1)
  const pulseOpacity = useSharedValue(0.4)

  useEffect(() => {
    if (state === 'recording') {
      pulseScale.value = withRepeat(
        withTiming(1.4, { duration: 1200 }),
        -1,
        false
      )
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1200 }),
        -1,
        false
      )
    } else {
      pulseScale.value = 1
      pulseOpacity.value = 0
    }
  }, [state])

  const buttonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    }
  })

  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
      opacity: pulseOpacity.value,
    }
  })

  const handlePressIn = () => {
    scale.value = withSpring(0.92)
  }

  const handlePressOut = () => {
    scale.value = withSpring(1)
    if (onPressOut) onPressOut()
  }

  return (
    <View style={s.container}>
      {state === 'recording' && (
        <Animated.View style={[s.pulseRing, pulseStyle, { backgroundColor: color || ERROR }]} />
      )}
      <Animated.View style={[buttonStyle]}>
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            s.button,
            state === 'idle' && [s.buttonIdle, { backgroundColor: color || ACCENT }],
            state === 'recording' && [s.buttonRecording, { backgroundColor: color || ERROR }],
            state === 'processing' && s.buttonProcessing,
          ]}
        >
          {state === 'idle' && (
            <Ionicons name="mic-sharp" size={32} color="#FFFFFF" />
          )}
          {state === 'recording' && (
            <Ionicons name="square" size={24} color="#FFFFFF" style={s.stopIcon} />
          )}
          {state === 'processing' && (
            <ActivityIndicator size="large" color={color || ACCENT} />
          )}
        </Pressable>
      </Animated.View>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 120,
    height: 120,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonIdle: {
    // Primary light blue
  },
  buttonRecording: {
    // Red active state
  },
  buttonProcessing: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  stopIcon: {
    marginLeft: 0,
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ERROR,
    zIndex: -1,
  },
})
