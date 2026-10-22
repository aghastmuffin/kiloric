export type ColorSchemeName = 'light' | 'dark'

export type ThemeColors = {
  /** Root screen background. */
  background: string
  /** Raised card / grouped section background. */
  surface: string
  /** Inputs and secondary fills. */
  surfaceAlt: string
  /** Chrome surfaces such as the tab bar. */
  surfaceMuted: string
  border: string
  borderStrong: string
  /** Primary text. */
  text: string
  /** Secondary text. */
  textMuted: string
  /** Tertiary / hint text. */
  textFaint: string
  /** Primary action accent. */
  accent: string
  /** Brand accent used sparingly for editorial marks and active states. */
  brand: string
  /** Text/icon rendered on top of `brand`. */
  onBrand: string
  /** Translucent brand fill for selected states. */
  brandSoft: string
  /** Text/icon rendered on top of `accent`. */
  onAccent: string
  /** Translucent accent fill for selected states. */
  accentSoft: string
  danger: string
  /** Text rendered on danger surfaces / destructive buttons. */
  onDanger: string
  /** Solid/translucent destructive button background. */
  dangerButtonBg: string
  /** Translucent danger fill for inline error boxes. */
  dangerSoft: string
  warning: string
  success: string
  /** Monospace / token preview text. */
  mono: string
  /** Modal backdrop. */
  overlay: string
  /** Variant fed to native pickers / date pickers. */
  pickerVariant: ColorSchemeName
  /** Accent color fed to native pickers / date pickers. */
  pickerAccent: string
  /** Restrained game-layer accents. */
  xpAccent: string
  streakColor: string
  levelGlow: string
  progressTrail: string
}

export type OnboardingColors = {
  background: string
  surface: string
  card: string
  cardSelected: string
  border: string
  borderSelected: string
  accent: string
  onAccent: string
  accentMuted: string
  text: string
  textMuted: string
  textSoft: string
  danger: string
  dangerSoft: string
}

// Kiloric: warm off-white canvas, white cards, deep green actions.
export const kiloricLightColors: ThemeColors = {
  background: '#F4F2EC',
  surface: '#FFFFFF',
  surfaceAlt: '#ECE8DF',
  surfaceMuted: '#FFFFFF',
  border: '#E6E2D9',
  borderStrong: '#D3CEC3',
  text: '#17201C',
  textMuted: '#5E625F',
  textFaint: '#7C807C',
  accent: '#1B6B4F',
  brand: '#1B6B4F',
  onBrand: '#FFFFFF',
  brandSoft: '#DCEFE5',
  onAccent: '#FFFFFF',
  accentSoft: '#DCEFE5',
  danger: '#B4372F',
  onDanger: '#FFFFFF',
  dangerButtonBg: '#F6DCD8',
  dangerSoft: 'rgba(180, 55, 47, 0.09)',
  warning: '#B26F06',
  success: '#1B6B4F',
  mono: '#1B6B4F',
  overlay: 'rgba(23, 32, 28, 0.42)',
  pickerVariant: 'light',
  pickerAccent: '#1B6B4F',
  xpAccent: '#1B6B4F',
  streakColor: '#B26F06',
  levelGlow: 'rgba(27, 107, 79, 0.14)',
  progressTrail: '#E3EEE8',
}

export const kiloricDarkColors: ThemeColors = {
  background: '#0F1412',
  surface: '#1A211E',
  surfaceAlt: '#252D29',
  surfaceMuted: '#1A211E',
  border: '#2A332F',
  borderStrong: '#3A4540',
  text: '#F1F3EF',
  textMuted: '#A9B0AB',
  textFaint: '#868E89',
  accent: '#46A883',
  brand: '#46A883',
  onBrand: '#07120D',
  brandSoft: '#1E3A2F',
  onAccent: '#07120D',
  accentSoft: '#1E3A2F',
  danger: '#EE8A80',
  onDanger: '#1A0B09',
  dangerButtonBg: 'rgba(238, 138, 128, 0.16)',
  dangerSoft: 'rgba(238, 138, 128, 0.10)',
  warning: '#F0A93A',
  success: '#46A883',
  mono: '#8FD6B6',
  overlay: 'rgba(0, 0, 0, 0.6)',
  pickerVariant: 'dark',
  pickerAccent: '#46A883',
  xpAccent: '#46A883',
  streakColor: '#F0A93A',
  levelGlow: 'rgba(70, 168, 131, 0.2)',
  progressTrail: '#24332C',
}

const kiloricLightOnboardingColors: OnboardingColors = {
  background: '#F4F2EC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardSelected: '#DCEFE5',
  border: '#E6E2D9',
  borderSelected: '#1B6B4F',
  accent: '#1B6B4F',
  onAccent: '#FFFFFF',
  accentMuted: '#5E625F',
  text: '#17201C',
  textMuted: '#5E625F',
  textSoft: '#7C807C',
  danger: '#B4372F',
  dangerSoft: 'rgba(180, 55, 47, 0.09)',
}

const kiloricDarkOnboardingColors: OnboardingColors = {
  background: '#0F1412',
  surface: '#1A211E',
  card: '#1A211E',
  cardSelected: '#1E3A2F',
  border: '#2A332F',
  borderSelected: '#46A883',
  accent: '#46A883',
  onAccent: '#07120D',
  accentMuted: '#A9B0AB',
  text: '#F1F3EF',
  textMuted: '#A9B0AB',
  textSoft: '#868E89',
  danger: '#EE8A80',
  dangerSoft: 'rgba(238, 138, 128, 0.10)',
}

// Paper & Ink === the signature taeson.co aesthetic.
// Light mode: warm paper background, softly lifted surfaces, rich charcoal text.
export const paperLightColors: ThemeColors = {
  background: '#F3EFE7',
  surface: '#FCFAF5',
  surfaceAlt: '#ECE6DB',
  surfaceMuted: 'rgba(252, 250, 245, 0.95)',
  border: '#DED6C9',
  borderStrong: '#C7BDAE',
  text: '#211F1B',
  textMuted: '#625C54',
  textFaint: '#70695F',
  accent: '#211F1B',
  brand: '#A33A2E',
  onBrand: '#FFF9F1',
  brandSoft: 'rgba(163, 58, 46, 0.10)',
  onAccent: '#FFF9F1',
  accentSoft: '#E8E1D6',
  danger: '#913C35',
  onDanger: '#FFF9F1',
  dangerButtonBg: '#F3E0DC',
  dangerSoft: 'rgba(145, 60, 53, 0.09)',
  warning: '#8A641C',
  success: '#5C704E',
  mono: '#3F4D38',
  overlay: 'rgba(33, 31, 27, 0.46)',
  pickerVariant: 'light',
  pickerAccent: '#A33A2E',
  xpAccent: '#A33A2E',
  streakColor: '#9A5C1B',
  levelGlow: 'rgba(163, 58, 46, 0.10)',
  progressTrail: '#E5DED3',
}

// Dark mode: deep charcoal, off-white text, same editorial restraint.
export const paperDarkColors: ThemeColors = {
  background: '#171612',
  surface: '#211F1A',
  surfaceAlt: '#2D2A24',
  surfaceMuted: 'rgba(33, 31, 26, 0.96)',
  border: '#3C3932',
  borderStrong: '#5B554B',
  text: '#F4EFE6',
  textMuted: '#B5ADA1',
  textFaint: '#91897E',
  accent: '#F4EFE6',
  brand: '#F07865',
  onBrand: '#171612',
  brandSoft: 'rgba(240, 120, 101, 0.14)',
  onAccent: '#171612',
  accentSoft: '#302D27',
  danger: '#E1877D',
  onDanger: '#171612',
  dangerButtonBg: 'rgba(225, 135, 125, 0.15)',
  dangerSoft: 'rgba(225, 135, 125, 0.10)',
  warning: '#D7AA50',
  success: '#8CA27A',
  mono: '#C6D3B9',
  overlay: 'rgba(0, 0, 0, 0.6)',
  pickerVariant: 'dark',
  pickerAccent: '#F07865',
  xpAccent: '#F07865',
  streakColor: '#D7AA50',
  levelGlow: 'rgba(140, 162, 122, 0.2)',
  progressTrail: '#35322C',
}

// Legacy barebones preserved for theme preference switchers.
export const barebonesColors: ThemeColors = {
  background: '#25292e',
  surface: '#1e2126',
  surfaceAlt: '#3a3f47',
  surfaceMuted: '#393939',
  border: '#3a3f47',
  borderStrong: '#4a4f57',
  text: '#ffffff',
  textMuted: '#aaaaaa',
  textFaint: '#888888',
  accent: '#ffd33d',
  brand: '#ffd33d',
  onBrand: '#25292e',
  brandSoft: 'rgba(255, 211, 61, 0.12)',
  onAccent: '#25292e',
  accentSoft: 'rgba(255, 211, 61, 0.12)',
  danger: '#ff7272',
  onDanger: '#ff8a8a',
  dangerButtonBg: '#4a2c2c',
  dangerSoft: 'rgba(255, 114, 114, 0.12)',
  warning: '#ffb454',
  success: '#87ff72',
  mono: '#c8e6ff',
  overlay: 'rgba(0, 0, 0, 0.6)',
  pickerVariant: 'dark',
  pickerAccent: '#87ff72',
  xpAccent: '#aec7f7',
  streakColor: '#becab6',
  levelGlow: 'rgba(174, 199, 247, 0.35)',
  progressTrail: '#3a3f47',
}

// Legacy iOS palette preserved for theme preference switchers.
export const iosLightColors: ThemeColors = {
  background: '#F8F8F4',
  surface: '#ffffff',
  surfaceAlt: '#F4F4F0',
  surfaceMuted: '#F8F8F4',
  border: '#DADAD6',
  borderStrong: '#C9C6C1',
  text: '#353C44',
  textMuted: '#66635F',
  textFaint: '#706D68',
  accent: '#1B365D',
  brand: '#A9362A',
  onBrand: '#ffffff',
  brandSoft: 'rgba(169, 54, 42, 0.10)',
  onAccent: '#ffffff',
  accentSoft: '#DAE6D1',
  danger: '#BA1A1A',
  onDanger: '#93000A',
  dangerButtonBg: '#FFDAD6',
  dangerSoft: '#FFDAD6',
  warning: '#8A6500',
  success: '#667160',
  mono: '#1B365D',
  overlay: 'rgba(27, 54, 93, 0.38)',
  pickerVariant: 'light',
  pickerAccent: '#1B365D',
  xpAccent: '#1B365D',
  streakColor: '#667160',
  levelGlow: 'rgba(27, 54, 93, 0.18)',
  progressTrail: '#E2E3DF',
}

export const iosDarkColors: ThemeColors = {
  background: '#000000',
  surface: '#1c1c1e',
  surfaceAlt: '#2c2c2e',
  surfaceMuted: '#1c1c1e',
  border: '#38383a',
  borderStrong: '#48384a',
  text: '#ffffff',
  textMuted: '#aeaeb2',
  textFaint: '#8e8e93',
  accent: '#0a84ff',
  brand: '#FF6755',
  onBrand: '#1c1c1e',
  brandSoft: 'rgba(255, 103, 85, 0.14)',
  onAccent: '#ffffff',
  accentSoft: 'rgba(10, 132, 255, 0.18)',
  danger: '#ff453a',
  onDanger: '#ff453a',
  dangerButtonBg: 'rgba(255, 69, 58, 0.15)',
  dangerSoft: 'rgba(255, 69, 58, 0.12)',
  warning: '#ff9f0a',
  success: '#30d158',
  mono: '#64d2ff',
  overlay: 'rgba(0, 0, 0, 0.6)',
  pickerVariant: 'dark',
  pickerAccent: '#0a84ff',
  xpAccent: '#AEC7F7',
  streakColor: '#BECAB6',
  levelGlow: 'rgba(174, 199, 247, 0.28)',
  progressTrail: '#373633',
}

// Onboarding keeps its own slightly richer palette.
const paperLightOnboardingColors: OnboardingColors = {
  background: '#F7F6F2',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardSelected: 'rgba(163, 58, 46, 0.08)',
  border: '#D9D6CE',
  borderSelected: '#A33A2E',
  accent: '#A33A2E',
  onAccent: '#FFFDF8',
  accentMuted: '#6B6966',
  text: '#1A1A1A',
  textMuted: '#6B6966',
  textSoft: '#706D68',
  danger: '#8B3A3A',
  dangerSoft: 'rgba(139, 58, 58, 0.08)',
}

const paperDarkOnboardingColors: OnboardingColors = {
  background: '#1A1A1A',
  surface: '#242424',
  card: '#242424',
  cardSelected: 'rgba(255, 103, 85, 0.12)',
  border: '#373633',
  borderSelected: '#FF6755',
  accent: '#FF6755',
  onAccent: '#151515',
  accentMuted: '#92908B',
  text: '#F7F6F2',
  textMuted: '#92908B',
  textSoft: '#AAA7A0',
  danger: '#D4706E',
  dangerSoft: 'rgba(212, 112, 110, 0.10)',
}

const barebonesOnboardingColors: OnboardingColors = {
  background: '#1a1d22',
  surface: '#25292e',
  card: '#2f343b',
  cardSelected: '#3a4230',
  border: '#3a3f47',
  borderSelected: '#87ff72',
  accent: '#87ff72',
  onAccent: '#1a1d22',
  accentMuted: '#5ecf55',
  text: '#ffffff',
  textMuted: '#9aa3ad',
  textSoft: '#c5ccd3',
  danger: '#ff7272',
  dangerSoft: 'rgba(255, 114, 114, 0.12)',
}

const iosLightOnboardingColors: OnboardingColors = {
  background: '#F8F8F4',
  surface: '#ffffff',
  card: '#ffffff',
  cardSelected: '#DAE6D1',
  border: '#DADAD6',
  borderSelected: '#1B365D',
  accent: '#1B365D',
  onAccent: '#ffffff',
  accentMuted: '#667160',
  text: '#353C44',
  textMuted: '#66635F',
  textSoft: '#68655F',
  danger: '#BA1A1A',
  dangerSoft: '#FFDAD6',
}

const iosDarkOnboardingColors: OnboardingColors = {
  background: '#000000',
  surface: '#1c1c1e',
  card: '#1c1c1e',
  cardSelected: 'rgba(10, 132, 255, 0.18)',
  border: '#38383a',
  borderSelected: '#0a84ff',
  accent: '#0a84ff',
  onAccent: '#ffffff',
  accentMuted: '#409cff',
  text: '#ffffff',
  textMuted: '#aeaeb2',
  textSoft: '#d1d1d6',
  danger: '#ff453a',
  dangerSoft: 'rgba(255, 69, 58, 0.12)',
}

export type AppThemeChoice = 'kiloric' | 'paper' | 'barebones' | 'ios'

export const spacing = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28, xxl: 40, xxxl: 56 } as const
export const borderRadius = { sm: 8, md: 14, lg: 22, xl: 30, pill: 999 } as const

export function resolveThemeColors(
  choice: AppThemeChoice,
  scheme: ColorSchemeName,
): ThemeColors {
  if (choice === 'kiloric') return scheme === 'light' ? kiloricLightColors : kiloricDarkColors
  if (choice === 'paper') return scheme === 'light' ? paperLightColors : paperDarkColors
  if (choice === 'barebones') return barebonesColors
  return scheme === 'light' ? iosLightColors : iosDarkColors
}

export function resolveOnboardingColors(
  choice: AppThemeChoice,
  scheme: ColorSchemeName,
): OnboardingColors {
  if (choice === 'kiloric') {
    return scheme === 'light' ? kiloricLightOnboardingColors : kiloricDarkOnboardingColors
  }
  if (choice === 'paper') return scheme === 'light' ? paperLightOnboardingColors : paperDarkOnboardingColors
  if (choice === 'barebones') return barebonesOnboardingColors
  return scheme === 'light' ? iosLightOnboardingColors : iosDarkOnboardingColors
}
