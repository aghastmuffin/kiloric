import { Easing, type WithSpringConfig } from 'react-native-reanimated'

export const tapSpring: WithSpringConfig = {
  damping: 24,
  stiffness: 310,
  mass: 0.65,
}

export const panelSpring: WithSpringConfig = {
  damping: 24,
  stiffness: 180,
  mass: 0.85,
}

export const celebrationSpring: WithSpringConfig = {
  damping: 10,
  stiffness: 150,
  mass: 0.8,
}

export const quickTiming = {
  duration: 180,
  easing: Easing.out(Easing.cubic),
} as const
