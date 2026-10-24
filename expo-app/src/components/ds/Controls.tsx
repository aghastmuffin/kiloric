import { triggerSelectionHaptic } from '@/lib/haptics'
import { fonts, usePalette } from '@/lib/theme/palette'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps, ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { UButton, type ButtonSize } from './UButton'

type IconName = ComponentProps<typeof Ionicons>['name']

/** Pill chip; selected chips switch to the dark (or mint) fill. */
export function Chip({
  label,
  selected,
  onPress,
  selectedTone = 'inverse',
  size = 'sm',
  fullWidth,
  style,
  testID,
}: {
  label: string
  selected: boolean
  onPress: () => void
  selectedTone?: 'inverse' | 'mint'
  size?: ButtonSize
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}) {
  return (
    <UButton
      label={label}
      onPress={onPress}
      tone={selected ? selectedTone : 'chip'}
      size={size}
      fullWidth={fullWidth}
      style={style}
      testID={testID}
    />
  )
}

/** Segmented control: a rounded track with equal-width universal buttons. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  testID,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  size?: ButtonSize
  testID?: string
}) {
  const c = usePalette()
  return (
    <View testID={testID} accessibilityRole="tablist" style={[styles.segmentTrack, { backgroundColor: c.chip }]}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <View
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={styles.segmentItem}
          >
            <UButton
              label={option.label}
              onPress={() => onChange(option.value)}
              tone={active ? 'card' : 'ghost'}
              size={size}
              fullWidth
              testID={testID ? `${testID}-${option.value}` : undefined}
            />
          </View>
        )
      })}
    </View>
  )
}

export function IconButton({
  icon,
  onPress,
  tone = 'card',
  size = 48,
  accessibilityLabel,
  testID,
  style,
}: {
  icon: IconName
  onPress: () => void
  tone?: 'card' | 'primary' | 'mint' | 'chip' | 'inverse'
  size?: number
  accessibilityLabel: string
  testID?: string
  style?: StyleProp<ViewStyle>
}) {
  const c = usePalette()
  const bg = tone === 'primary' ? c.primary : tone === 'mint' ? c.mint : tone === 'chip' ? c.chip : tone === 'inverse' ? c.inverse : c.card
  const fg = tone === 'primary' ? c.onPrimary : tone === 'mint' ? c.mintInk : tone === 'inverse' ? c.onInverse : c.ink
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      hitSlop={6}
      onPress={() => {
        triggerSelectionHaptic()
        onPress()
      }}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, opacity: pressed ? 0.8 : 1 },
        styles.center,
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.46)} color={fg} />
    </Pressable>
  )
}

export function CheckCircle({
  checked,
  onPress,
  size = 34,
  accessibilityLabel,
  disabled,
  tone = 'primary',
}: {
  checked: boolean
  onPress?: () => void
  size?: number
  accessibilityLabel: string
  disabled?: boolean
  tone?: 'primary' | 'add'
}) {
  const c = usePalette()
  const unchecked =
    tone === 'add'
      ? { backgroundColor: c.mint, borderColor: c.mint }
      : { backgroundColor: 'transparent', borderColor: c.gridLine }
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || !onPress}
      hitSlop={8}
      onPress={() => {
        triggerSelectionHaptic()
        onPress?.()
      }}
      style={({ pressed }) => [
        styles.center,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2,
          opacity: pressed ? 0.75 : 1,
        },
        checked ? { backgroundColor: c.primary, borderColor: c.primary } : unchecked,
      ]}
    >
      {checked ? (
        <Ionicons name="checkmark" size={Math.round(size * 0.55)} color={c.onPrimary} />
      ) : tone === 'add' ? (
        <Ionicons name="add" size={Math.round(size * 0.6)} color={c.mintInk} />
      ) : null}
    </Pressable>
  )
}

export function Badge({
  label,
  tone = 'mint',
  icon,
}: {
  label: string
  tone?: 'mint' | 'peach' | 'blue' | 'card' | 'inverse'
  icon?: IconName
}) {
  const c = usePalette()
  const colors = {
    mint: { bg: c.mint, fg: c.mintInk },
    peach: { bg: c.peach, fg: c.peachInk },
    blue: { bg: c.proteinSoft, fg: c.protein },
    card: { bg: c.card, fg: c.ink },
    inverse: { bg: c.inverse, fg: c.onInverse },
  }[tone]
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      {icon ? <Ionicons name={icon} size={15} color={colors.fg} /> : null}
      <Text style={[styles.badgeText, { color: colors.fg }]}>{label}</Text>
    </View>
  )
}

export function Divider() {
  const c = usePalette()
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.line }} />
}

export function Row({ children, gap = 12, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  segmentTrack: { flexDirection: 'row', borderRadius: 20, padding: 5, gap: 4 },
  segmentItem: { flex: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17 },
})
