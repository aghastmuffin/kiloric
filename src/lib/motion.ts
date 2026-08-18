import { Easing, type WithSpringConfig } from 'react-native-reanimated'

export const tapSpring: WithSpringConfig = {
  damping: 24,
  stiffness: 350,
  mass: 0.5,
}

export const panelSpring: WithSpringConfig = {
  damping: 24,
  stiffness: 200,
  mass: 0.75,
}

export const celebrationSpring: WithSpringConfig = {
  damping: 10,
  stiffness: 150,
  mass: 0.8,
}

export const quickTiming = {
  duration: 120,
  easing: Easing.out(Easing.cubic),
} as const

export const revealTiming = {
  duration: 200,
  easing: Easing.out(Easing.cubic),
} as const

/** Longer ease used by progress fills (ProgressRing / MacroProgressBar). */
export const panelTiming = {
  duration: 360,
  easing: Easing.out(Easing.cubic),
} as const