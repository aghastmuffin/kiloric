import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

type NativePickerHostProps = {
  children: ReactNode;
  style: StyleProp<ViewStyle>;
};

export function NativePickerHost({ children, style }: NativePickerHostProps) {
  return <View style={style}>{children}</View>;
}
