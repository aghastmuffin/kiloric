import { useTheme } from '@/lib/theme/ThemeContext'
import { memo } from 'react'
import { StyleSheet, View } from 'react-native'

/** Restrained ambient marks that keep large paper backgrounds from feeling clinical. */
export const NoiseOverlay = memo(function NoiseOverlay() {
  const { colors } = useTheme()

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={[styles.glow, { backgroundColor: colors.brandSoft }]} />
      <View style={[styles.orbit, { borderColor: colors.border }]} />
      <View style={[styles.rule, { backgroundColor: colors.border }]} />
      <View style={[styles.coordinate, { backgroundColor: colors.brand }]} />
    </View>
  )
})

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 440,
    height: 440,
    borderRadius: 220,
    top: -300,
    right: -190,
    opacity: 0.62,
    transform: [{ rotate: '-12deg' }],
  },
  orbit: {
    position: 'absolute',
    width: 620,
    height: 620,
    borderRadius: 310,
    borderWidth: StyleSheet.hairlineWidth,
    top: -430,
    right: -260,
    opacity: 0.28,
  },
  rule: {
    position: 'absolute',
    width: 1,
    top: 0,
    bottom: 0,
    left: '50%',
    opacity: 0.12,
  },
  coordinate: {
    position: 'absolute',
    width: 28,
    height: 2,
    top: 28,
    left: 28,
    opacity: 0.72,
  },
})
