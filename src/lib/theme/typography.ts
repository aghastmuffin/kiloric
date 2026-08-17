import {
  FONT_FAMILY,
  HEADLINE_FONT_FAMILY,
  MONO_FONT_FAMILY,
} from '@/lib/fonts'

export const typography = {
  display: {
    fontFamily: HEADLINE_FONT_FAMILY,
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '400' as const,
    letterSpacing: -0.96,
  },
  headlineLarge: {
    fontFamily: HEADLINE_FONT_FAMILY,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '400' as const,
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
    fontFamily: MONO_FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  labelSmall: {
    fontFamily: MONO_FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
} as const