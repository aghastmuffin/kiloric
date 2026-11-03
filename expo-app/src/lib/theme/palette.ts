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
  bg: '#FAF8F5',
  card: '#FFFDF8',
  ink: '#0F2E16',
  inkMuted: '#4F5B4B',
  inkFaint: '#7E8878',
  line: '#E5E2D6',
  chip: '#F0ECE1',
  primary: '#064013',
  onPrimary: '#FAF8F5',
  primaryPressed: '#05300E',
  mint: '#E7EFE1',
  mintInk: '#064013',
  mintStrong: '#4A6741',
  peach: '#F5E7C8',
  peachInk: '#8A5A08',
  peachCard: '#FFFDF8',
  inverse: '#0F2E16',
  onInverse: '#FAF8F5',
  protein: '#2E7D4F',
  proteinSoft: '#DDEBE0',
  carbs: '#D9A441',
  carbsSoft: '#F5E8CC',
  fat: '#D55930',
  fatSoft: '#F7DCD0',
  over: '#B8461F',
  restBg: '#E8EDE2',
  restInk: '#4A6741',
  danger: '#B8461F',
  dangerSoft: '#F6DCD0',
  ringTrack: '#E5ECE0',
  gridLine: '#E3DFD3',
  shadow: 'rgba(15, 46, 22, 0.06)',
}

const dark: Palette = {
  bg: '#0F1A12',
  card: '#17241B',
  ink: '#F2F5EF',
  inkMuted: '#A7B4A4',
  inkFaint: '#7E8B7B',
  line: '#27382C',
  chip: '#1F2E23',
  primary: '#8FD6B6',
  onPrimary: '#0F1A12',
  primaryPressed: '#76BD9D',
  mint: '#1D2F24',
  mintInk: '#8FD6B6',
  mintStrong: '#2F5340',
  peach: '#2E2617',
  peachInk: '#E3B34A',
  peachCard: '#241F14',
  inverse: '#F2F5EF',
  onInverse: '#0F1A12',
  protein: '#7FCF9B',
  proteinSoft: '#1E3226',
  carbs: '#E3B34A',
  carbsSoft: '#38301C',
  fat: '#EE8A5C',
  fatSoft: '#3A2418',
  over: '#EE8A5C',
  restBg: '#223327',
  restInk: '#9CC8AE',
  danger: '#F0906E',
  dangerSoft: 'rgba(240, 144, 110, 0.14)',
  ringTrack: '#223327',
  gridLine: '#27382C',
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
