import { describe, expect, it } from 'vitest'
import { resolveBackendRequest } from './apiBackendPreferences'

describe('resolveBackendRequest', () => {
  it('resolves valid legacy backend request with requiresAuth true', () => {
    const res = resolveBackendRequest('legacy', '/api/barcode/123456')
    expect(res.requiresAuth).toBe(true)
    expect(res.url).toBe('https://calcount.taeson.co/api/barcode/123456')
  })

  it('resolves valid ords barcode endpoint', () => {
    const res = resolveBackendRequest('ords', '/api/barcode/123456')
    expect(res.requiresAuth).toBe(false)
    expect(res.url).toBe(
      'https://gba34651847beaf-caloriecount.adb.ca-montreal-1.oraclecloudapps.com/ords/admin/v1/code?code=123456',
    )
  })

  it('resolves valid ords product endpoint', () => {
    const res = resolveBackendRequest('ords', '/api/product/7890')
    expect(res.requiresAuth).toBe(false)
    expect(res.url).toBe(
      'https://gba34651847beaf-caloriecount.adb.ca-montreal-1.oraclecloudapps.com/ords/admin/v1/code?code=7890',
    )
  })

  it('resolves valid ords fuzzy search endpoint with query params', () => {
    const res = resolveBackendRequest('ords', '/api/fuzzy/apple?offset=10&limit=5')
    expect(res.requiresAuth).toBe(false)
    expect(res.url).toBe(
      'https://gba34651847beaf-caloriecount.adb.ca-montreal-1.oraclecloudapps.com/ords/admin/v1/friendly-food/?search_arg=apple&offset=10&limit=5',
    )
  })

  it('safely handles malformed percent-encoded URI without throwing URIError', () => {
    // Malformed percent-encoding like %FF or %E0%A0 would normally throw URIError in decodeURIComponent
    expect(() => {
      const resBarcode = resolveBackendRequest('ords', '/api/barcode/%FF')
      expect(resBarcode.url).toContain('code=%25FF')
    }).not.toThrow()

    expect(() => {
      const resFuzzy = resolveBackendRequest('ords', '/api/fuzzy/%FF')
      expect(resFuzzy.url).toContain('search_arg=%25FF')
    }).not.toThrow()
  })
})
