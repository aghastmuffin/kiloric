// eslint-disable-next-line import/no-unresolved
import { describe, expect, it, vi } from 'vitest'
import { demographicsFromPrefs } from './demographics'

vi.mock('@/lib/serverTypes', () => ({ Models: {} }))
vi.mock('./serverData', () => ({
  account: { get: vi.fn(), getPrefs: vi.fn(), updatePrefs: vi.fn() },
}))

describe('demographics prefs', () => {
  it('reads a saved race and Asia answer', () => {
    expect(
      demographicsFromPrefs({
        calcountDemographics: { race: 'prefer_not_to_say', residesInAsia: true },
      }),
    ).toEqual({ race: 'prefer_not_to_say', residesInAsia: true })
  })

  it('drops unknown race values', () => {
    expect(demographicsFromPrefs({ calcountDemographics: { race: 'martian', residesInAsia: false } })).toEqual({
      race: null,
      residesInAsia: false,
    })
  })
})
