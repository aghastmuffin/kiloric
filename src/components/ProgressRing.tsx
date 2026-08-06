import { useTheme } from '@/lib/theme/ThemeContext'
import { panelTiming, celebrationSpring } from '@/lib/motion'
import { useEffect, useRef } from 'react'
import { Platform, StyleSheet, Text } from 'react-native'
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated'
import Svg, { Circle, G as NativeG } from 'react-native-svg'

const G = Platform.OS === 'web' ? 'g' : NativeG
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

type Props = {
  value: number
  max: number
  label: string
  unit?: string
  size?: number
  /** Stroke color override; defaults to the theme accent, success when full. */
  color?: string
}

export function ProgressRing({ value, max, label, unit = '', size = 176, color }: Props) {
  const { colors } = useTheme()
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0
  const complete = progress >= 1
  const stroke = color ?? (complete ? colors.success : colors.accent)

  const animatedProgress = useSharedValue(0)
  const scaleValue = useSharedValue(1)
  const shadowOpacityValue = useSharedValue(0)

  const prevComplete = useRef(complete)

  useEffect(() => {
    animatedProgress.value = withTiming(progress, panelTiming)
  }, [progress, animatedProgress])

  useEffect(() => {
    if (complete && !prevComplete.current) {
      // Satisfying completion pulse!
      scaleValue.value = withSpring(1.08, celebrationSpring, (finished) => {
        if (finished) {
          scaleValue.value = withSpring(1, celebrationSpring)
        }
      })
      shadowOpacityValue.value = withTiming(0.6, { duration: 300 }, (finished) => {
        if (finished) {
          shadowOpacityValue.value = withTiming(0, { duration: 500 })
        }
      })
    }
    prevComplete.current = complete
  }, [complete, scaleValue, shadowOpacityValue])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }))

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
    shadowOpacity: shadowOpacityValue.value,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
  }))

  return (
    <Animated.View
      style={[styles.root, { width: size, height: size }, containerAnimatedStyle]}
      accessibilityLabel={`${label}: ${Math.round(value)} of ${Math.round(max)} ${unit}`}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={colors.border}
          strokeWidth={strokeWidth}
        />
        <G
          {...(Platform.OS === 'web'
            ? { transform: `rotate(-90 ${size / 2} ${size / 2})` }
            : { rotation: -90, originX: size / 2, originY: size / 2 })}
        >
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={animatedProps}
          />
        </G>
      </Svg>
      <Text style={[styles.value, { color: colors.text }]}>{Math.round(value)}</Text>
      <Text style={[styles.label, { color: colors.textMuted }]}>
        {label} {unit}
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  label: { fontSize: 13, marginTop: 2, fontWeight: '600' },
})
