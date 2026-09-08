import { describe, expect, it, vi } from 'vitest'
import {
  getBackendBaseUrl,
  resolveBackendRequest,
} from './apiBackendPreferences'

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}))

describe('apiBackendPreferences & resolveBackendRequest', () => {
  it('returns appropriate base URL for each backend choice', () => {
    expect(getBackendBaseUrl('ords')).toContain('oraclecloudapps.com')
    expect(getBackendBaseUrl('legacy')).toBe('https://calcount.taeson.co')
  })

  it('resolves legacy requests to legacy URL with auth required', () => {
    const res = resolveBackendRequest('legacy', '/api/barcode/123456')
    expect(res.requiresAuth).toBe(true)
    expect(res.url).toBe('https://calcount.taeson.co/api/barcode/123456')
  })

  it('resolves barcode and product requests to ORDS code endpoint', () => {
    const barcodeRes = resolveBackendRequest('ords', '/api/barcode/0123456789')
    expect(barcodeRes.requiresAuth).toBe(false)
    expect(barcodeRes.url).toContain('/code?code=0123456789')

    const productRes = resolveBackendRequest('ords', '/api/product/9876543210')
    expect(productRes.requiresAuth).toBe(false)
    expect(productRes.url).toContain('/code?code=9876543210')
  })

  it('resolves fuzzy search queries to ORDS friendly-food endpoint with pagination', () => {
    const res = resolveBackendRequest('ords', '/api/fuzzy/apple?offset=10&limit=5')
    expect(res.requiresAuth).toBe(false)
    expect(res.url).toContain('/friendly-food/?search_arg=apple&offset=10&limit=5')
  })

  it('handles malformed URI parameters safely without throwing URIError', () => {
    // Malformed percent-encoding strings (e.g. invalid sequence %E0%A4 or unescaped % like "100% juice")
    expect(() => resolveBackendRequest('ords', '/api/barcode/123%FF')).not.toThrow()
    const barcodeRes = resolveBackendRequest('ords', '/api/barcode/123%FF')
    expect(barcodeRes.url).toBeDefined()

    expect(() => resolveBackendRequest('ords', '/api/fuzzy/100%25%juice')).not.toThrow()
    const fuzzyRes = resolveBackendRequest('ords', '/api/fuzzy/100%25%juice')
    expect(fuzzyRes.url).toContain('friendly-food')

    expect(() => resolveBackendRequest('ords', '/api/product/%E0%A4')).not.toThrow()
    const productRes = resolveBackendRequest('ords', '/api/product/%E0%A4')
    expect(productRes.url).toBeDefined()
  })
})
