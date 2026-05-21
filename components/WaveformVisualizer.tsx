import React, { useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import Svg, { Rect } from 'react-native-svg'
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated'
import { ACCENT } from '@/lib/theme'

// Wrap Svg Rect with animated capability
const AnimatedRect = Animated.createAnimatedComponent(Rect)

interface AnimatedBarProps {
  index: number
  isRecording: boolean
  color: string
  barWidth: number
  gap: number
  maxHeight: number
}

function AnimatedBar({ index, isRecording, color, barWidth, gap, maxHeight }: AnimatedBarProps) {
  const height = useSharedValue(4)

  useEffect(() => {
    if (isRecording) {
      // Stagger the bars using delay
      const delay = index * 80
      height.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(maxHeight * 0.2 + Math.random() * (maxHeight * 0.8), { duration: 250 }),
            withTiming(4 + Math.random() * (maxHeight * 0.3), { duration: 250 })
          ),
          -1,
          true
        )
      )
    } else {
      height.value = withTiming(4, { duration: 300 })
    }
  }, [isRecording, index, maxHeight])

  const x = index * (barWidth + gap)

  const animatedProps = useAnimatedProps(() => {
    const barHeight = height.value
    const y = (maxHeight - barHeight) / 2
    return {
      height: barHeight,
      y: y,
    }
  })

  return (
    <AnimatedRect
      x={x}
      width={barWidth}
      rx={2}
      ry={2}
      fill={color}
      animatedProps={animatedProps}
    />
  )
}

interface WaveformVisualizerProps {
  isRecording: boolean
  barCount?: number
  color?: string
  height?: number
}

export default function WaveformVisualizer({
  isRecording,
  barCount = 12,
  color = ACCENT,
  height = 60,
}: WaveformVisualizerProps) {
  const barWidth = 4
  const gap = 3
  const svgWidth = barCount * (barWidth + gap) - gap

  return (
    <View style={s.container}>
      <Svg width={svgWidth} height={height} viewBox={`0 0 ${svgWidth} ${height}`}>
        {Array.from({ length: barCount }).map((_, i) => (
          <AnimatedBar
            key={i}
            index={i}
            isRecording={isRecording}
            color={color}
            barWidth={barWidth}
            gap={gap}
            maxHeight={height}
          />
        ))}
      </Svg>
    </View>
  )
}

const s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    minHeight: 80,
  },
})
