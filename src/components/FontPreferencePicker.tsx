import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl'
import { useFontPreferences } from '@/lib/FontPreferencesContext'
import type { AppFontChoice } from '@/lib/fontPreferences'
import type { ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { StyleSheet, Text, View } from 'react-native'
import { useState } from 'react'

const FONT_OPTIONS: AppFontChoice[] = ['default', 'custom', 'mono']
const FONT_LABELS = ['Editorial mix', 'Serif', 'Mono']

export function FontPreferencePicker() {
  const { fontChoice, setFontChoice, customFontLoaded } = useFontPreferences()
  const styles = useThemedStyles(makeStyles)
  const [saving, setSaving] = useState(false)

  async function handleIndexChange(index: number) {
    const choice = FONT_OPTIONS[index]
    if (!choice || choice === fontChoice || saving) return
    if (!customFontLoaded && choice !== 'default') return
    setSaving(true)
    try {
      await setFontChoice(choice)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.label}>Typography</Text>
      <Text style={styles.hint}>
        Editorial mix pairs Instrument Serif headings with Inter Tight UI. Serif and Mono
        apply one typeface throughout.
      </Text>
      <ThemedSegmentedControl
        values={FONT_LABELS}
        selectedIndex={Math.max(0, FONT_OPTIONS.indexOf(fontChoice))}
        onChange={handleIndexChange}
        enabled={!saving}
        accessibilityLabel="Typography typeface selection"
        accessibilityHint="Selects the active typography style for app text"
      />
      {!customFontLoaded ? (
        <Text accessibilityRole="alert" style={styles.warning}>
          App fonts are unavailable. Using the system typeface.
        </Text>
      ) : null}
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
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
  warning: {
    ...typography.bodySmall,
    color: c.warning,
  },
})
