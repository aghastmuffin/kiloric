import type { OnboardingColors } from '@/lib/theme/tokens'
import { FONT_FAMILY } from '@/lib/fonts'
import { useOnboardingStyles } from '@/lib/theme/useThemedStyles'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type SelectionCardProps<T extends string> = {
  value: T
  label: string
  description: string
  selected: boolean
  onPress: (value: T) => void
  disabled?: boolean
}

export function SelectionCard<T extends string>({
  value,
  label,
  description,
  selected,
  onPress,
  disabled = false,
}: SelectionCardProps<T>) {
  const styles = useOnboardingStyles(makeStyles)
  return (
    <Pressable
      accessibilityLabel={`${label}. ${description}`}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      onPress={() => onPress(value)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
        disabled && styles.cardDisabled,
      ]}
    >
      <View style={styles.row}>
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
        <View style={styles.copy}>
          <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
    </Pressable>
  )
}

const makeStyles = (onboardingColors: OnboardingColors) => StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    minHeight: 64,
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: onboardingColors.border,
  },
  cardSelected: {
    backgroundColor: onboardingColors.cardSelected,
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingRight: 12,
    borderColor: onboardingColors.borderSelected,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: onboardingColors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioSelected: {
    borderColor: onboardingColors.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: onboardingColors.accent,
  },
  copy: {
    flex: 1,
  },
  label: {
    fontFamily: FONT_FAMILY,
    color: onboardingColors.text,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  labelSelected: {
    color: onboardingColors.accent,
  },
  description: {
    fontFamily: FONT_FAMILY,
    color: onboardingColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
})
