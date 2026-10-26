import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl';
import { useApiBackendPreferences } from '@/lib/ApiBackendPreferencesContext';
import type { ApiBackendChoice } from '@/lib/apiBackendPreferences';
import { triggerSelectionHaptic } from '@/lib/haptics';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const BACKEND_OPTIONS: ApiBackendChoice[] = ['ords']
const BACKEND_LABELS = ['Oracle ORDS']

export function ApiBackendPreferencePicker() {
  const { apiBackend, setApiBackend } = useApiBackendPreferences()
  const styles = useThemedStyles(makeStyles)
  const [saving, setSaving] = useState(false)

  async function handleIndexChange(index: number) {
    const choice = BACKEND_OPTIONS[index]
    if (!choice || choice === apiBackend || saving) return
    triggerSelectionHaptic()
    setSaving(true)
    try {
      await setApiBackend(choice)
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.label}>
        Food data source
      </Text>
      <Text style={styles.hint}>
        Oracle ORDS looks up products by barcode and name search.
      </Text>
      <ThemedSegmentedControl
        values={BACKEND_LABELS}
        selectedIndex={0}
        onChange={handleIndexChange}
        enabled={!saving}
        accessibilityLabel="Food data source selection"
        accessibilityHint="Selects the API backend server for food lookup"
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
      ...typography.body,
      color: c.text,
      fontWeight: '600',
      marginBottom: 6,
    },
    hint: {
      ...typography.labelSmall,
      color: c.textFaint,
      marginBottom: 8,
    },
    warning: {
      ...typography.labelSmall,
      color: c.warning,
      marginTop: 10,
    },
  })
