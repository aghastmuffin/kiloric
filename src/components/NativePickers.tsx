//import { Picker } from '@expo/ui';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { Picker } from '@react-native-picker/picker';
import { type ReactNode, useMemo } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  unstable_createElement,
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
  if (Platform.OS === 'ios') {
    const { Host } = require('@expo/ui/swift-ui') as typeof import('@expo/ui/swift-ui');
    return (
      <Host
        matchContents={{ vertical: true }}
        style={compact ? pickerLayoutStyles.compactPickerHost : pickerHostStyle}
      >
        {children}
      </Host>
    );
  }

  return (
    <View style={compact ? pickerLayoutStyles.compactPickerHost : pickerHostStyle}>
      {children}
    </View>
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

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface NativeEnumPickerProps<T extends string> {
  value: T | string;
  options: T[] | string[] | { label: string; value: T | string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function NativeEnumPicker<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
}: NativeEnumPickerProps<T>) {
  const appearance = Platform.OS === 'ios' ? 'wheel' : 'menu';

  return wrapIosPicker(
    <Picker
      appearance={appearance}
      selectedValue={value}
      onValueChange={(next) => onChange(next as T)}
      enabled={!disabled}
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
};

export function NativeDatePicker({
  value,
  onChange,
  disabled = false,
  minimumDate,
  maximumDate,
}: NativeDatePickerProps) {
  const themed = useThemedStyles(makeColoredStyles);
  if (Platform.OS === 'web') {
    return unstable_createElement('input', {
      type: 'date',
      value: formatIsoDate(value),
      min: minimumDate ? formatIsoDate(minimumDate) : undefined,
      max: maximumDate ? formatIsoDate(maximumDate) : undefined,
      disabled,
      onChange: (event: { target: { value: string } }) => {
        const next = event.target.value;
        if (!next) return;
        const [year, month, day] = next.split('-').map(Number);
        onChange(new Date(year, month - 1, day));
      },
      style: themed.webDateInput,
    });
  }

  return <NativeDatePickerControl
    value={value}
    onChange={onChange}
    disabled={disabled}
    minimumDate={minimumDate}
    maximumDate={maximumDate}
  />;
}

function NativeDatePickerControl({
  value,
  onChange,
  disabled,
  minimumDate,
  maximumDate,
}: Required<Pick<NativeDatePickerProps, 'value' | 'onChange'>> &
  Pick<NativeDatePickerProps, 'disabled' | 'minimumDate' | 'maximumDate'>) {
  const { colors } = useTheme();

  return (
    <DateTimePicker
      value={value}
      mode="date"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      presentation={Platform.OS === 'android' ? 'inline' : undefined}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      disabled={disabled}
      themeVariant={colors.pickerVariant}
      accentColor={colors.pickerAccent}
      onValueChange={(_event, date) => onChange(date)}
      style={pickerHostStyle}
    />
  );
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
}: NativeIntPickerProps) {
  const options = useMemo(() => buildIntRange(min, max, step), [min, max, step]);
  const appearance = Platform.OS === 'ios' ? 'wheel' : 'menu';
  const selectedValue =
    value == null
      ? NOT_SET_VALUE
      : options.includes(value)
        ? value
        : snapToStep(value, min, max, step);

  return wrapIosPicker(
    <Picker
      appearance={appearance}
      selectedValue={selectedValue}
      onValueChange={(next) => {
        if (next === NOT_SET_VALUE) {
          onChange(null);
          return;
        }
        onChange(Number(next));
      }}
      enabled={!disabled}
    >
      {optional ? <Picker.Item label="Not set" value={NOT_SET_VALUE} /> : null}
      {options.map((option) => (
        <Picker.Item
          key={option}
          label={formatLabel ? formatLabel(option) : String(option)}
          value={option}
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
};

export function NativeDecimalPicker({
  value,
  onChange,
  min,
  max,
  decimals = 1,
  disabled = false,
  unit,
}: NativeDecimalPickerProps) {
  const themed = useThemedStyles(makeColoredStyles);
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
    return unstable_createElement('input', {
      type: 'number',
      value: clamped,
      min,
      max,
      step: 1 / factor,
      disabled,
      onChange: (event: { target: { value: string } }) => {
        const next = Number(event.target.value);
        if (!Number.isFinite(next)) return;
        onChange(Number(clampNumber(next, min, max).toFixed(decimals)));
      },
      style: themed.webNumberInput,
    });
  }

  const appearance = Platform.OS === 'ios' ? 'wheel' : 'menu';

  return (
    <View style={pickerLayoutStyles.decimalRow}>
      <View style={pickerLayoutStyles.decimalWhole}>
        {wrapIosPicker(
          <Picker
            appearance={appearance}
            selectedValue={whole}
            onValueChange={(next) => updateWhole(Number(next))}
            enabled={!disabled}
          >
            {wholeOptions.map((option) => (
              <Picker.Item key={option} label={String(option)} value={option} />
            ))}
          </Picker>,
          true,
        )}
      </View>
      <Text style={themed.decimalSeparator}>.</Text>
      <View style={pickerLayoutStyles.decimalFraction}>
        {wrapIosPicker(
          <Picker
            appearance={appearance}
            selectedValue={fraction}
            onValueChange={(next) => updateFraction(Number(next))}
            enabled={!disabled}
          >
            {fractionOptions.map((option) => (
              <Picker.Item
                key={option}
                label={String(option).padStart(decimals, '0')}
                value={option}
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
    webDateInput: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 8,
      color: c.text,
      fontSize: 16,
      marginBottom: 16,
      padding: 12,
      width: '100%',
      borderWidth: 1,
      borderColor: c.border,
    },
    webNumberInput: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 8,
      color: c.text,
      fontSize: 16,
      marginBottom: 16,
      padding: 12,
      width: '100%',
      borderWidth: 1,
      borderColor: c.border,
    },
  });
