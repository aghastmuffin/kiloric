import { beforeEach, expect, it, vi } from 'vitest'

const { getPrefs, updatePrefs } = vi.hoisted(() => ({
  getPrefs: vi.fn(),
  updatePrefs: vi.fn(),
}))

vi.mock('./serverData', () => ({ account: { getPrefs, updatePrefs } }))

import { readAccountPreferences, updateAccountPreferences } from './accountPreferences'

beforeEach(() => vi.clearAllMocks())

it('reads preferences from the authenticated server account', async () => {
  getPrefs.mockResolvedValueOnce({ theme: 'paper' })
  await expect(readAccountPreferences()).resolves.toEqual({ theme: 'paper' })
})

it('serializes updates so concurrent writes preserve each other', async () => {
  let saved: Record<string, unknown> = {}
  getPrefs.mockImplementation(async () => ({ ...saved }))
  updatePrefs.mockImplementation(async ({ prefs }) => {
    saved = prefs
    return prefs
  })

  await Promise.all([
    updateAccountPreferences((current) => ({ ...current, first: true })),
    updateAccountPreferences((current) => ({ ...current, second: true })),
  ])

  expect(saved).toEqual({ first: true, second: true })
})
