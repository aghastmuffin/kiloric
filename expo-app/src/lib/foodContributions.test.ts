// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildContributionPayload,
  contributionFileColumns,
  decodeContributionFiles,
  encodeContributionFiles,
  fallbackProductName,
  primaryFileId,
  OFF_TO_SERVER,
  NUMBER_OFF_FIELDS,
  STRING_OFF_FIELDS,
} from './foodContributionFields'

const { mockAccountGet, mockCreateFile, mockDeleteFile, mockCreateDocument } = vi.hoisted(() => ({
  mockAccountGet: vi.fn(),
  mockCreateFile: vi.fn(),
  mockDeleteFile: vi.fn(),
  mockCreateDocument: vi.fn(),
}))

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }))

vi.mock('./serverData', () => ({
  client: {
    headers: { 'x-sdk-name': 'React Native', 'content-type': 'application/json' },
    config: { endpoint: 'https://aw.test/v1', project: 'proj', platform: 'co.test.app' },
  },
  account: { get: mockAccountGet },
  storage: {
    createFile: mockCreateFile,
    deleteFile: mockDeleteFile,
  },
  databases: { createDocument: mockCreateDocument },
}))

vi.mock('@/lib/serverTypes', () => ({
  PersistenceError: class extends Error {
    code: number
    type: string
    constructor(message: string, code = 0, type = '') {
      super(message)
      this.code = code
      this.type = type
    }
  },
  Query: { equal: () => 'equal', limit: () => 'limit' },
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
  mockAccountGet.mockResolvedValue({ $id: 'u1' })
})

describe('foodContributionFields map', () => {
  it('maps hyphenated OFF keys to Persistence snake_case', () => {
    expect(OFF_TO_SERVER['energy-kcal_100g']).toBe('energy_kcal_100g')
    expect(OFF_TO_SERVER['carbon-footprint_100g']).toBe('carbon_footprint_100g')
    expect(OFF_TO_SERVER['added-sugars_100g']).toBe('added_sugars_100g')
    expect(OFF_TO_SERVER['vitamin-b12_100g']).toBe('vitamin_b12_100g')
  })

  it('covers every declared string and number OFF field', () => {
    for (const key of STRING_OFF_FIELDS) {
      expect(OFF_TO_SERVER[key]).toBeTruthy()
    }
    for (const key of NUMBER_OFF_FIELDS) {
      expect(OFF_TO_SERVER[key]).toBeTruthy()
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

describe('contribution file IDs', () => {
  const files = { barcode: 'b1', front: 'f1', ingredients: 'i1', nutrition: 'n1', extra: ['x1', 'x2'] }

  it('uses the front photo as the primary file and falls back to any other', () => {
    expect(primaryFileId(files)).toBe('f1')
    expect(primaryFileId({ barcode: 'b1', ingredients: 'i1' })).toBe('i1')
    expect(primaryFileId({})).toBeNull()
  })

  it('maps each photo to its own column', () => {
    expect(contributionFileColumns(files)).toEqual({
      front_file_id: 'f1',
      barcode_file_id: 'b1',
      ingredients_file_id: 'i1',
      nutrition_file_id: 'n1',
      extra_file_ids: ['x1', 'x2'],
    })
    expect(contributionFileColumns({ front: 'f1' })).toEqual({ front_file_id: 'f1' })
  })

  it('round-trips labelled IDs through image_url and fits the 1024-char column', () => {
    const encoded = encodeContributionFiles(files)
    expect(encoded).toBe('persistence-files://barcode=b1;front=f1;ingredients=i1;nutrition=n1;extra=x1,x2')
    expect(decodeContributionFiles(encoded)).toEqual(files)
    const long = 'a'.repeat(36)
    expect(encodeContributionFiles({ barcode: long, front: long, ingredients: long, nutrition: long, extra: [long] }).length).toBeLessThan(1024)
  })

  it('still reads the older unlabelled list', () => {
    expect(decodeContributionFiles('persistence-files://a,b')).toEqual({ extra: ['a', 'b'] })
    expect(decodeContributionFiles('https://images.example/x.jpg')).toBeNull()
  })

  it('names unnamed products after their barcode', () => {
    expect(fallbackProductName(' 0123 ')).toBe('Unnamed product (barcode 0123)')
    expect(fallbackProductName('')).toBe('Unnamed product')
  })
})

describe('createContributionRecord', () => {
  beforeEach(async () => {
    const { resetContributionSchemaProbe } = await import('./foodContributions')
    resetContributionSchemaProbe()
  })

  it('rejects a mismatched authenticated user before writing', async () => {
    mockAccountGet.mockResolvedValueOnce({ $id: 'session-user-123' })
    const { confirmContributor } = await import('./foodContributions')
    await expect(confirmContributor('other-user-999')).rejects.toThrow('You can only submit contributions as yourself.')
  })

  it('writes the file columns, platform and a fallback name', async () => {
    mockCreateDocument.mockResolvedValueOnce({ $id: 'doc-1', status: 'pending' })
    const { createContributionRecord } = await import('./foodContributions')
    const result = await createContributionRecord('u1', {
      product_name: ' ',
      code: '012345678905',
      files: { front: 'f1', barcode: 'b1' },
    })
    expect(result).toEqual({ id: 'doc-1', status: 'pending', files: { front: 'f1', barcode: 'b1' }, storedInColumns: true })
    expect(mockCreateDocument.mock.calls[0][0].data).toMatchObject({
      owner: 'u1',
      status: 'pending',
      photo_file_id: 'f1',
      product_name: 'Unnamed product (barcode 012345678905)',
      front_file_id: 'f1',
      barcode_file_id: 'b1',
      submitted_from: 'ios',
    })
  })

  it('packs the IDs into image_url when the collection lacks the file columns', async () => {
    const { PersistenceError } = await import('@/lib/serverTypes')
    mockCreateDocument
      .mockRejectedValueOnce(new PersistenceError('Invalid document structure: Unknown attribute: "front_file_id"', 400, 'document_invalid_structure'))
      .mockResolvedValueOnce({ $id: 'doc-2', status: 'pending' })
    const { createContributionRecord } = await import('./foodContributions')
    const result = await createContributionRecord('u1', { product_name: 'Oat bar', files: { front: 'f1', ingredients: 'i1' } })
    expect(result.storedInColumns).toBe(false)
    const retry = mockCreateDocument.mock.calls[1][0].data
    expect(retry).not.toHaveProperty('front_file_id')
    expect(retry).not.toHaveProperty('submitted_from')
    expect(retry.image_url).toBe('persistence-files://front=f1;ingredients=i1')

    mockCreateDocument.mockResolvedValueOnce({ $id: 'doc-3', status: 'pending' })
    await createContributionRecord('u1', { product_name: 'Second bar', files: { front: 'f2' } })
    expect(mockCreateDocument).toHaveBeenCalledTimes(3)
    expect(mockCreateDocument.mock.calls[2][0].data.image_url).toBe('persistence-files://front=f2')
  })

  it('does not retry other failures', async () => {
    const { PersistenceError } = await import('@/lib/serverTypes')
    mockCreateDocument.mockRejectedValueOnce(new PersistenceError('Missing required attribute', 400, 'document_missing_data'))
    const { createContributionRecord } = await import('./foodContributions')
    await expect(createContributionRecord('u1', { product_name: 'Oat bar', files: { front: 'f1' } })).rejects.toThrow('Missing required attribute')
    expect(mockCreateDocument).toHaveBeenCalledTimes(1)
  })

  it('needs at least one photo', async () => {
    const { createContributionRecord } = await import('./foodContributions')
    await expect(createContributionRecord('u1', { product_name: 'Oat bar', files: {} })).rejects.toThrow(/at least one photo/)
  })

  it('rejects createContributionRecord for mismatched owner', async () => {
    mockAccountGet.mockResolvedValueOnce({ $id: 'u1' })
    const { createContributionRecord } = await import('./foodContributions')
    await expect(
      createContributionRecord('u2-other', { product_name: 'Oat bar', files: { front: 'f1' } }),
    ).rejects.toThrow('You can only submit contributions as yourself.')
  })

  it('rejects uploadContributionPhoto for mismatched owner', async () => {
    mockAccountGet.mockResolvedValueOnce({ $id: 'u1' })
    const { uploadContributionPhoto } = await import('./foodContributions')
    await expect(
      uploadContributionPhoto('u2-other', { kind: 'front', uri: 'file://img.jpg', fileName: 'img.jpg', mimeType: 'image/jpeg', fileSize: 100 }),
    ).rejects.toThrow('You can only submit contributions as yourself.')
  })

  it('rejects countContributions for mismatched owner', async () => {
    mockAccountGet.mockResolvedValueOnce({ $id: 'u1' })
    const { countContributions } = await import('./foodContributions')
    const count = await countContributions('u2-other')
    expect(count).toBeNull()
  })
})

vi.mock('./apiClient', () => ({ apiClient: { post: vi.fn() } }))

describe('uploadImageToBucket', () => {
  const image = { name: 'front.jpg', type: 'image/jpeg' as const, size: 1000, body: new Blob(['photo'], { type: 'image/jpeg' }) }
  it('uploads multipart through the authenticated API and reports completion', async () => {
    const { apiClient } = await import('./apiClient')
    vi.mocked(apiClient.post).mockResolvedValueOnce({ $id: 'file-1' })
    const { uploadImageToBucket } = await import('./imageUpload')
    const progress: number[] = []
    const result = await uploadImageToBucket({ bucketId: 'bucket', fileId: 'file-1', image, permissions: [], onProgress: value => progress.push(value) })
    expect(result.$id).toBe('file-1')
    expect(apiClient.post).toHaveBeenCalledWith('/v1/files', expect.any(FormData))
    const form = vi.mocked(apiClient.post).mock.calls.at(-1)![1] as FormData
    expect(form.get('file')).toBeInstanceOf(Blob)
    expect(progress).toEqual([0.02, 1])
  })
  it('surfaces API validation errors', async () => {
    const { apiClient } = await import('./apiClient')
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Photos must be JPG or PNG'))
    const { uploadImageToBucket } = await import('./imageUpload')
    await expect(uploadImageToBucket({ bucketId: 'bucket', fileId: 'file-1', image, permissions: [] })).rejects.toThrow('JPG or PNG')
  })
  it('does not report completion for a failed upload', async () => {
    const { apiClient } = await import('./apiClient')
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'))
    const { uploadImageToBucket } = await import('./imageUpload')
    const progress = vi.fn()
    await expect(uploadImageToBucket({ bucketId: 'bucket', fileId: 'file-1', image, permissions: [], onProgress: progress })).rejects.toThrow('Network error')
    expect(progress).not.toHaveBeenCalledWith(1)
  })
})
