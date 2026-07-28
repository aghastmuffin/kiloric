import { Easing, type WithSpringConfig } from 'react-native-reanimated'

/**
 * Shared motion tokens — snack cabinet is the reference feel.
 * Slightly overdamped so panels settle cleanly without a big bounce.
 */
export const panelSpring: WithSpringConfig = {
  damping: 24,
  stiffness: 170,
  mass: 0.9,
}

/** Lift / settle for drag previews — same family, a touch snappier. */
export const dragSpring: WithSpringConfig = {
  damping: 22,
  stiffness: 200,
  mass: 0.85,
}

/** Layout transitions (expand/collapse cards, list reflow). */
export const layoutSpring = {
  damping: 24,
  stiffness: 170,
} as const

/** Soft ease-out used for progress fills and fades that pair with panelSpring. */
export const panelEasing = Easing.out(Easing.cubic)

export const panelTiming = {
  duration: 420,
  easing: panelEasing,
} as const

export const fadeTiming = {
  duration: 240,
  easing: panelEasing,
} as const

/** Bouncier animation configuration for achievements or milestones. */
export const celebrationSpring: WithSpringConfig = {
  damping: 12,
  stiffness: 120,
  mass: 0.8,
}

/** Snap feedback for micro button interactions. */
export const microBounce: WithSpringConfig = {
  damping: 15,
  stiffness: 300,
  mass: 0.5,
}

/** Layout timing for count-up tickers. */
export const countUpTiming = {
  duration: 1000,
  easing: Easing.out(Easing.quad),
} as const

/** Timing configuration for shimmer skeletons. */
export const shimmerTiming = {
  duration: 1200,
  easing: Easing.linear,
} as const
