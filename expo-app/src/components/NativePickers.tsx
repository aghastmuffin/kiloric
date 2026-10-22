import { createElement, type ReactNode, useMemo } from 'react';
import { NativeDatePickerControl } from '@/components/NativeDatePickerControl';
import { NativePickerHost } from '@/components/NativePickerHost';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Picker } from '@react-native-picker/picker';
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

const NOT_SET_VALUE = '__not_set__';

const pickerHostStyle: ViewStyle = {
  marginBottom: 16,
  width: '100%',
  minHeight: Platform.OS === 'ios' ? 120 : 56,
};

function wrapIosPicker(children: ReactNode, compact = false) {
  return (
    <NativePickerHost style={compact ? pickerLayoutStyles.compactPickerHost : pickerHostStyle}>
      {children}
    </NativePickerHost>
  );
}

function buildIntRange(min: number, max: number, step: number): number[] {
  const values: number[] = [];
  for (let current = min; current <= max; current += step) {
    values.push(current);
  }
  return values;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snapToStep(value: number, min: number, max: number, step: number): number {
  const snapped = min + Math.round((value - min) / step) * step;
  return clampNumber(snapped, min, max);
}

interface NativeEnumPickerProps<T extends string> {
  value: T | string;
  options: T[] | string[] | { label: string; value: T | string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

export function NativeEnumPicker<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
  accessibilityLabel,
}: NativeEnumPickerProps<T>) {
  const { colors } = useTheme();
  const themed = useThemedStyles(makeColoredStyles);

  return wrapIosPicker(
    <Picker
      accessibilityLabel={accessibilityLabel}
      mode={Platform.OS === 'android' ? 'dropdown' : undefined}
      selectedValue={value}
      onValueChange={(next) => onChange(next as T)}
      enabled={!disabled}
      dropdownIconColor={colors.textMuted}
      style={Platform.OS === 'web'
        ? themed.webPicker
        : { color: colors.text, backgroundColor: colors.surfaceAlt }}
      itemStyle={{ color: colors.text }}
    >
      {options.map((option, index) => {
        // 2. Runtime check: determine if it's an object or a plain string
        const isObject = typeof option === 'object' && option !== null;
        
        const itemLabel = isObject ? option.label : option;
        const itemValue = isObject ? option.value : option;
        
        // Use a combined key to prevent collision bugs if values repeat
        const itemKey = isObject ? `${option.value}-${index}` : `${option}-${index}`;

        return (
          <Picker.Item 
            key={itemKey} 
            label={itemLabel} 
            value={itemValue}
            color={colors.text}
          />
        );
      })}
    </Picker>,
  );
}

type NativeDatePickerProps = {
  value: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  accessibilityLabel?: string;
};

export function NativeDatePicker({
  value,
  onChange,
  disabled = false,
  minimumDate,
  maximumDate,
  accessibilityLabel,
}: NativeDatePickerProps) {
  return <NativeDatePickerControl
    value={value}
    onChange={onChange}
    disabled={disabled}
    minimumDate={minimumDate}
    maximumDate={maximumDate}
    accessibilityLabel={accessibilityLabel}
  />;
}

type NativeIntPickerProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  min: number;
  max: number;
  step?: number;
  optional?: boolean;
  disabled?: boolean;
  formatLabel?: (value: number) => string;
  accessibilityLabel?: string;
};

export function NativeIntPicker({
  value,
  onChange,
  min,
  max,
  step = 1,
  optional = false,
  disabled = false,
  formatLabel,
  accessibilityLabel,
}: NativeIntPickerProps) {
  const { colors } = useTheme();
  const themed = useThemedStyles(makeColoredStyles);
  const options = useMemo(() => buildIntRange(min, max, step), [min, max, step]);
  const selectedValue =
    value == null
      ? NOT_SET_VALUE
      : options.includes(value)
        ? value
        : snapToStep(value, min, max, step);

  return wrapIosPicker(
    <Picker
      accessibilityLabel={accessibilityLabel}
      mode={Platform.OS === 'android' ? 'dropdown' : undefined}
      selectedValue={selectedValue}
      onValueChange={(next) => {
        if (next === NOT_SET_VALUE) {
          onChange(null);
          return;
        }
        onChange(Number(next));
      }}
      enabled={!disabled}
      dropdownIconColor={colors.textMuted}
      style={Platform.OS === 'web'
        ? themed.webPicker
        : { color: colors.text, backgroundColor: colors.surfaceAlt }}
      itemStyle={{ color: colors.text }}
    >
      {optional ? <Picker.Item label="Not set" value={NOT_SET_VALUE} color={colors.text} /> : null}
      {options.map((option) => (
        <Picker.Item
          key={option}
          label={formatLabel ? formatLabel(option) : String(option)}
          value={option}
          color={colors.text}
        />
      ))}
    </Picker>,
  );
}

type NativeDecimalPickerProps = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  decimals?: number;
  disabled?: boolean;
  unit?: string;
  accessibilityLabel?: string;
};

export function NativeDecimalPicker({
  value,
  onChange,
  min,
  max,
  decimals = 1,
  disabled = false,
  unit,
  accessibilityLabel,
}: NativeDecimalPickerProps) {
  const themed = useThemedStyles(makeColoredStyles);
  const { colors } = useTheme();
  const clamped = clampNumber(value, min, max);
  const factor = 10 ** decimals;
  const wholeMin = Math.floor(min);
  const wholeMax = Math.floor(max);
  const wholeOptions = useMemo(
    () => buildIntRange(wholeMin, wholeMax, 1),
    [wholeMin, wholeMax],
  );
  const fractionOptions = useMemo(
    () => buildIntRange(0, 10 ** decimals - 1, 1),
    [decimals],
  );

  const whole = Math.floor(clamped);
  const fraction = Math.round((clamped - whole) * factor);

  function updateWhole(nextWhole: number) {
    const next = clampNumber(nextWhole + fraction / factor, min, max);
    onChange(Number(next.toFixed(decimals)));
  }

  function updateFraction(nextFraction: number) {
    const next = clampNumber(whole + nextFraction / factor, min, max);
    onChange(Number(next.toFixed(decimals)));
  }

  if (Platform.OS === 'web') {
    return createElement('input', {
      type: 'number',
      value: clamped,
      min,
      max,
      step: 1 / factor,
      disabled,
      'aria-label': accessibilityLabel,
      onChange: (event: { target: { value: string } }) => {
        const next = Number(event.target.value);
        if (!Number.isFinite(next)) return;
        onChange(Number(clampNumber(next, min, max).toFixed(decimals)));
      },
      style: themed.webNumberInput,
    });
  }

  return (
    <View style={pickerLayoutStyles.decimalRow}>
      <View style={pickerLayoutStyles.decimalWhole}>
        {wrapIosPicker(
          <Picker
            accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}, whole number` : undefined}
            mode={Platform.OS === 'android' ? 'dropdown' : undefined}
            selectedValue={whole}
            onValueChange={(next) => updateWhole(Number(next))}
            enabled={!disabled}
            dropdownIconColor={colors.textMuted}
            style={{ color: colors.text, backgroundColor: colors.surfaceAlt }}
            itemStyle={{ color: colors.text }}
          >
            {wholeOptions.map((option) => (
              <Picker.Item key={option} label={String(option)} value={option} color={colors.text} />
            ))}
          </Picker>,
          true,
        )}
      </View>
      <Text style={themed.decimalSeparator}>.</Text>
      <View style={pickerLayoutStyles.decimalFraction}>
        {wrapIosPicker(
          <Picker
            accessibilityLabel={accessibilityLabel ? `${accessibilityLabel}, decimal` : undefined}
            mode={Platform.OS === 'android' ? 'dropdown' : undefined}
            selectedValue={fraction}
            onValueChange={(next) => updateFraction(Number(next))}
            enabled={!disabled}
            dropdownIconColor={colors.textMuted}
            style={{ color: colors.text, backgroundColor: colors.surfaceAlt }}
            itemStyle={{ color: colors.text }}
          >
            {fractionOptions.map((option) => (
              <Picker.Item
                key={option}
                label={String(option).padStart(decimals, '0')}
                value={option}
                color={colors.text}
              />
            ))}
          </Picker>,
          true,
        )}
      </View>
      {unit ? <Text style={themed.unitLabel}>{unit}</Text> : null}
    </View>
  );
}

const pickerLayoutStyles = StyleSheet.create({
  compactPickerHost: {
    minHeight: Platform.OS === 'ios' ? 120 : 56,
    width: '100%',
  },
  decimalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  decimalFraction: {
    width: 88,
  },
  decimalWhole: {
    flex: 1,
  },
});

const makeColoredStyles = (c: ThemeColors) =>
  StyleSheet.create({
    decimalSeparator: {
      color: c.text,
      fontSize: 24,
      fontWeight: '600',
    },
    unitLabel: {
      color: c.textMuted,
      fontSize: 16,
      minWidth: 28,
    },
    webNumberInput: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 8,
      boxSizing: 'border-box',
      color: c.text,
      fontSize: 16,
      marginBottom: 16,
      padding: 12,
      width: '100%',
      borderWidth: 1,
      borderColor: c.border,
    },
    webPicker: {
      backgroundColor: c.surfaceAlt,
      borderColor: c.border,
      borderRadius: 8,
      borderWidth: 1,
      color: c.text,
      fontSize: 16,
      minHeight: 52,
      paddingHorizontal: 12,
      width: '100%',
    },
  });
