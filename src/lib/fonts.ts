import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from '@expo-google-fonts/hanken-grotesk'
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono'
import {
  SourceSerif4_400Regular,
  SourceSerif4_600SemiBold,
  SourceSerif4_700Bold,
} from '@expo-google-fonts/source-serif-4'

export const FONT_FAMILY = 'HankenGrotesk'
export const HEADLINE_FONT_FAMILY = 'SourceSerif4'
export const MONO_FONT_FAMILY = 'JetBrainsMono'

export const textFont = { fontFamily: FONT_FAMILY } as const
export const headlineFont = { fontFamily: HEADLINE_FONT_FAMILY } as const
export const monoFont = { fontFamily: MONO_FONT_FAMILY } as const

export const fontAssets = {
  HankenGrotesk: HankenGrotesk_400Regular,
  HankenGroteskMedium: HankenGrotesk_500Medium,
  HankenGroteskSemiBold: HankenGrotesk_600SemiBold,
  HankenGroteskBold: HankenGrotesk_700Bold,
  SourceSerif4: SourceSerif4_400Regular,
  SourceSerif4SemiBold: SourceSerif4_600SemiBold,
  SourceSerif4Bold: SourceSerif4_700Bold,
  JetBrainsMono: JetBrainsMono_400Regular,
  JetBrainsMonoMedium: JetBrainsMono_500Medium,
} as const
