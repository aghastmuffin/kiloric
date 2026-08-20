import { MotionView } from '@/components/MotionView'
import type { ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

type AppScreenHeaderProps = {
  overline: string
  title: string
  description: string
  accessory?: ReactNode
}

/** A consistent orientation point for every primary workflow. */
export function AppScreenHeader({ overline, title, description, accessory }: AppScreenHeaderProps) {
  const styles = useThemedStyles(makeStyles)

  return (
    <MotionView
      from={{ opacity: 0, translateY: -8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 240 }}
      style={styles.root}
    >
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      <Text style={styles.overline}>{overline}</Text>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </MotionView>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { gap: 4 },
  accessory: { marginBottom: 5, alignSelf: 'flex-start' },
  overline: { ...typography.labelSmall, color: colors.brand, fontWeight: '600' },
  title: { ...typography.headlineLarge, color: colors.text },
  description: { ...typography.bodySmall, color: colors.textMuted, maxWidth: 520 },
})
