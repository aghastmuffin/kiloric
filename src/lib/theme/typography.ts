import {
    FONT_FAMILY,
    HEADLINE_FONT_FAMILY,
} from '@/lib/fonts';

export const typography = {
  display: {
    fontFamily: HEADLINE_FONT_FAMILY,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '600' as const,
    letterSpacing: -1,
  },
  headlineLarge: {
    fontFamily: HEADLINE_FONT_FAMILY,
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '600' as const,
    letterSpacing: -0.8,
  },
  headline: {
    fontFamily: FONT_FAMILY,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '600' as const,
    letterSpacing: -0.35,
  },
  bodyLarge: {
    fontFamily: FONT_FAMILY,
    fontSize: 17,
    lineHeight: 24,
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
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  labelSmall: {
    fontFamily: FONT_FAMILY,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.15,
  },
  labelTiny: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.15,
  },
} as const
