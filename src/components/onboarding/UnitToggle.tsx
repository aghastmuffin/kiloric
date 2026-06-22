import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl'
import type { OnboardingColors } from '@/lib/theme/tokens'
import { useOnboardingStyles } from '@/lib/theme/useThemedStyles'
import type { DisplayUnits } from '@/lib/units'
import { StyleSheet, Text, View } from 'react-native'

type UnitToggleProps = {
  value: DisplayUnits
  onChange: (units: DisplayUnits) => void
  disabled?: boolean
  country?: string
}

export function UnitToggle({ value, onChange, disabled = false, country }: UnitToggleProps) {
  const styles = useOnboardingStyles(makeStyles)
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Display units</Text>
      <Text style={styles.helper}>
        Values are always saved in metric. Pick the units that feel natural to you
        {country ? ` in ${country}` : ''}.
      </Text>
      <ThemedSegmentedControl
        values={['Metric', 'Imperial']}
        selectedIndex={value === 'metric' ? 0 : 1}
        enabled={!disabled}
        onChange={(index) => onChange((index === 0 ? 'metric' : 'imperial') as DisplayUnits)}
      />
    </View>
  )
}

const makeStyles = (onboardingColors: OnboardingColors) => StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    color: onboardingColors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helper: {
    color: onboardingColors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: onboardingColors.border,
    backgroundColor: onboardingColors.card,
  },
  chipSelected: {
    borderColor: onboardingColors.borderSelected,
    backgroundColor: onboardingColors.cardSelected,
  },
  chipPressed: {
    opacity: 0.9,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    color: onboardingColors.textSoft,
    fontWeight: '600',
    fontSize: 14,
  },
  chipTextSelected: {
    color: onboardingColors.accent,
  },
})
