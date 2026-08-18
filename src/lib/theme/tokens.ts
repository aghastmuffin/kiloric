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
  accentMuted: string
  text: string
  textMuted: string
  textSoft: string
  danger: string
}

// Paper & Ink === the signature taeson.co aesthetic.
// Light mode: warm paper background, pure white cards, rich charcoal text.
export const paperLightColors: ThemeColors = {
  background: '#F7F6F2',
  surface: '#FFFFFF',
  surfaceAlt: '#EBEAE4',
  surfaceMuted: '#F7F6F2',
  border: '#D0CEC5',
  borderStrong: '#A3A196',
  text: '#1A1A1A',
  textMuted: '#6B6966',
  textFaint: '#92908B',
  accent: '#1A1A1A',
  onAccent: '#F7F6F2',
  accentSoft: '#EBEAE4',
  danger: '#8B3A3A',
  onDanger: '#FFFFFF',
  dangerButtonBg: '#F5E8E8',
  dangerSoft: 'rgba(139, 58, 58, 0.08)',
  warning: '#A67C00',
  success: '#4A6741',
  mono: '#1A1A1A',
  overlay: 'rgba(26, 26, 26, 0.4)',
  pickerVariant: 'light',
  pickerAccent: '#1A1A1A',
  xpAccent: '#4A6741',
  streakColor: '#A67C00',
  levelGlow: 'rgba(74, 103, 65, 0.12)',
  progressTrail: '#EBEAE4',
}

// Dark mode: deep charcoal, off-white text, same editorial restraint.
export const paperDarkColors: ThemeColors = {
  background: '#1A1A1A',
  surface: '#242424',
  surfaceAlt: '#2E2E2E',
  surfaceMuted: '#1A1A1A',
  border: '#3A3A3A',
  borderStrong: '#4A4A4A',
  text: '#F7F6F2',
  textMuted: '#92908B',
  textFaint: '#6B6966',
  accent: '#F7F6F2',
  onAccent: '#1A1A1A',
  accentSoft: '#2E2E2E',
  danger: '#D4706E',
  onDanger: '#1A1A1A',
  dangerButtonBg: 'rgba(212, 112, 110, 0.15)',
  dangerSoft: 'rgba(212, 112, 110, 0.1)',
  warning: '#D4A030',
  success: '#6B9B5E',
  mono: '#EBEAE4',
  overlay: 'rgba(0, 0, 0, 0.6)',
  pickerVariant: 'dark',
  pickerAccent: '#F7F6F2',
  xpAccent: '#6B9B5E',
  streakColor: '#D4A030',
  levelGlow: 'rgba(107, 155, 94, 0.2)',
  progressTrail: '#2E2E2E',
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
  textMuted: '#787672',
  textFaint: '#92908B',
  accent: '#1B365D',
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
  cardSelected: '#EBEAE4',
  border: '#D0CEC5',
  borderSelected: '#1A1A1A',
  accent: '#1A1A1A',
  accentMuted: '#6B6966',
  text: '#1A1A1A',
  textMuted: '#6B6966',
  textSoft: '#92908B',
  danger: '#8B3A3A',
}

const paperDarkOnboardingColors: OnboardingColors = {
  background: '#1A1A1A',
  surface: '#242424',
  card: '#242424',
  cardSelected: '#2E2E2E',
  border: '#3A3A3A',
  borderSelected: '#F7F6F2',
  accent: '#F7F6F2',
  accentMuted: '#92908B',
  text: '#F7F6F2',
  textMuted: '#92908B',
  textSoft: '#6B6966',
  danger: '#D4706E',
}

const barebonesOnboardingColors: OnboardingColors = {
  background: '#1a1d22',
  surface: '#25292e',
  card: '#2f343b',
  cardSelected: '#3a4230',
  border: '#3a3f47',
  borderSelected: '#87ff72',
  accent: '#87ff72',
  accentMuted: '#5ecf55',
  text: '#ffffff',
  textMuted: '#9aa3ad',
  textSoft: '#c5ccd3',
  danger: '#ff7272',
}

const iosLightOnboardingColors: OnboardingColors = {
  background: '#F8F8F4',
  surface: '#ffffff',
  card: '#ffffff',
  cardSelected: '#DAE6D1',
  border: '#DADAD6',
  borderSelected: '#1B365D',
  accent: '#1B365D',
  accentMuted: '#667160',
  text: '#353C44',
  textMuted: '#787672',
  textSoft: '#576251',
  danger: '#BA1A1A',
}

const iosDarkOnboardingColors: OnboardingColors = {
  background: '#000000',
  surface: '#1c1c1e',
  card: '#1c1c1e',
  cardSelected: 'rgba(10, 132, 255, 0.18)',
  border: '#38383a',
  borderSelected: '#0a84ff',
  accent: '#0a84ff',
  accentMuted: '#409cff',
  text: '#ffffff',
  textMuted: '#aeaeb2',
  textSoft: '#d1d1d6',
  danger: '#ff453a',
}

export type AppThemeChoice = 'paper' | 'barebones' | 'ios'

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const
export const borderRadius = { sm: 4, md: 8, lg: 12, pill: 999 } as const

export function resolveThemeColors(
  choice: AppThemeChoice,
  scheme: ColorSchemeName,
): ThemeColors {
  if (choice === 'paper') return scheme === 'light' ? paperLightColors : paperDarkColors
  if (choice === 'barebones') return barebonesColors
  return scheme === 'light' ? iosLightColors : iosDarkColors
}

export function resolveOnboardingColors(
  choice: AppThemeChoice,
  scheme: ColorSchemeName,
): OnboardingColors {
  if (choice === 'paper') return scheme === 'light' ? paperLightOnboardingColors : paperDarkOnboardingColors
  if (choice === 'barebones') return barebonesOnboardingColors
  return scheme === 'light' ? iosLightOnboardingColors : iosDarkOnboardingColors
}