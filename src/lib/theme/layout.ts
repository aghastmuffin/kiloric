import { useWindowDimensions } from 'react-native'

/** Shared geometry keeps every route comfortable on phones and restrained on web. */
export const appLayout = {
  contentMaxWidth: 680,
  compactBreakpoint: 390,
  compactGutter: 16,
  regularGutter: 24,
  minimumTouchTarget: 44,
  tabBarClearance: 96,
} as const

export function useAppLayout() {
  const { width } = useWindowDimensions()
  const compact = width < appLayout.compactBreakpoint

  return {
    compact,
    gutter: compact ? appLayout.compactGutter : appLayout.regularGutter,
  }
}
