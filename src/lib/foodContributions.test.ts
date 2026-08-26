// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  account: { get: mockAccountGet },
  storage: {
    createFile: mockCreateFile,
    deleteFile: mockDeleteFile,
  },
  databases: { createDocument: mockCreateDocument },
}))

vi.mock('react-native-appwrite', () => ({
  ID: { unique: () => 'mock-unique-id' },
  Permission: {
    read: () => 'read',
    update: () => 'update',
    delete: () => 'delete',
  },
  Role: { user: (id: string) => `user:${id}` },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

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

  it('enforces string length limits on product_name, code, source_query, and string fields', () => {
    // product_name > 256
    expect(() =>
      buildContributionPayload({
        owner: 'user1',
        photo_file_id: 'file1',
        product_name: 'a'.repeat(257),
      }),
    ).toThrow(/product name must be 256 characters/i)

    // code > 128
    expect(() =>
      buildContributionPayload({
        owner: 'user1',
        photo_file_id: 'file1',
        product_name: 'Soup',
        code: '1'.repeat(129),
      }),
    ).toThrow(/code must be 128 characters/i)

    // source_query > 256
    expect(() =>
      buildContributionPayload({
        owner: 'user1',
        photo_file_id: 'file1',
        product_name: 'Soup',
        source_query: 'q'.repeat(257),
      }),
    ).toThrow(/source query must be 256 characters/i)

    // string field (e.g. brands) > 512
    expect(() =>
      buildContributionPayload({
        owner: 'user1',
        photo_file_id: 'file1',
        product_name: 'Soup',
        fields: { brands: 'b'.repeat(513) },
      }),
    ).toThrow(/brands must be 512 characters/i)
  })
})

describe('submitFoodContribution authorization', () => {
  it('rejects a mismatched authenticated user before writing', async () => {
    mockAccountGet.mockResolvedValueOnce({ $id: 'session-user-123' })
    const { submitFoodContribution } = await import('./foodContributions')

    await expect(
      submitFoodContribution('other-user-999', {
        product_name: 'Granola',
        photo: { uri: 'file://photo.jpg', fileSize: 100 },
      }),
    ).rejects.toThrow('You can only submit contributions as yourself.')

    expect(mockCreateFile).not.toHaveBeenCalled()
    expect(mockCreateDocument).not.toHaveBeenCalled()
  })

  it('submits when the authenticated user matches', async () => {
    mockAccountGet.mockResolvedValueOnce({ $id: 'session-user-123' })
    mockCreateFile.mockResolvedValueOnce({ $id: 'file-123' })
    mockCreateDocument.mockResolvedValueOnce({ $id: 'doc-123', status: 'pending' })
    const { submitFoodContribution } = await import('./foodContributions')

    await expect(
      submitFoodContribution('session-user-123', {
        product_name: 'Granola',
        photo: { uri: 'file://photo.jpg', fileSize: 100 },
      }),
    ).resolves.toEqual({
      id: 'doc-123',
      photoFileId: 'file-123',
      status: 'pending',
    })
  })
})
