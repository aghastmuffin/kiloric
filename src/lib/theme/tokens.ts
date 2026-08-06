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

// Barebones === the app's original styling, preserved verbatim.
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
  borderStrong: '#48484a',
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

// Onboarding keeps its own slightly richer palette (green accent in barebones).
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

export type AppThemeChoice = 'ios' | 'barebones'

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const
export const borderRadius = { sm: 4, md: 8, lg: 12, pill: 999 } as const

export function resolveThemeColors(
  choice: AppThemeChoice,
  scheme: ColorSchemeName,
): ThemeColors {
  if (choice === 'barebones') return barebonesColors
  return scheme === 'light' ? iosLightColors : iosDarkColors
}

export function resolveOnboardingColors(
  choice: AppThemeChoice,
  scheme: ColorSchemeName,
): OnboardingColors {
  if (choice === 'barebones') return barebonesOnboardingColors
  return scheme === 'light' ? iosLightOnboardingColors : iosDarkOnboardingColors
}
