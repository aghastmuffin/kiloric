import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl'
import type { OnboardingColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
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
    ...typography.label,
    color: onboardingColors.textMuted,
    marginBottom: 4,
  },
  helper: {
    ...typography.bodySmall,
    color: onboardingColors.textMuted,
    marginBottom: 10,
  },
})
