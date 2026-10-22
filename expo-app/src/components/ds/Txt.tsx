import { fonts, usePalette } from '@/lib/theme/palette'
import type { ReactNode } from 'react'
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native'

export type TxtVariant =
  | 'hero'
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'metric'

type TxtProps = {
  variant?: TxtVariant
  color?: string
  tone?: 'ink' | 'muted' | 'faint' | 'primary'
  align?: TextStyle['textAlign']
  numberOfLines?: number
  style?: StyleProp<TextStyle>
  children: ReactNode
  accessibilityRole?: 'header' | 'text'
}

export function Txt({ variant = 'body', color, tone = 'ink', align, numberOfLines, style, children, accessibilityRole }: TxtProps) {
  const c = usePalette()
  const toneColor = tone === 'muted' ? c.inkMuted : tone === 'faint' ? c.inkFaint : tone === 'primary' ? c.primary : c.ink
  return (
    <Text
      accessibilityRole={accessibilityRole ?? (variant === 'display' || variant === 'title' ? 'header' : undefined)}
      numberOfLines={numberOfLines}
      style={[styles[variant], { color: color ?? toneColor }, align ? { textAlign: align } : null, style]}
    >
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  hero: { fontFamily: fonts.heavy, fontSize: 52, lineHeight: 56, letterSpacing: -1.6 },
  display: { fontFamily: fonts.heavy, fontSize: 32, lineHeight: 38, letterSpacing: -0.9 },
  title: { fontFamily: fonts.heavy, fontSize: 26, lineHeight: 32, letterSpacing: -0.6 },
  heading: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 25, letterSpacing: -0.3 },
  subheading: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, letterSpacing: -0.15 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17 },
  metric: { fontFamily: fonts.heavy, fontSize: 22, lineHeight: 27, letterSpacing: -0.4 },
})
