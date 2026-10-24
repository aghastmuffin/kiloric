/**
 * Self-reported residency rules for onboarding and profile edits.
 * Country codes match `COUNTRY_LIST` in `src/lib/countries.ts`.
 */

/** EU member states, plus outermost regions that are part of the Union. */
const EU_COUNTRY_CODES = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'AX',
  'GF',
  'GP',
  'MQ',
  'YT',
  'RE',
  'MF',
] as const

/** Russia and Vietnam are barred alongside the EU. */
const ADDITIONAL_BARRED_COUNTRY_CODES = ['RU', 'VN'] as const

/**
 * UN geoscheme Asia, plus Asian territories present in the country list.
 * Russia is classified with Europe there and is handled by the bar above.
 */
const ASIAN_COUNTRY_CODES = [
  'AF',
  'AM',
  'AZ',
  'BH',
  'BD',
  'BT',
  'BN',
  'KH',
  'CN',
  'CX',
  'CC',
  'CY',
  'GE',
  'HK',
  'IN',
  'ID',
  'IR',
  'IQ',
  'IL',
  'JP',
  'JO',
  'KZ',
  'KW',
  'KG',
  'LA',
  'LB',
  'MO',
  'MY',
  'MV',
  'MN',
  'MM',
  'NP',
  'KP',
  'KR',
  'OM',
  'PK',
  'PS',
  'PH',
  'QA',
  'SA',
  'SG',
  'LK',
  'SY',
  'TW',
  'TJ',
  'TH',
  'TL',
  'TR',
  'TM',
  'AE',
  'UZ',
  'VN',
  'YE',
  'IO',
] as const

export const RACE_OPTIONS = [
  { value: 'american_indian_alaska_native', label: 'American Indian or Alaska Native' },
  { value: 'asian', label: 'Asian' },
  { value: 'black_or_african_american', label: 'Black or African American' },
  { value: 'hispanic_or_latino', label: 'Hispanic or Latino' },
  { value: 'middle_eastern_north_african', label: 'Middle Eastern or North African' },
  { value: 'native_hawaiian_pacific_islander', label: 'Native Hawaiian or Other Pacific Islander' },
  { value: 'white', label: 'White' },
  { value: 'two_or_more', label: 'Two or more races' },
  { value: 'another', label: 'Another race' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const

export type RaceValue = (typeof RACE_OPTIONS)[number]['value']

const RACE_VALUES = new Set<string>(RACE_OPTIONS.map((option) => option.value))
const EU_CODES = new Set<string>(EU_COUNTRY_CODES)
const BARRED_CODES = new Set<string>([...EU_COUNTRY_CODES, ...ADDITIONAL_BARRED_COUNTRY_CODES])
const ASIAN_CODES = new Set<string>(ASIAN_COUNTRY_CODES)

export const RESIDENCY_BAR_MESSAGE =
  'The current implementation of Calcount version 101926 is not complaint with GDPR laws, pursuant to your rights under Regulation (EU) 2016/679. Citizens in Russia or Vietnam are also forbidden to patron this product pursuant to noncompliance with Federal Law No. 242-FZ. Law No. 116/2025/QH15 on Cybersecurity, respectively.'

export const H_PYLORI_WARNING =
  'Have you been screened for H. Pylori, our records indicate that you may be at a higher risk for this class 1 carcinogen.'

export const CONGRESSIONAL_CHALLENGE_MESSAGE =
  "The calcount project is a candidate for the Congressional App Challenge: California's 12th Congressional District, we do not take funds but if you enjoy your project please email support to mailto:admin@taeson.co with messages of how this project impacted you."

export const CONGRESSIONAL_MAILTO = 'mailto:admin@taeson.co'

function normalizeCode(code: string | null | undefined): string {
  return (code ?? '').trim().toUpperCase()
}

export function isEuCountry(code: string | null | undefined): boolean {
  return EU_CODES.has(normalizeCode(code))
}

export function isBarredResidency(code: string | null | undefined): boolean {
  return BARRED_CODES.has(normalizeCode(code))
}

export function isAsianCountry(code: string | null | undefined): boolean {
  return ASIAN_CODES.has(normalizeCode(code))
}

export function isRaceValue(value: string | null | undefined): value is RaceValue {
  return typeof value === 'string' && RACE_VALUES.has(value)
}

export function raceLabel(value: string | null | undefined): string {
  return RACE_OPTIONS.find((option) => option.value === value)?.label ?? ''
}

/** Red screening warning when the person says yes, or their country of residence is in Asia. */
export function showHPyloriWarning(
  country: string | null | undefined,
  residesInAsia: boolean | null | undefined,
): boolean {
  return residesInAsia === true || isAsianCountry(country)
}

/**
 * Selecting an Asian country answers "yes". Leaving an Asian country clears
 * that implied yes so the question is answered again. An explicit yes on a
 * non-Asian country is kept when the country stays outside Asia.
 */
export function nextAsiaAnswer(
  previous: boolean | null,
  previousCountry: string,
  nextCountry: string,
): boolean | null {
  if (isAsianCountry(nextCountry)) return true
  if (isAsianCountry(previousCountry)) return null
  return previous
}
