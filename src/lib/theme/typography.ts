import { useFontPreferences } from '@/lib/FontPreferencesContext';
import { useMemo } from 'react';

export type TypographyStyles = {
  heading1: { fontFamily?: string; fontSize: number; fontWeight: 'bold'; lineHeight?: number }
  heading2: { fontFamily?: string; fontSize: number; fontWeight: '600'; lineHeight?: number }
  body: { fontFamily?: string; fontSize: number; fontWeight: 'normal'; lineHeight?: number }
  caption: { fontFamily?: string; fontSize: number; fontWeight: 'normal'; lineHeight?: number }
  stat: { fontFamily?: string; fontSize: number; fontWeight: 'bold'; lineHeight?: number }
}

export function getTypographyStyles(activeFontFamily?: string): TypographyStyles {
  const fontStyle = activeFontFamily ? { fontFamily: activeFontFamily } : {};
  return {
    heading1: {
      ...fontStyle,
      fontSize: 28,
      fontWeight: 'bold',
      lineHeight: 34,
    },
    heading2: {
      ...fontStyle,
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 26,
    },
    body: {
      ...fontStyle,
      fontSize: 16,
      fontWeight: 'normal',
      lineHeight: 22,
    },
    caption: {
      ...fontStyle,
      fontSize: 12,
      fontWeight: 'normal',
      lineHeight: 16,
    },
    stat: {
      ...fontStyle,
      fontSize: 36,
      fontWeight: 'bold',
      lineHeight: 42,
    },
  };
}

export function useTypography(): TypographyStyles {
  const { activeFontFamily } = useFontPreferences();
  return useMemo(() => getTypographyStyles(activeFontFamily), [activeFontFamily]);
}
