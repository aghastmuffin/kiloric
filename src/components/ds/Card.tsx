import { radii, usePalette } from '@/lib/theme/palette'
import type { ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

type CardProps = {
  tone?: 'card' | 'peach' | 'mint' | 'rest'
  padded?: boolean
  style?: StyleProp<ViewStyle>
  children: ReactNode
  testID?: string
}

export function Card({ tone = 'card', padded = true, style, children, testID }: CardProps) {
  const c = usePalette()
  const background = tone === 'peach' ? c.peach : tone === 'mint' ? c.mint : tone === 'rest' ? c.restBg : c.card
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        { backgroundColor: background, shadowColor: c.shadow },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 1,
  },
  padded: { padding: 20 },
})
