import { getActiveFontFamily } from '@/lib/appFont'
import React from 'react'
import {
  Text as OriginalText,
  TextInput as OriginalTextInput,
} from 'react-native-original'
import type { StyleProp, TextInputProps, TextProps, TextStyle } from 'react-native-original'

export * from 'react-native-original'

function mergeFontStyle(style: StyleProp<TextStyle>) {
  const fontFamily = getActiveFontFamily()
  if (!fontFamily) {
    return style
  }

  return [{ fontFamily }, style]
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
