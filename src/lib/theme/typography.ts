import { FONT_FAMILY } from '@/lib/fonts'

/** Shared type scale — uses the active Redaction family when custom fonts are on. */
export const typography = {
  display: {
    fontFamily: FONT_FAMILY,
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '700' as const,
    letterSpacing: -0.96,
  },
  headlineLarge: {
    fontFamily: FONT_FAMILY,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '600' as const,
  },
  headline: {
    fontFamily: FONT_FAMILY,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as const,
  },
  bodyLarge: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    lineHeight: 28,
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    lineHeight: 24,
  },
  label: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
    letterSpacing: 0.28,
  },
  labelSmall: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.6,
  },
} as const
