import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl'
import { useApiBackendPreferences } from '@/lib/ApiBackendPreferencesContext'
import type { ApiBackendChoice } from '@/lib/apiBackendPreferences'
import type { ThemeColors } from '@/lib/theme/tokens'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

const BACKEND_OPTIONS: ApiBackendChoice[] = ['ords', 'legacy']
const BACKEND_LABELS = ['Oracle ORDS', 'Legacy (deprecated)']

export function ApiBackendPreferencePicker() {
  const { apiBackend, setApiBackend } = useApiBackendPreferences()
  const styles = useThemedStyles(makeStyles)
  const [saving, setSaving] = useState(false)

  async function handleIndexChange(index: number) {
    const choice = BACKEND_OPTIONS[index]
    if (!choice || choice === apiBackend || saving) return
    setSaving(true)
    try {
      await setApiBackend(choice)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Food data source</Text>
      <Text style={styles.hint}>
        Oracle ORDS looks up products by barcode and name search. Legacy FastAPI is deprecated and
        may be removed later.
      </Text>
      <ThemedSegmentedControl
        values={BACKEND_LABELS}
        selectedIndex={Math.max(0, BACKEND_OPTIONS.indexOf(apiBackend))}
        onChange={handleIndexChange}
        enabled={!saving}
      />
      {apiBackend === 'legacy' ? (
        <Text style={styles.warning}>
          Legacy backend is deprecated. Prefer Oracle ORDS when possible.
        </Text>
      ) : null}
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
    warning: {
      color: c.warning,
      fontSize: 12,
      marginTop: 10,
      lineHeight: 18,
    },
  })
