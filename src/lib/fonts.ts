import {
  InterTight_300Light,
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
} from '@expo-google-fonts/inter-tight'
import {
  InstrumentSerif_400Regular,
} from '@expo-google-fonts/instrument-serif'
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono'

export const FONT_FAMILY = 'InterTight'
export const HEADLINE_FONT_FAMILY = 'InstrumentSerif'
export const MONO_FONT_FAMILY = 'JetBrainsMono'

export const textFont = { fontFamily: FONT_FAMILY } as const
export const headlineFont = { fontFamily: HEADLINE_FONT_FAMILY } as const
export const monoFont = { fontFamily: MONO_FONT_FAMILY } as const

export const fontAssets = {
  InterTight: InterTight_400Regular,
  InterTightLight: InterTight_300Light,
  InterTightMedium: InterTight_500Medium,
  InterTightSemiBold: InterTight_600SemiBold,
  InstrumentSerif: InstrumentSerif_400Regular,
  JetBrainsMono: JetBrainsMono_400Regular,
  JetBrainsMonoMedium: JetBrainsMono_500Medium,
} as const