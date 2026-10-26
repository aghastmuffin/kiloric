import type {
  ActivityLevel,
  DietStyle,
  FitnessGoal,
  GoalPace,
  Sex,
} from '@/lib/nutrition'
import { guessCountryCode, usernameFromEmail } from '@/lib/nutrition'
import { isAsianCountry, type RaceValue } from '@/lib/residency'
import { defaultDisplayUnits, type DisplayUnits } from '@/lib/units'

export type MacroOverrides = {
  targetKcal: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
}

export type OnboardingStep =
  | 'eligibility'
  | 'email'
  | 'password'
  | 'welcome'
  | 'body'
  | 'lifestyle'
  | 'diet'
  | 'plan'

export const AUTH_ONBOARDING_STEPS: OnboardingStep[] = ['email', 'password']

// Eligibility is verified before any account information is collected.
export const ONBOARDING_STEPS: OnboardingStep[] = [
  'eligibility',
  'email',
  'password',
  'welcome',
  'body',
  'lifestyle',
  'diet',
  'plan',
]

export function getOnboardingSteps(isAuthenticated: boolean): OnboardingStep[] {
  if (isAuthenticated) {
    return ONBOARDING_STEPS.filter((step) => !AUTH_ONBOARDING_STEPS.includes(step))
  }
  return ONBOARDING_STEPS
}

export type OnboardingFormState = {
  username: string
  dateOfBirth: Date
  /** ISO country of residence. */
  country: string
  /** Self-reported race. Empty until the person chooses. */
  race: RaceValue | ''
  /** Explicit answer to “Do you reside in any country in Asia?” */
  residesInAsia: boolean | null
  bio: string
  sex: Sex | null
  height: number
  weight: number
  /** Optional measured body-fat %; switches BMR to Katch–McArdle. */
  bodyFatPct: number | null
  activity: ActivityLevel
  goal: FitnessGoal | null
  pace: GoalPace
  diet: DietStyle
  targetWeight: number | null
  displayUnits: DisplayUnits
  macroOverrides: MacroOverrides | null
}

export const DEFAULT_DATE_OF_BIRTH = new Date(1995, 0, 15)

export function createDefaultFormState(email?: string | null): OnboardingFormState {
  const country = guessCountryCode()
  return {
    username: email ? usernameFromEmail(email) : '',
    dateOfBirth: DEFAULT_DATE_OF_BIRTH,
    country,
    race: '',
    residesInAsia: isAsianCountry(country) ? true : null,
    bio: '',
    sex: null,
    height: 170,
    weight: 70,
    bodyFatPct: null,
    activity: 'moderate',
    goal: null,
    pace: 'moderate',
    diet: 'balanced',
    targetWeight: null,
    displayUnits: defaultDisplayUnits(country),
    macroOverrides: null,
  }
}
