import type { ColorSchemeName } from '@/lib/theme/tokens'
import { Platform, type ViewStyle } from 'react-native'

/** Dark surfaces stay flat. Light mode keeps an existing shadow style as written. */
export function flatInDark(scheme: ColorSchemeName): ViewStyle | null {
  if (scheme !== 'dark') return null
  return Platform.OS === 'web'
    ? ({ boxShadow: 'none', elevation: 0, shadowOpacity: 0 } as ViewStyle)
    : { shadowOpacity: 0, elevation: 0, shadowRadius: 0 }
}
