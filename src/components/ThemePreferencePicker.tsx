import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { AppThemeChoice, ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'

const THEME_OPTIONS: AppThemeChoice[] = ['night', 'paper']
const THEME_LABELS = ['Night', 'Paper']

export function ThemePreferencePicker() {
  const { themeChoice, setThemeChoice } = useTheme()
  const styles = useThemedStyles(makeStyles)
  const [saving, setSaving] = useState(false)

  async function handleIndexChange(index: number) {
    const choice = THEME_OPTIONS[index]
    if (!choice || choice === themeChoice || saving) return
    setSaving(true)
    try {
      await setThemeChoice(choice)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.label}>Color theme</Text>
      <Text style={styles.hint}>
        Night is the default. Paper is the warm light theme.
      </Text>
      <ThemedSegmentedControl
        values={THEME_LABELS}
        selectedIndex={Math.max(0, THEME_OPTIONS.indexOf(themeChoice))}
        onChange={handleIndexChange}
        enabled={!saving}
        accessibilityLabel="Color theme selection"
        accessibilityHint="Selects Night or Paper"
      />
    </View>
  )
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    section: {
      gap: 8,
      paddingVertical: 4,
    },
    label: {
      ...typography.label,
      color: c.text,
    },
    hint: {
      ...typography.bodySmall,
      color: c.textFaint,
    },
  })
