import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { createElement } from 'react';
import { StyleSheet } from 'react-native';

export type NativeDatePickerControlProps = {
  value: Date;
  onChange: (date: Date) => void;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
  accessibilityLabel?: string;
};

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function NativeDatePickerControl({
  value,
  onChange,
  disabled,
  minimumDate,
  maximumDate,
  accessibilityLabel,
}: NativeDatePickerControlProps) {
  const styles = useThemedStyles(makeStyles);

  return createElement('input', {
    type: 'date',
    'aria-label': accessibilityLabel,
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
    style: styles.input,
  });
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    input: {
      backgroundColor: c.surfaceAlt,
      borderColor: c.border,
      borderRadius: 8,
      borderWidth: 1,
      boxSizing: 'border-box',
      color: c.text,
      fontSize: 16,
      marginBottom: 16,
      padding: 12,
      width: '100%',
    },
  });
