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

// Paper & Ink === the signature taeson.co aesthetic.
// Light mode: warm paper background, softly lifted surfaces, rich charcoal text.
export const paperLightColors: ThemeColors = {
  background: '#F7F6F2',
  surface: '#FBFAF7',
  surfaceAlt: '#ECEAE3',
  surfaceMuted: '#F7F6F2',
  border: '#D9D6CE',
  borderStrong: '#B8B4AB',
  text: '#121216',
  textMuted: '#6E6E6A',
  textFaint: '#96948E',
  accent: '#121216',
  brand: '#D6402F',
  onBrand: '#FFFDF8',
  brandSoft: 'rgba(214, 64, 47, 0.10)',
  onAccent: '#F7F6F2',
  accentSoft: '#E7E5DE',
  danger: '#8B3A3A',
  onDanger: '#FFFFFF',
  dangerButtonBg: '#F5E8E8',
  dangerSoft: 'rgba(139, 58, 58, 0.08)',
  warning: '#A67C00',
  success: '#4A6741',
  mono: '#1A1A1A',
  overlay: 'rgba(26, 26, 26, 0.4)',
  pickerVariant: 'light',
  pickerAccent: '#D6402F',
  xpAccent: '#D6402F',
  streakColor: '#B96725',
  levelGlow: 'rgba(74, 103, 65, 0.12)',
  progressTrail: '#EBEAE4',
}

// Dark mode: deep charcoal, off-white text, same editorial restraint.
export const paperDarkColors: ThemeColors = {
  background: '#151515',
  surface: '#1C1C1B',
  surfaceAlt: '#292826',
  surfaceMuted: '#151515',
  border: '#373633',
  borderStrong: '#56534D',
  text: '#F7F6F2',
  textMuted: '#AAA7A0',
  textFaint: '#74716B',
  accent: '#F7F6F2',
  brand: '#FF6755',
  onBrand: '#151515',
  brandSoft: 'rgba(255, 103, 85, 0.14)',
  onAccent: '#151515',
  accentSoft: '#292826',
  danger: '#D4706E',
  onDanger: '#1A1A1A',
  dangerButtonBg: 'rgba(212, 112, 110, 0.15)',
  dangerSoft: 'rgba(212, 112, 110, 0.1)',
  warning: '#D4A030',
  success: '#6B9B5E',
  mono: '#EBEAE4',
  overlay: 'rgba(0, 0, 0, 0.6)',
  pickerVariant: 'dark',
  pickerAccent: '#FF6755',
  xpAccent: '#FF6755',
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
  textMuted: '#787672',
  textFaint: '#92908B',
  accent: '#1B365D',
  brand: '#D6402F',
  onBrand: '#ffffff',
  brandSoft: 'rgba(214, 64, 47, 0.10)',
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
  cardSelected: 'rgba(214, 64, 47, 0.08)',
  border: '#D9D6CE',
  borderSelected: '#D6402F',
  accent: '#D6402F',
  onAccent: '#FFFDF8',
  accentMuted: '#6B6966',
  text: '#1A1A1A',
  textMuted: '#6B6966',
  textSoft: '#92908B',
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
  textSoft: '#6B6966',
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
  textMuted: '#787672',
  textSoft: '#576251',
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

export type AppThemeChoice = 'paper' | 'barebones' | 'ios'

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const
export const borderRadius = { sm: 3, md: 6, lg: 10, pill: 999 } as const

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
