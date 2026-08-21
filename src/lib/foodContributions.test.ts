// eslint-disable-next-line import/no-unresolved
import { vi, describe, expect, it } from 'vitest'
import {
  buildContributionPayload,
  OFF_TO_APPWRITE,
  NUMBER_OFF_FIELDS,
  STRING_OFF_FIELDS,
} from './foodContributionFields'

const { mockAccountGet, mockCreateFile, mockDeleteFile, mockCreateDocument } = vi.hoisted(() => ({
  mockAccountGet: vi.fn(),
  mockCreateFile: vi.fn(),
  mockDeleteFile: vi.fn(),
  mockCreateDocument: vi.fn(),
}))

vi.mock('./appwrite', () => ({
  account: {
    get: (...args: unknown[]) => mockAccountGet(...args),
  },
  storage: {
    createFile: (...args: unknown[]) => mockCreateFile(...args),
    deleteFile: (...args: unknown[]) => mockDeleteFile(...args),
  },
  databases: {
    createDocument: (...args: unknown[]) => mockCreateDocument(...args),
  },
}))

vi.mock('react-native-appwrite', () => ({
  ID: {
    unique: () => 'mock-unique-id',
  },
  Permission: {
    read: () => 'read',
    update: () => 'update',
    delete: () => 'delete',
  },
  Role: {
    user: (id: string) => `user:${id}`,
  },
}))

describe('foodContributionFields map', () => {
  it('maps hyphenated OFF keys to Appwrite snake_case', () => {
    expect(OFF_TO_APPWRITE['energy-kcal_100g']).toBe('energy_kcal_100g')
    expect(OFF_TO_APPWRITE['carbon-footprint_100g']).toBe('carbon_footprint_100g')
    expect(OFF_TO_APPWRITE['added-sugars_100g']).toBe('added_sugars_100g')
    expect(OFF_TO_APPWRITE['vitamin-b12_100g']).toBe('vitamin_b12_100g')
  })

  it('covers every declared string and number OFF field', () => {
    for (const key of STRING_OFF_FIELDS) {
      expect(OFF_TO_APPWRITE[key]).toBeTruthy()
    }
    for (const key of NUMBER_OFF_FIELDS) {
      expect(OFF_TO_APPWRITE[key]).toBeTruthy()
    }
  })
})

describe('buildContributionPayload', () => {
  it('requires product_name', () => {
    expect(() =>
      buildContributionPayload({
        owner: 'user1',
        photo_file_id: 'file1',
        product_name: '   ',
      }),
    ).toThrow(/product name/i)
  })

  it('writes required fields and omits empty optionals', () => {
    const payload = buildContributionPayload({
      owner: 'user1',
      photo_file_id: 'file1',
      product_name: ' Greek Yogurt ',
      code: ' 012345678905 ',
      source_query: '012345678905',
      fields: {
        brands: '',
        'energy-kcal_100g': 120,
        proteins_100g: '10.5',
        allergens: '  milk  ',
      },
    })

    expect(payload).toEqual({
      owner: 'user1',
      status: 'pending',
      photo_file_id: 'file1',
      product_name: 'Greek Yogurt',
      source_query: '012345678905',
      code: '012345678905',
      energy_kcal_100g: 120,
      proteins_100g: 10.5,
      allergens: 'milk',
    })
    expect(payload).not.toHaveProperty('brands')
  })

  it('rejects non-numeric nutrient values', () => {
    expect(() =>
      buildContributionPayload({
        owner: 'user1',
        photo_file_id: 'file1',
        product_name: 'Soup',
        fields: { fat_100g: 'not-a-number' },
      }),
    ).toThrow(/number/i)
  })
})

describe('submitFoodContribution authorization & BOLA check', () => {
  it('rejects submission if authenticated user ID does not match target userId', async () => {
    mockAccountGet.mockResolvedValueOnce({ $id: 'session-user-123' })
    const { submitFoodContribution } = await import('./foodContributions')

    await expect(
      submitFoodContribution('other-user-999', {
        product_name: 'Granola',
        photo: { uri: 'file://photo.jpg', fileSize: 100 },
      }),
    ).rejects.toThrow(/Unauthorized: You can only submit food contributions for yourself\./)
  })

  it('allows submission when authenticated user matches userId', async () => {
    mockAccountGet.mockResolvedValueOnce({ $id: 'session-user-123' })
    mockCreateFile.mockResolvedValueOnce({ $id: 'file-123' })
    mockCreateDocument.mockResolvedValueOnce({ $id: 'doc-123', status: 'pending' })

    const { submitFoodContribution } = await import('./foodContributions')

    const result = await submitFoodContribution('session-user-123', {
      product_name: 'Granola',
      photo: { uri: 'file://photo.jpg', fileSize: 100 },
    })

    expect(result).toEqual({
      id: 'doc-123',
      photoFileId: 'file-123',
      status: 'pending',
    })
  })
})
