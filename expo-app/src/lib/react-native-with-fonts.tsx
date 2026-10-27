import { getActiveFontFamily, getActiveFontOverridesRoles } from '@/lib/appFont'
import React from 'react'
import {
  StyleSheet,
  Text as OriginalText,
  TextInput as OriginalTextInput,
} from 'react-native-original'
import type { StyleProp, TextInputProps, TextProps, TextStyle } from 'react-native-original'

export * from 'react-native-original'

function resolveInterWeightFont(weight?: TextStyle['fontWeight']): string {
  switch (weight) {
    case '300':
      return 'InterTightLight'
    case '500':
      return 'InterTightMedium'
    case '600':
      return 'InterTightSemiBold'
    case '700':
    case 'bold':
      return 'InterTightBold'
    case '800':
    case '900':
      return 'InterTightExtraBold'
    default:
      return 'InterTight'
  }
}

function mergeFontStyle(style: StyleProp<TextStyle>) {
  const activeFont = getActiveFontFamily()
  if (!activeFont) {
    return style
  }

  if (getActiveFontOverridesRoles()) {
    return [style, { fontFamily: activeFont }]
  }

  const flat = style ? StyleSheet.flatten(style) : undefined
  if (!flat) {
    return { fontFamily: activeFont }
  }

  if (flat.fontFamily && flat.fontFamily !== 'InterTight') {
    return style
  }

  if (activeFont === 'InterTight') {
    const resolvedFont = resolveInterWeightFont(flat.fontWeight)
    return [style, { fontFamily: resolvedFont }]
  }

  return [{ fontFamily: activeFont }, style]
}

export const Text = React.forwardRef<React.ComponentRef<typeof OriginalText>, TextProps>(
  function Text(props, ref) {
    return <OriginalText {...props} ref={ref} style={mergeFontStyle(props.style)} />
  },
)
Text.displayName = 'Text'

export const TextInput = React.forwardRef<
  React.ComponentRef<typeof OriginalTextInput>,
  TextInputProps
>(function TextInput(props, ref) {
  return <OriginalTextInput {...props} ref={ref} style={mergeFontStyle(props.style)} />
})
TextInput.displayName = 'TextInput'
