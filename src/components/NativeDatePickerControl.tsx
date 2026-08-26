import { useTheme } from '@/lib/theme/ThemeContext';
import { DateTimePicker as ExpoDateTimePicker } from '@expo/ui/community/datetime-picker';
import { Platform, View, type ViewStyle } from 'react-native';

export type NativeDatePickerControlProps = {
  value: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  accessibilityLabel?: string;
};

const pickerStyle: ViewStyle = {
  marginBottom: 16,
  minHeight: Platform.OS === 'ios' ? 120 : 56,
  width: '100%',
};

const pickerContainerStyle: ViewStyle = {
  width: '100%',
};

export function NativeDatePickerControl({
  value,
  onChange,
  disabled,
  minimumDate,
  maximumDate,
  accessibilityLabel,
}: NativeDatePickerControlProps) {
  const { colors } = useTheme();

  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={pickerContainerStyle}>
      <ExpoDateTimePicker
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
        style={pickerStyle}
      />
    </View>
  );
}
