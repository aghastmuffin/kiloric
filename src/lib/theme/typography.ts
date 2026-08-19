import {
    FONT_FAMILY,
    HEADLINE_FONT_FAMILY,
    MONO_FONT_FAMILY,
} from '@/lib/fonts';

export const typography = {
  display: {
    fontFamily: HEADLINE_FONT_FAMILY,
    fontSize: 52,
    lineHeight: 54,
    fontWeight: '400' as const,
    letterSpacing: -1.3,
  },
  headlineLarge: {
    fontFamily: HEADLINE_FONT_FAMILY,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '400' as const,
  },
  headline: {
    fontFamily: FONT_FAMILY,
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '500' as const,
    letterSpacing: -0.5,
  },
  bodyLarge: {
    fontFamily: FONT_FAMILY,
    fontSize: 18,
    lineHeight: 26,
  },
  body: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    lineHeight: 23,
  },
  bodySmall: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    fontFamily: MONO_FONT_FAMILY,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400' as const,
    letterSpacing: 1.35,
    textTransform: 'uppercase',
  },
  labelSmall: {
    fontFamily: MONO_FONT_FAMILY,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400' as const,
    letterSpacing: 1.25,
    textTransform: 'uppercase',
  },
  labelTiny: {
    fontFamily: MONO_FONT_FAMILY,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '400' as const,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
} as const
