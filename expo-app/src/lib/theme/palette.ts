import { useTheme } from '@/lib/theme/ThemeContext'
import type { ColorSchemeName } from '@/lib/theme/tokens'

export type Palette = {
  bg: string
  card: string
  ink: string
  inkMuted: string
  inkFaint: string
  line: string
  chip: string
  primary: string
  onPrimary: string
  primaryPressed: string
  mint: string
  mintInk: string
  mintStrong: string
  peach: string
  peachInk: string
  peachCard: string
  inverse: string
  onInverse: string
  protein: string
  proteinSoft: string
  carbs: string
  carbsSoft: string
  fat: string
  fatSoft: string
  over: string
  restBg: string
  restInk: string
  danger: string
  dangerSoft: string
  ringTrack: string
  gridLine: string
  shadow: string
}

const light: Palette = {
  bg: '#F4F2EC',
  card: '#FFFFFF',
  ink: '#17201C',
  inkMuted: '#5E625F',
  inkFaint: '#7C807C',
  line: '#ECE9E2',
  chip: '#EAE6DD',
  primary: '#1B6B4F',
  onPrimary: '#FFFFFF',
  primaryPressed: '#15583F',
  mint: '#DCEFE5',
  mintInk: '#1B6B4F',
  mintStrong: '#9CCBB4',
  peach: '#FCEBD3',
  peachInk: '#7A4508',
  peachCard: '#FFFFFF',
  inverse: '#17211D',
  onInverse: '#FFFFFF',
  protein: '#3358D4',
  proteinSoft: '#DFE6FB',
  carbs: '#D98A0B',
  carbsSoft: '#FBE7C6',
  fat: '#C93C6A',
  fatSoft: '#F8DAE4',
  over: '#D98A0B',
  restBg: '#E2E8FB',
  restInk: '#2A47B0',
  danger: '#B4372F',
  dangerSoft: '#F6DCD8',
  ringTrack: '#E3EEE8',
  gridLine: '#E6E2D9',
  shadow: 'rgba(23, 32, 28, 0.06)',
}

const dark: Palette = {
  bg: '#0F1412',
  card: '#1A211E',
  ink: '#F1F3EF',
  inkMuted: '#A9B0AB',
  inkFaint: '#868E89',
  line: '#27302C',
  chip: '#252D29',
  primary: '#46A883',
  onPrimary: '#07120D',
  primaryPressed: '#3A926F',
  mint: '#1E3A2F',
  mintInk: '#8FD6B6',
  mintStrong: '#2F6B53',
  peach: '#3A2C1A',
  peachInk: '#F3C27D',
  peachCard: '#2A2117',
  inverse: '#E9EDEA',
  onInverse: '#0F1412',
  protein: '#86A2FF',
  proteinSoft: '#26304F',
  carbs: '#F0A93A',
  carbsSoft: '#3D3020',
  fat: '#F07AA0',
  fatSoft: '#432634',
  over: '#F0A93A',
  restBg: '#232B45',
  restInk: '#AFC2FF',
  danger: '#EE8A80',
  dangerSoft: 'rgba(238, 138, 128, 0.14)',
  ringTrack: '#24332C',
  gridLine: '#2A332F',
  shadow: 'rgba(0, 0, 0, 0.3)',
}

export function paletteFor(scheme: ColorSchemeName): Palette {
  return scheme === 'dark' ? dark : light
}

export function usePalette(): Palette {
  const { scheme } = useTheme()
  return paletteFor(scheme)
}

export const fonts = {
  regular: 'InterTight',
  medium: 'InterTightMedium',
  semibold: 'InterTightSemiBold',
  bold: 'InterTightBold',
  heavy: 'InterTightExtraBold',
} as const

export const radii = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const
