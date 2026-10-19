import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { AppThemeChoice, ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'

const THEME_OPTIONS: AppThemeChoice[] = ['calcount', 'paper', 'ios', 'barebones']
const THEME_LABELS = ['CalCount', 'Paper', 'Cool', 'Barebones']

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
        CalCount is fresh and green. Paper is warm and editorial. Cool is crisp and blue; Barebones is dark and
        high-contrast.
      </Text>
      <ThemedSegmentedControl
        values={THEME_LABELS}
        selectedIndex={Math.max(0, THEME_OPTIONS.indexOf(themeChoice))}
        onChange={handleIndexChange}
        enabled={!saving}
        accessibilityLabel="Color theme selection"
        accessibilityHint="Selects the active visual color scheme for the application"
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
