import { triggerSelectionHaptic } from '@/lib/haptics'
import { fonts, usePalette, type Palette } from '@/lib/theme/palette'
import { Button, Host, Row, Spacer, Text } from '@expo/ui'
import { useState } from 'react'
import { Platform, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native'

export type ButtonTone = 'primary' | 'inverse' | 'mint' | 'chip' | 'card' | 'ghost' | 'blue' | 'danger'
export type ButtonSize = 'lg' | 'md' | 'sm'

type UButtonProps = {
  label: string
  /** Right-aligned secondary label, e.g. a kcal total on a primary action. */
  trailing?: string
  onPress?: () => void
  tone?: ButtonTone
  size?: ButtonSize
  fullWidth?: boolean
  disabled?: boolean
  testID?: string
  /** Outer wrapper style (margins / flex). */
  style?: StyleProp<ViewStyle>
}

const HEIGHTS: Record<ButtonSize, number> = { lg: 64, md: 50, sm: 40 }
const FONT_SIZES: Record<ButtonSize, number> = { lg: 18, md: 16, sm: 15 }

export function toneColors(c: Palette, tone: ButtonTone): { bg: string; fg: string } {
  switch (tone) {
    case 'primary':
      return { bg: c.primary, fg: c.onPrimary }
    case 'inverse':
      return { bg: c.inverse, fg: c.onInverse }
    case 'mint':
      return { bg: c.mint, fg: c.mintInk }
    case 'chip':
      return { bg: c.chip, fg: c.ink }
    case 'card':
      return { bg: c.card, fg: c.ink }
    case 'blue':
      return { bg: c.protein, fg: '#FFFFFF' }
    case 'danger':
      return { bg: c.dangerSoft, fg: c.danger }
    case 'ghost':
    default:
      return { bg: 'transparent', fg: c.inkMuted }
  }
}

/**
 * Text-labelled button built from Expo UI universal components, so it renders
 * as a SwiftUI / Jetpack Compose button on native and a styled button on web.
 */
export function UButton({
  label,
  trailing,
  onPress,
  tone = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  testID,
  style,
}: UButtonProps) {
  const c = usePalette()
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null)
  const { bg, fg } = toneColors(c, tone)
  const height = HEIGHTS[size]
  const isWeb = Platform.OS === 'web'
  const width: DimensionValue | undefined = fullWidth ? (isWeb ? '100%' : measuredWidth ?? undefined) : undefined
  const radius = size === 'lg' ? 22 : height / 2
  const textStyle = { color: fg, fontFamily: fonts.bold, fontSize: FONT_SIZES[size] }

  const handlePress = () => {
    if (disabled) return
    triggerSelectionHaptic()
    onPress?.()
  }

  const button = (
    <Host matchContents={!fullWidth} ignoreSafeArea="all" style={fullWidth ? { width: '100%', height } : undefined}>
      <Button
        variant="text"
        onPress={handlePress}
        disabled={disabled}
        testID={testID}
        style={{
          backgroundColor: bg,
          borderRadius: radius,
          height,
          width: width as number | undefined,
          paddingHorizontal: size === 'sm' ? 16 : 24,
        }}
      >
        {trailing ? (
          <Row alignment="center" spacing={8}>
            <Text textStyle={textStyle}>{label}</Text>
            <Spacer flexible />
            <Text textStyle={textStyle}>{trailing}</Text>
          </Row>
        ) : (
          <Text textStyle={textStyle} numberOfLines={1}>
            {label}
          </Text>
        )}
      </Button>
    </Host>
  )

  if (fullWidth && !isWeb) {
    return (
      <View
        style={[{ width: '100%', height }, style]}
        onLayout={(event) => setMeasuredWidth(Math.round(event.nativeEvent.layout.width))}
      >
        {measuredWidth != null ? button : null}
      </View>
    )
  }

  return <View style={[fullWidth ? { width: '100%' } : null, style]}>{button}</View>
}
