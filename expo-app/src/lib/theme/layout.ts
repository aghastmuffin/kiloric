import { useWindowDimensions } from 'react-native'

/** Shared geometry keeps every route comfortable on phones and restrained on web. */
export const appLayout = {
  contentMaxWidth: 720,
  readingMaxWidth: 620,
  pageMaxWidth: 1120,
  compactBreakpoint: 400,
  wideBreakpoint: 900,
  compactGutter: 16,
  regularGutter: 24,
  minimumTouchTarget: 44,
  tabBarClearance: 96,
} as const

export function useAppLayout() {
  const { width, fontScale } = useWindowDimensions()
  const compact = width < appLayout.compactBreakpoint
  const wide = width >= appLayout.wideBreakpoint

  return {
    compact,
    wide,
    width,
    fontScale,
    gutter: compact ? appLayout.compactGutter : appLayout.regularGutter,
  }
}
