import type { Models } from 'react-native-appwrite'
import { account } from './appwrite'
import { isRaceValue, type RaceValue } from './residency'

const PREFS_KEY = 'calcountDemographics'

export type Demographics = {
  race: RaceValue | null
  residesInAsia: boolean | null
}

export function emptyDemographics(): Demographics {
  return { race: null, residesInAsia: null }
}

export function demographicsFromPrefs(prefs: Models.Preferences | Record<string, unknown> | undefined): Demographics {
  const raw = (prefs as Record<string, unknown> | undefined)?.[PREFS_KEY]
  if (!raw || typeof raw !== 'object') return emptyDemographics()
  const record = raw as Record<string, unknown>
  const race = typeof record.race === 'string' ? record.race : null
  return {
    race: isRaceValue(race) ? race : null,
    residesInAsia: typeof record.residesInAsia === 'boolean' ? record.residesInAsia : null,
  }
}

export async function loadDemographics(expectedUserId?: string): Promise<Demographics> {
  const user = await account.get()
  if (expectedUserId && user.$id !== expectedUserId) {
    throw new Error('Unauthorized: You are not permitted to modify preferences for another user.')
  }
  return demographicsFromPrefs(user.prefs)
}

export async function saveDemographics(
  demographics: Demographics,
  expectedUserId?: string,
): Promise<Demographics> {
  const user = await account.get()
  if (expectedUserId && user.$id !== expectedUserId) {
    throw new Error('Unauthorized: You are not permitted to modify preferences for another user.')
  }
  const normalized = demographicsFromPrefs({ [PREFS_KEY]: demographics })
  await account.updatePrefs({
    prefs: {
      ...(user.prefs as Record<string, unknown>),
      [PREFS_KEY]: normalized,
    },
  })
  return normalized
}
