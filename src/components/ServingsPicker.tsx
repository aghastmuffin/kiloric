import { triggerSelectionHaptic } from '@/lib/haptics'
import { SERVING_PRESETS, formatServings, isServingPreset, parseServingsInput } from '@/lib/servings'
import { useTheme } from '@/lib/theme/ThemeContext'
import type { ThemeColors } from '@/lib/theme/tokens'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { useCallback, useEffect, useState } from 'react'
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

type Props = {
  servings: number
  onChange: (servings: number) => void
  disabled?: boolean
}

export function ServingsPicker({ servings, onChange, disabled = false }: Props) {
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()
  const [customVisible, setCustomVisible] = useState(false)
  const [customDraft, setCustomDraft] = useState('')
  const [customError, setCustomError] = useState<string | null>(null)

  const isCustom = !isServingPreset(servings)

  useEffect(() => {
    if (!customVisible) return
    setCustomDraft(String(servings))
    setCustomError(null)
  }, [customVisible, servings])

  const openCustom = useCallback(() => {
    if (disabled) return
    triggerSelectionHaptic()
    setCustomVisible(true)
  }, [disabled])

  const closeCustom = useCallback(() => {
    setCustomVisible(false)
    setCustomError(null)
  }, [])

  const applyCustom = useCallback(() => {
    const parsed = parseServingsInput(customDraft)
    if (parsed == null) {
      setCustomError('Enter a number between 0 and 100.')
      return
    }
    onChange(parsed)
    closeCustom()
  }, [closeCustom, customDraft, onChange])

  return (
    <View style={styles.root}>
      <Text style={styles.label}>Servings</Text>
      <View style={styles.options}>
        {SERVING_PRESETS.map((preset) => {
          const selected = servings === preset
          return (
            <Pressable
              key={preset}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${formatServings(preset)} servings`}
              accessibilityHint={`Selects ${formatServings(preset)} serving portion`}
              disabled={disabled}
              onPress={() => {
                triggerSelectionHaptic()
                onChange(preset)
              }}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && !disabled && styles.optionPressed,
                disabled && styles.optionDisabled,
              ]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {formatServings(preset)}
              </Text>
            </Pressable>
          )
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isCustom }}
          accessibilityLabel={
            isCustom ? `Custom: ${formatServings(servings)} servings` : 'Custom servings'
          }
          accessibilityHint="Opens modal to enter custom serving quantity"
          disabled={disabled}
          onPress={openCustom}
          style={({ pressed }) => [
            styles.option,
            styles.customOption,
            isCustom && styles.optionSelected,
            pressed && !disabled && styles.optionPressed,
            disabled && styles.optionDisabled,
          ]}
        >
          <Text style={[styles.optionText, isCustom && styles.optionTextSelected]}>
            {isCustom ? formatServings(servings) : 'Custom'}
          </Text>
        </Pressable>
      </View>

      <Modal visible={customVisible} transparent animationType="fade" onRequestClose={closeCustom}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeCustom} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Custom servings</Text>
            <Text style={styles.modalHint}>Enter how many servings you had (e.g. 0.5, 1.25, 3).</Text>
            <TextInput
              value={customDraft}
              onChangeText={(text) => {
                setCustomDraft(text)
                setCustomError(null)
              }}
              keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
              placeholder="e.g. 1.25"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoFocus
              selectTextOnFocus
              onSubmitEditing={applyCustom}
            />
            {customError ? <Text style={styles.errorText}>{customError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel custom serving input"
                onPress={closeCustom}
                style={({ pressed }) => [styles.modalButton, pressed && styles.modalButtonPressed]}
              >
                <Text style={styles.modalButtonTextMuted}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Apply custom serving quantity"
                onPress={applyCustom}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  pressed && styles.modalButtonPressed,
                ]}
              >
                <Text style={styles.modalButtonTextPrimary}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: {
    gap: 8,
    marginTop: 4,
  },
  label: {
    color: c.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    minWidth: 52,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customOption: {
    minWidth: 72,
  },
  optionSelected: {
    borderColor: c.brand,
    backgroundColor: c.brandSoft,
  },
  optionPressed: {
    opacity: 0.85,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionText: {
    color: c.text,
    fontSize: 14,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: c.brand,
    fontWeight: '700',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.overlay,
  },
  modalCard: {
    backgroundColor: c.surface,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 18,
    gap: 10,
    zIndex: 1,
  },
  modalTitle: {
    color: c.text,
    fontSize: 18,
    fontWeight: '700',
  },
  modalHint: {
    color: c.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    backgroundColor: c.background,
    color: c.text,
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  errorText: {
    color: c.danger,
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalButtonPrimary: {
    backgroundColor: c.brand,
  },
  modalButtonPressed: {
    opacity: 0.85,
  },
  modalButtonTextMuted: {
    color: c.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: c.onBrand,
    fontSize: 15,
    fontWeight: '700',
  },
})
