// eslint-disable-next-line import/no-unresolved
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildContributionPayload,
  contributionFileColumns,
  decodeContributionFiles,
  encodeContributionFiles,
  fallbackProductName,
  primaryFileId,
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

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }))

vi.mock('./appwrite', () => ({
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

vi.mock('react-native-appwrite', () => ({
  AppwriteException: class extends Error {
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
    expect(encoded).toBe('appwrite-files://barcode=b1;front=f1;ingredients=i1;nutrition=n1;extra=x1,x2')
    expect(decodeContributionFiles(encoded)).toEqual(files)
    const long = 'a'.repeat(36)
    expect(encodeContributionFiles({ barcode: long, front: long, ingredients: long, nutrition: long, extra: [long] }).length).toBeLessThan(1024)
  })

  it('still reads the older unlabelled list', () => {
    expect(decodeContributionFiles('appwrite-files://a,b')).toEqual({ extra: ['a', 'b'] })
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
    const { AppwriteException } = await import('react-native-appwrite')
    mockCreateDocument
      .mockRejectedValueOnce(new AppwriteException('Invalid document structure: Unknown attribute: "front_file_id"', 400, 'document_invalid_structure'))
      .mockResolvedValueOnce({ $id: 'doc-2', status: 'pending' })
    const { createContributionRecord } = await import('./foodContributions')
    const result = await createContributionRecord('u1', { product_name: 'Oat bar', files: { front: 'f1', ingredients: 'i1' } })
    expect(result.storedInColumns).toBe(false)
    const retry = mockCreateDocument.mock.calls[1][0].data
    expect(retry).not.toHaveProperty('front_file_id')
    expect(retry).not.toHaveProperty('submitted_from')
    expect(retry.image_url).toBe('appwrite-files://front=f1;ingredients=i1')

    mockCreateDocument.mockResolvedValueOnce({ $id: 'doc-3', status: 'pending' })
    await createContributionRecord('u1', { product_name: 'Second bar', files: { front: 'f2' } })
    expect(mockCreateDocument).toHaveBeenCalledTimes(3)
    expect(mockCreateDocument.mock.calls[2][0].data.image_url).toBe('appwrite-files://front=f2')
  })

  it('does not retry other failures', async () => {
    const { AppwriteException } = await import('react-native-appwrite')
    mockCreateDocument.mockRejectedValueOnce(new AppwriteException('Missing required attribute', 400, 'document_missing_data'))
    const { createContributionRecord } = await import('./foodContributions')
    await expect(createContributionRecord('u1', { product_name: 'Oat bar', files: { front: 'f1' } })).rejects.toThrow('Missing required attribute')
    expect(mockCreateDocument).toHaveBeenCalledTimes(1)
  })

  it('needs at least one photo', async () => {
    const { createContributionRecord } = await import('./foodContributions')
    await expect(createContributionRecord('u1', { product_name: 'Oat bar', files: {} })).rejects.toThrow(/at least one photo/)
  })
})

describe('uploadImageToBucket', () => {
  class FakeXhr {
    static last: FakeXhr | null = null
    headers: Record<string, string> = {}
    upload: { onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void } = {}
    method = ''
    url = ''
    body: FormData | null = null
    status = 0
    responseText = ''
    withCredentials = false
    timeout = 0
    onload?: () => void
    onerror?: () => void
    ontimeout?: () => void
    constructor() {
      FakeXhr.last = this
    }
    open(method: string, url: string) {
      this.method = method
      this.url = url
    }
    setRequestHeader(key: string, value: string) {
      this.headers[key] = value
    }
    send(body: FormData) {
      this.body = body
    }
    respond(status: number, body: unknown) {
      this.status = status
      this.responseText = JSON.stringify(body)
      this.onload?.()
    }
  }

  beforeEach(() => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr)
  })

  const image = { name: 'front.jpg', type: 'image/jpeg' as const, size: 1000, body: { uri: 'file://front.jpg', name: 'front.jpg', type: 'image/jpeg' } }

  it('posts multipart with session cookies, project headers and progress', async () => {
    const { uploadImageToBucket } = await import('./imageUpload')
    const progress: number[] = []
    const pending = uploadImageToBucket({ bucketId: 'bucket', fileId: 'file-1', image, permissions: ['read'], onProgress: (f) => progress.push(f) })
    const xhr = FakeXhr.last!
    expect(xhr.method).toBe('POST')
    expect(xhr.url).toBe('https://aw.test/v1/storage/buckets/bucket/files')
    expect(xhr.withCredentials).toBe(true)
    expect(xhr.headers['X-Appwrite-Project']).toBe('proj')
    expect(xhr.headers.Origin).toBe('appwrite-ios://co.test.app')
    expect(xhr.headers).not.toHaveProperty('content-type')
    expect(xhr.body?.get('fileId')).toBe('file-1')
    expect(xhr.body?.getAll('permissions[]')).toEqual(['read'])
    xhr.upload.onprogress?.({ lengthComputable: true, loaded: 500, total: 1000 })
    xhr.respond(201, { $id: 'file-1' })
    await expect(pending).resolves.toMatchObject({ $id: 'file-1' })
    expect(progress).toEqual([0.5, 1])
  })

  it('surfaces Appwrite errors with their code and type', async () => {
    const { uploadImageToBucket } = await import('./imageUpload')
    const pending = uploadImageToBucket({ bucketId: 'bucket', fileId: 'file-1', image, permissions: [] })
    FakeXhr.last!.respond(400, { message: 'File extension not allowed', type: 'storage_file_type_unsupported' })
    await expect(pending).rejects.toMatchObject({ message: 'File extension not allowed', code: 400, type: 'storage_file_type_unsupported' })
  })

  it('reports network failures', async () => {
    const { uploadImageToBucket } = await import('./imageUpload')
    const pending = uploadImageToBucket({ bucketId: 'bucket', fileId: 'file-1', image, permissions: [] })
    FakeXhr.last!.onerror?.()
    await expect(pending).rejects.toThrow(/check your connection/i)
  })
})
