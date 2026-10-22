import { Host } from '@expo/ui/swift-ui';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

type NativePickerHostProps = {
  children: ReactNode;
  style: StyleProp<ViewStyle>;
};

export function NativePickerHost({ children, style }: NativePickerHostProps) {
  return (
    <Host matchContents={{ vertical: true }} style={style}>
      {children}
    </Host>
  );
}
