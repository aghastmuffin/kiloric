import { triggerSelectionHaptic } from '@/lib/haptics'
import { fonts, usePalette } from '@/lib/theme/palette'
import { Host, TextInput, type TextInputRef } from '@expo/ui'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, View, type KeyboardTypeOptions } from 'react-native'
import { Txt } from './Txt'

/** Search box using the Expo UI universal TextInput. */
export function SearchField({
  placeholder,
  value,
  defaultValue,
  onChangeText,
  onSubmit,
  testID,
}: {
  placeholder: string
  value?: string
  defaultValue?: string
  onChangeText?: (text: string) => void
  onSubmit: (text: string) => void
  testID?: string
}) {
  const c = usePalette()
  const ref = useRef<TextInputRef>(null)
  const [text, setText] = useState(value ?? defaultValue ?? '')

  useEffect(() => {
    if (value !== undefined) {
      setText(value)
    }
  }, [value])

  const handleChangeText = (newText: string) => {
    setText(newText)
    onChangeText?.(newText)
  }

  const handleClear = () => {
    triggerSelectionHaptic()
    ref.current?.clear()
    setText('')
    onChangeText?.('')
  }

  return (
    <View
      accessibilityRole="search"
      accessibilityLabel={placeholder}
      style={[styles.search, { backgroundColor: c.card, borderColor: c.line }]}
    >
      <Ionicons name="search" size={20} color={c.inkMuted} />
      <Host ignoreSafeArea="all" style={styles.flex}>
        <TextInput
          ref={ref}
          testID={testID}
          defaultValue={defaultValue}
          placeholder={placeholder}
          placeholderTextColor={c.inkFaint}
          onChangeText={handleChangeText}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          enterKeyHint="search"
          autoCorrect={false}
          autoCapitalize="none"
          style={{ backgroundColor: 'transparent', borderWidth: 0, height: 48, paddingHorizontal: 0 }}
          textStyle={{ fontFamily: fonts.medium, fontSize: 16, color: c.ink }}
        />
      </Host>
      {text.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={handleClear}
          hitSlop={8}
          style={styles.clearButton}
        >
          <Ionicons name="close-circle" size={20} color={c.inkMuted} />
        </Pressable>
      ) : null}
    </View>
  )
}

/** Labelled form field using the Expo UI universal TextInput. */
export function Field({
  label,
  defaultValue,
  placeholder,
  onChangeText,
  keyboardType,
  suffix,
  testID,
  maxLength,
}: {
  label: string
  defaultValue?: string
  placeholder?: string
  onChangeText: (text: string) => void
  keyboardType?: KeyboardTypeOptions
  suffix?: string
  testID?: string
  maxLength?: number
}) {
  const c = usePalette()
  return (
    <View style={styles.field}>
      <Txt variant="caption" tone="muted">
        {label}
      </Txt>
      <View style={[styles.fieldBox, { backgroundColor: c.chip }]}>
        <Host ignoreSafeArea="all" style={styles.flex}>
          <TextInput
            testID={testID}
            defaultValue={defaultValue}
            placeholder={placeholder}
            placeholderTextColor={c.inkFaint}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            maxLength={maxLength}
            style={{ backgroundColor: 'transparent', borderWidth: 0, height: 46, paddingHorizontal: 0 }}
            textStyle={{ fontFamily: fonts.semibold, fontSize: 16, color: c.ink }}
          />
        </Host>
        {suffix ? (
          <Txt variant="caption" tone="muted">
            {suffix}
          </Txt>
        ) : null}
      </View>
    </View>
  )
}

/** Small centered numeric cell (e.g. weight / reps in a sets table). */
export function NumberCell({
  defaultValue,
  placeholder,
  onChangeText,
  accessibilityLabel,
  highlighted,
  testID,
}: {
  defaultValue?: string
  placeholder?: string
  onChangeText: (text: string) => void
  accessibilityLabel: string
  highlighted?: boolean
  testID?: string
}) {
  const c = usePalette()
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.cell, { backgroundColor: highlighted ? c.mint : c.chip }]}
    >
      <Host ignoreSafeArea="all" style={styles.flex}>
        <TextInput
          testID={testID}
          defaultValue={defaultValue}
          placeholder={placeholder}
          placeholderTextColor={c.inkFaint}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          maxLength={6}
          style={{ backgroundColor: 'transparent', borderWidth: 0, height: 42, paddingHorizontal: 4 }}
          textStyle={{ fontFamily: fonts.bold, fontSize: 16, color: highlighted ? c.mintInk : c.ink, textAlign: 'center' }}
        />
      </Host>
    </View>
  )
}

export function parseDecimal(text: string): number | null {
  const normalized = text.replace(',', '.').trim()
  if (!normalized) return null
  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) ? value : null
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 60,
  },
  clearButton: { padding: 4, justifyContent: 'center', alignItems: 'center' },
  cell: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  field: { gap: 6, flex: 1 },
  fieldBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, gap: 8 },
})
