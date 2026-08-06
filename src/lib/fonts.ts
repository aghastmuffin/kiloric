export const FONT_FAMILY = 'Redaction';

export const textFont = { fontFamily: FONT_FAMILY } as const;

/** Drop redaction.ttf at assets/fonts/redaction.ttf when ready. */
export const fontAssets = {
  [FONT_FAMILY]: require('../../assets/fonts/redaction.otf'),
} as const;
