import { useWindowDimensions } from 'react-native'

/** Shared geometry keeps every route comfortable on phones and restrained on web. */
export const appLayout = {
  contentMaxWidth: 760,
  compactBreakpoint: 390,
  compactGutter: 16,
  regularGutter: 20,
  minimumTouchTarget: 44,
  tabBarClearance: 112,
} as const

export function useAppLayout() {
  const { width } = useWindowDimensions()
  const compact = width < appLayout.compactBreakpoint

  return {
    compact,
    gutter: compact ? appLayout.compactGutter : appLayout.regularGutter,
  }
}
