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
  protein: string
  carbs: string
  fat: string
  /** Monospace / token preview text. */
  mono: string
  /** Modal backdrop. */
  overlay: string
  /** Variant fed to native pickers / date pickers. */
  pickerVariant: ColorSchemeName
  /** Accent color fed to native pickers / date pickers. */
  pickerAccent: string
  progressTrail: string
}

/** Derived view of the main palette. Onboarding does not own separate colors. */
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

// Paper is the single light theme: warm paper, charcoal ink, rust marker.
export const paperLightColors: ThemeColors = {
  background: '#F3EFE7',
  surface: '#FCFAF5',
  surfaceAlt: '#ECE6DB',
  surfaceMuted: '#FCFAF5',
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
  protein: '#5C704E',
  carbs: '#8A641C',
  fat: '#5E6E84',
  mono: '#3F4D38',
  overlay: 'rgba(33, 31, 27, 0.46)',
  pickerVariant: 'light',
  pickerAccent: '#A33A2E',
  progressTrail: '#E5DED3',
}

// Night ledger is the default dark theme.
export const nightLedgerColors: ThemeColors = {
  background: '#121110',
  surface: '#1B1A17',
  surfaceAlt: '#25231F',
  surfaceMuted: '#1B1A17',
  border: '#2F2C27',
  borderStrong: '#45413A',
  text: '#ECE6DA',
  textMuted: '#A39B8F',
  textFaint: '#776F65',
  accent: '#E0664E',
  brand: '#E0664E',
  onBrand: '#121110',
  brandSoft: 'rgba(224, 102, 78, 0.12)',
  onAccent: '#121110',
  accentSoft: 'rgba(224, 102, 78, 0.12)',
  danger: '#E07A6E',
  onDanger: '#121110',
  dangerButtonBg: 'rgba(224, 122, 110, 0.15)',
  dangerSoft: 'rgba(224, 122, 110, 0.12)',
  warning: '#C9A25A',
  success: '#93A67F',
  protein: '#93A67F',
  carbs: '#C9A25A',
  fat: '#8E9BB0',
  mono: '#C9C2B6',
  overlay: 'rgba(0, 0, 0, 0.62)',
  pickerVariant: 'dark',
  pickerAccent: '#E0664E',
  progressTrail: '#2F2C27',
}

export type AppThemeChoice = 'night' | 'paper'

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const
export const borderRadius = { sm: 10, md: 10, lg: 10, xl: 10, pill: 999 } as const

export function resolveThemeColors(choice: AppThemeChoice): ThemeColors {
  return choice === 'paper' ? paperLightColors : nightLedgerColors
}

export function onboardingColorsFromTheme(colors: ThemeColors): OnboardingColors {
  return {
    background: colors.background,
    surface: colors.surface,
    card: colors.surface,
    cardSelected: colors.brandSoft,
    border: colors.border,
    borderSelected: colors.brand,
    accent: colors.brand,
    onAccent: colors.onBrand,
    accentMuted: colors.textMuted,
    text: colors.text,
    textMuted: colors.textMuted,
    textSoft: colors.textFaint,
    danger: colors.danger,
    dangerSoft: colors.dangerSoft,
  }
}
