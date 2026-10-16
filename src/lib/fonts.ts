import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans'
import {
  InstrumentSerif_400Regular,
} from '@expo-google-fonts/instrument-serif'
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
} from '@expo-google-fonts/jetbrains-mono'

export const FONT_FAMILY = 'IBMPlexSans'
export const HEADLINE_FONT_FAMILY = 'InstrumentSerif'
export const MONO_FONT_FAMILY = 'JetBrainsMono'

export const textFont = { fontFamily: FONT_FAMILY } as const
export const headlineFont = { fontFamily: HEADLINE_FONT_FAMILY } as const
export const monoFont = {
  fontFamily: MONO_FONT_FAMILY,
  fontVariant: ['tabular-nums'] as ('tabular-nums')[],
}

export const fontAssets = {
  IBMPlexSans: IBMPlexSans_400Regular,
  IBMPlexSansMedium: IBMPlexSans_500Medium,
  IBMPlexSansSemiBold: IBMPlexSans_600SemiBold,
  IBMPlexSansBold: IBMPlexSans_700Bold,
  InstrumentSerif: InstrumentSerif_400Regular,
  JetBrainsMono: JetBrainsMono_400Regular,
  JetBrainsMonoMedium: JetBrainsMono_500Medium,
} as const
