import type { ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'

type AppScreenHeaderProps = {
  overline?: string
  title: string
  description: string
  accessory?: ReactNode
}

/** A consistent orientation point for every primary workflow. */
export function AppScreenHeader({ overline, title, description, accessory }: AppScreenHeaderProps) {
  const styles = useThemedStyles(makeStyles)

  return (
    <View style={styles.root}>
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
      {overline ? (
        <View style={styles.overlineRow}>
          <Text style={styles.overline}>{overline}</Text>
          <View style={styles.overlineRule} />
        </View>
      ) : null}
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  )
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { gap: 5, paddingBottom: 4 },
  accessory: { marginBottom: 5, alignSelf: 'flex-start' },
  overlineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 220 },
  overline: { ...typography.overline, color: colors.brand },
  overlineRule: { height: StyleSheet.hairlineWidth, flex: 1, backgroundColor: colors.brand, opacity: 0.45 },
  title: { ...typography.headlineLarge, color: colors.text },
  description: { ...typography.body, color: colors.textMuted, maxWidth: 540, marginTop: 2 },
})
