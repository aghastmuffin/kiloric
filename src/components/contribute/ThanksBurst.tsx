import { usePalette } from '@/lib/theme/palette'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'

const PIECES = 28
const BURST_MS = 1500

type Piece = { angle: number; distance: number; size: number; spin: number; color: string; round: boolean; drift: number }

function seeded(index: number): number {
  const x = Math.sin(index * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function ConfettiPiece({ piece, progress }: { piece: Piece; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const t = progress.value
    const x = Math.cos(piece.angle) * piece.distance * t + piece.drift * t * t
    const y = Math.sin(piece.angle) * piece.distance * t + 140 * t * t
    return {
      opacity: t < 0.05 ? t * 20 : 1 - Math.max(0, (t - 0.65) / 0.35),
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${piece.spin * t}deg` }],
    }
  })
  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: piece.size,
          height: piece.round ? piece.size : piece.size * 0.45,
          borderRadius: piece.round ? piece.size / 2 : 2,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  )
}

/** Checkmark that springs in over a one-shot confetti burst. */
export function ThanksBurst({ size = 112 }: { size?: number }) {
  const c = usePalette()
  const reduceMotion = useReducedMotion()
  const progress = useSharedValue(0)
  const pop = useSharedValue(reduceMotion ? 1 : 0)
  const ring = useSharedValue(0)

  const pieces = useMemo<Piece[]>(() => {
    const colors = [c.primary, c.mintStrong, c.carbs, c.fat, c.protein, c.peachInk]
    return Array.from({ length: PIECES }, (_, index) => ({
      angle: -Math.PI / 2 + (seeded(index) - 0.5) * Math.PI * 1.7,
      distance: 90 + seeded(index + 40) * 110,
      size: 7 + seeded(index + 80) * 7,
      spin: (seeded(index + 120) - 0.5) * 900,
      color: colors[index % colors.length],
      round: index % 3 === 0,
      drift: (seeded(index + 160) - 0.5) * 60,
    }))
  }, [c])

  useEffect(() => {
    if (reduceMotion) return
    pop.value = withSequence(withTiming(0, { duration: 60 }), withSpring(1, { damping: 9, stiffness: 160 }))
    ring.value = withDelay(120, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }))
    progress.value = withDelay(140, withTiming(1, { duration: BURST_MS, easing: Easing.out(Easing.quad) }))
  }, [pop, progress, reduceMotion, ring])

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }))
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - ring.value),
    transform: [{ scale: 0.8 + ring.value * 1.1 }],
  }))

  return (
    <View style={[styles.stage, { width: size * 3, height: size * 2.4 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {reduceMotion ? null : (
        <View style={styles.origin}>
          {pieces.map((piece, index) => (
            <ConfettiPiece key={index} piece={piece} progress={progress} />
          ))}
        </View>
      )}
      <Animated.View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: c.primary }, ringStyle]} />
      <Animated.View
        testID="thanks-check"
        style={[styles.check, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.primary }, checkStyle]}
      >
        <Ionicons name="checkmark" size={Math.round(size * 0.56)} color={c.onPrimary} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  origin: { position: 'absolute', top: '50%', left: '50%', width: 0, height: 0 },
  piece: { position: 'absolute' },
  ring: { position: 'absolute', borderWidth: 6 },
  check: { alignItems: 'center', justifyContent: 'center' },
})
