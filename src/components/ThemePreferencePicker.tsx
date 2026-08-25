import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { AppThemeChoice, ThemeColors } from '@/lib/theme/tokens'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'

const THEME_OPTIONS: AppThemeChoice[] = ['paper', 'ios', 'barebones']
const THEME_LABELS = ['Paper', 'Vitality', 'Classic']

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
      <Text style={styles.label}>Appearance</Text>
      <Text style={styles.hint}>
        Paper is the signature warm, ink-and-vermilion look. Vitality and Classic keep
        the existing alternate palettes.
      </Text>
      <ThemedSegmentedControl
        values={THEME_LABELS}
        selectedIndex={Math.max(0, THEME_OPTIONS.indexOf(themeChoice))}
        onChange={handleIndexChange}
        enabled={!saving}
        accessibilityLabel="Appearance theme"
        accessibilityHint="Select app appearance theme style"
      />
    </View>
  )
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    section: {
      marginTop: 16,
      marginBottom: 4,
    },
    label: {
      color: c.text,
      fontSize: 16,
      marginBottom: 6,
    },
    hint: {
      color: c.textFaint,
      fontSize: 12,
      marginBottom: 8,
      lineHeight: 18,
    },
  })
