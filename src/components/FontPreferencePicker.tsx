import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl'
import { useFontPreferences } from '@/lib/FontPreferencesContext'
import type { AppFontChoice } from '@/lib/fontPreferences'
import type { ThemeColors } from '@/lib/theme/tokens'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'

const FONT_OPTIONS: AppFontChoice[] = ['default', 'custom']
const FONT_LABELS = ['Clean sans', 'Editorial serif']

export function FontPreferencePicker() {
  const { fontChoice, setFontChoice, customFontLoaded } = useFontPreferences()
  const styles = useThemedStyles(makeStyles)
  const [saving, setSaving] = useState(false)

  async function handleIndexChange(index: number) {
    const choice = FONT_OPTIONS[index]
    if (!choice || choice === fontChoice || saving) return
    if (choice === 'custom' && !customFontLoaded) return
    setSaving(true)
    try {
      await setFontChoice(choice)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.label}>App font</Text>
      <Text style={styles.hint}>
        Choose Hanken Grotesk for everyday UI or Source Serif for a more editorial feel.
      </Text>
      <ThemedSegmentedControl
        values={FONT_LABELS}
        selectedIndex={Math.max(0, FONT_OPTIONS.indexOf(fontChoice))}
        onChange={handleIndexChange}
        enabled={!saving}
      />
      {!customFontLoaded ? (
        <Text style={styles.warning}>
          Vitality fonts could not be loaded.
        </Text>
      ) : null}
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
  warning: {
    color: c.warning,
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
  },
})
