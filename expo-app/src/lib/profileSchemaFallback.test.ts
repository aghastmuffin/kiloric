// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getDocument, updateDocument, getAccount } = vi.hoisted(() => ({
  getDocument: vi.fn(),
  updateDocument: vi.fn(),
  getAccount: vi.fn(),
}))

vi.mock('./serverData', () => ({
  databases: { getDocument, updateDocument, createDocument: vi.fn() },
  account: { get: getAccount },
}))

vi.mock('@/lib/serverTypes', () => ({
  PersistenceError: class extends Error {
    code: number
    type: string
    constructor(message: string, code: number, type: string) {
      super(message)
      this.code = code
      this.type = type
    }
  },
  Permission: { read: () => 'read', update: () => 'update', delete: () => 'delete' },
  Role: { user: (id: string) => `user:${id}` },
}))

const { PersistenceError } = await import('@/lib/serverTypes')
const profile = await import('./profile')

describe('profile writes before the v5 columns are provisioned', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profile.clearProfileCache()
    profile.resetProfileSchemaProbe()
    getAccount.mockResolvedValue({ $id: 'u1' })
    getDocument.mockResolvedValue({ $id: 'u1', username: 'a' })
  })

  it('retries without the new columns when Persistence reports an unknown attribute', async () => {
    updateDocument
      .mockRejectedValueOnce(new PersistenceError('Invalid document structure: Unknown attribute: "sex"', 400, 'document_invalid_structure'))
      .mockResolvedValueOnce({ $id: 'u1' })
    await profile.saveProfileFields('u1', { target_kcal: 2000, sex: 'male', body_fat_pct: 18.25 })
    expect(updateDocument).toHaveBeenCalledTimes(2)
    expect(updateDocument.mock.calls[0][0].data).toMatchObject({ target_kcal: 2000, sex: 'male', body_fat_pct: 18.3 })
    expect(updateDocument.mock.calls[1][0].data).toEqual({ target_kcal: 2000 })

    updateDocument.mockResolvedValueOnce({ $id: 'u1' })
    await profile.saveProfileFields('u1', { target_kcal: 2100, activity_level: 'light' })
    expect(updateDocument).toHaveBeenCalledTimes(3)
    expect(updateDocument.mock.calls[2][0].data).toEqual({ target_kcal: 2100 })
  })

  it('surfaces other errors', async () => {
    updateDocument.mockRejectedValueOnce(new PersistenceError('Server error', 500, 'general_unknown'))
    await expect(profile.saveProfileFields('u1', { sex: 'female' })).rejects.toThrow()
    expect(updateDocument).toHaveBeenCalledTimes(1)
  })

  it('drops an unprovisioned race column without discarding nutrition inputs', async () => {
    updateDocument
      .mockRejectedValueOnce(new PersistenceError('Invalid document structure: Unknown attribute: "race"', 400, 'document_invalid_structure'))
      .mockResolvedValueOnce({ $id: 'u1' })
    await profile.saveProfileFields('u1', {
      target_kcal: 2000,
      sex: 'female',
      race: 'asian',
      resides_in_asia: true,
    })
    expect(updateDocument).toHaveBeenCalledTimes(2)
    expect(updateDocument.mock.calls[0][0].data).toMatchObject({
      target_kcal: 2000,
      sex: 'female',
      race: 'asian',
      resides_in_asia: true,
    })
    expect(updateDocument.mock.calls[1][0].data).toEqual({ target_kcal: 2000, sex: 'female' })
  })

  it('writes the new columns once they exist', async () => {
    updateDocument.mockResolvedValueOnce({ $id: 'u1' })
    await profile.saveProfileFields('u1', { sex: 'female', bmr: 1400.4 })
    expect(updateDocument.mock.calls[0][0].data).toEqual({ sex: 'female', bmr: 1400 })
  })
})
