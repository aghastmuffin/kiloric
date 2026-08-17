import { useTheme } from '@/lib/theme/ThemeContext'
import { memo } from 'react'
import { StyleSheet, View } from 'react-native'

/**
 * Full-screen noise overlay for the paper aesthetic.
 * Uses a subtle opacity pulse on the paper background color to simulate grain.
 */
export const NoiseOverlay = memo(function NoiseOverlay() {
  const { colors } = useTheme()

  return (
    <View
      pointerEvents="none"
      style={[
        styles.overlay,
        {
          backgroundColor: colors.background,
          opacity: 0.03,
        },
      ]}
    />
  )
})

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
})