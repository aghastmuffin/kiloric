import { NativeIntPicker } from '@/components/NativePickers'
import { makeOnboardingStyles } from '@/components/onboarding/styles'
import { useOnboardingStyles } from '@/lib/theme/useThemedStyles'
import {
  cmToFeetInches,
  feetInchesToCm,
  formatHeightImperial,
  formatHeightMetric,
  formatWeightImperial,
  formatWeightMetric,
  kgToLbs,
  lbsToKg,
  roundMetric,
  type DisplayUnits,
} from '@/lib/units'
import { StyleSheet, Text, View } from 'react-native'

type HeightPickerProps = {
  valueCm: number
  displayUnits: DisplayUnits
  onChange: (heightCm: number) => void
  disabled?: boolean
}

type WeightPickerProps = {
  valueKg: number
  displayUnits: DisplayUnits
  onChange: (weightKg: number) => void
  disabled?: boolean
  label?: string
}

export function HeightPicker({ valueCm, displayUnits, onChange, disabled = false }: HeightPickerProps) {
  const onboardingStyles = useOnboardingStyles(makeOnboardingStyles)
  if (displayUnits === 'imperial') {
    const { feet, inches } = cmToFeetInches(valueCm)

    return (
      <View style={styles.block}>
        <Text style={onboardingStyles.label}>Height</Text>
        <View style={styles.imperialRow}>
          <View style={styles.imperialColumn}>
            <NativeIntPicker
              value={feet}
              onChange={(nextFeet) => onChange(feetInchesToCm(nextFeet ?? feet, inches))}
              min={4}
              max={7}
              disabled={disabled}
              formatLabel={(value) => `${value} ft`}
            />
          </View>
          <View style={styles.imperialColumn}>
            <NativeIntPicker
              value={inches}
              onChange={(nextInches) => onChange(feetInchesToCm(feet, nextInches ?? inches))}
              min={0}
              max={11}
              disabled={disabled}
              formatLabel={(value) => `${value} in`}
            />
          </View>
        </View>
        <Text style={onboardingStyles.hintInline}>
          {formatHeightImperial(valueCm)} · {formatHeightMetric(valueCm)}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.block}>
      <Text style={onboardingStyles.label}>Height</Text>
      <NativeIntPicker
        value={Math.round(valueCm)}
        onChange={(value) => onChange(roundMetric(value ?? valueCm))}
        min={120}
        max={220}
        disabled={disabled}
        formatLabel={(value) => `${value} cm`}
      />
      <Text style={onboardingStyles.hintInline}>
        {formatHeightMetric(valueCm)} · about {formatHeightImperial(valueCm)}
      </Text>
    </View>
  )
}

export function WeightPicker({
  valueKg,
  displayUnits,
  onChange,
  disabled = false,
  label = 'Current weight',
}: WeightPickerProps) {
  const onboardingStyles = useOnboardingStyles(makeOnboardingStyles)
  if (displayUnits === 'imperial') {
    const pounds = kgToLbs(valueKg)

    return (
      <View style={styles.block}>
        <Text style={onboardingStyles.label}>{label}</Text>
        <NativeIntPicker
          value={pounds}
          onChange={(lbs) => onChange(lbsToKg(lbs ?? pounds))}
          min={80}
          max={440}
          disabled={disabled}
          formatLabel={(value) => `${value} lb`}
        />
        <Text style={onboardingStyles.hintInline}>
          {formatWeightImperial(valueKg)} · {formatWeightMetric(valueKg)}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.block}>
      <Text style={onboardingStyles.label}>{label}</Text>
      <NativeIntPicker
        value={Math.round(valueKg)}
        onChange={(value) => onChange(roundMetric(value ?? valueKg))}
        min={35}
        max={200}
        disabled={disabled}
        formatLabel={(value) => `${value} kg`}
      />
      <Text style={onboardingStyles.hintInline}>
        {formatWeightMetric(valueKg)} · about {formatWeightImperial(valueKg)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  block: {
    marginBottom: 4,
  },
  imperialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  imperialColumn: {
    flex: 1,
  },
})
