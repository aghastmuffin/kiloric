import type { OnboardingColors } from '@/lib/theme/tokens'
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
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
    </Pressable>
  )
}

const makeStyles = (onboardingColors: OnboardingColors) => StyleSheet.create({
  card: {
    backgroundColor: onboardingColors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: onboardingColors.border,
  },
  cardSelected: {
    backgroundColor: onboardingColors.cardSelected,
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
    color: onboardingColors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: onboardingColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
})
