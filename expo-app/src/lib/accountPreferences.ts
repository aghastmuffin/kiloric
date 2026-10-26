import { account } from './serverData'

export type AccountPreferences = Record<string, unknown>

let mutationQueue: Promise<void> = Promise.resolve()

export async function readAccountPreferences(): Promise<AccountPreferences> {
  return account.getPrefs<AccountPreferences>()
}

export function updateAccountPreferences(
  update: (current: AccountPreferences) => AccountPreferences,
): Promise<AccountPreferences> {
  const operation = mutationQueue.then(async () => {
    const current = await readAccountPreferences()
    return account.updatePrefs({ prefs: update(current) })
  })

  mutationQueue = operation.then(() => undefined, () => undefined)
  return operation
}
