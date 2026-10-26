import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockResolveApiBackendChoice = vi.fn()

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
    getAllKeys: vi.fn().mockResolvedValue([]),
    multiRemove: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('./apiBackendPreferences', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./apiBackendPreferences')>()
  return {
    ...actual,
    resolveApiBackendChoice: () => mockResolveApiBackendChoice(),
  }
})

vi.mock('./apiErrors', () => ({
  ApiRequestError: class ApiRequestError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'ApiRequestError'
    }
  },
  formatOracleError: (status: number) => `HTTP Error ${status}`,
  showApiError: vi.fn(),
  isApiRequestError: (err: unknown) => err instanceof Error && err.name === 'ApiRequestError',
}))

vi.mock('./getAccessToken', () => ({
  getAccessToken: vi.fn().mockResolvedValue('test-jwt-token'),
}))

describe('apiUtils authenticatedRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('falls back to Oracle ORDS when legacy backend fetch encounters a network error', async () => {
    mockResolveApiBackendChoice.mockResolvedValue('legacy')

    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ product_name: 'Banana', energy_kcal_100g: 89 }],
        }),
      })

    vi.stubGlobal('fetch', mockFetch)

    const { authenticatedRequest } = await import('./apiUtils')
    const result = await authenticatedRequest('/api/fuzzy/banana')

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[0][0]).toContain('kiloric.co')
    expect(mockFetch.mock.calls[1][0]).toContain('oraclecloudapps.com')
    expect(result).toBeDefined()
  })

  it('makes direct request to Oracle ORDS when backend choice is ords', async () => {
    mockResolveApiBackendChoice.mockResolvedValue('ords')

    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ product_name: 'Apple', energy_kcal_100g: 52 }],
      }),
    })

    vi.stubGlobal('fetch', mockFetch)

    const { authenticatedRequest } = await import('./apiUtils')
    const result = await authenticatedRequest('/api/fuzzy/apple')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch.mock.calls[0][0]).toContain('oraclecloudapps.com')
    expect(result).toBeDefined()
  })
})
