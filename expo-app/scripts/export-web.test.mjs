import { describe, expect, it } from 'vitest'
import { canonicalizeStaticPath, injectStaticRouteNormalization, staticRouteNormalizationScript } from './export-web-utils.mjs'

describe('static web route normalization', () => {
  it.each([
    ['/app/index.html', '/app/'],
    ['/app/signin.html', '/app/signin/'],
    ['/app/signin/index.html', '/app/signin/'],
    ['/app/(tabs)/account.html', '/app/(tabs)/account/'],
    ['/tracker/index.html', '/tracker/', '/tracker'],
  ])('canonicalizes %s', (pathname, expected, basePath) => {
    expect(canonicalizeStaticPath(pathname, basePath)).toBe(expected)
  })

  it.each([
    '/app/',
    '/app/signin',
    '/app/signin/',
    '/app/privacy/cpra.html5',
    '/outside/signin.html',
  ])('leaves %s unchanged', (pathname) => {
    expect(canonicalizeStaticPath(pathname)).toBeNull()
  })

  it('runs before the app bundle and preserves query, hash, and history state', () => {
    const calls = []
    const window = {
      location: { pathname: '/app/signin.html', search: '?next=today', hash: '#form' },
      history: { state: { key: 'existing' }, replaceState: (...args) => calls.push(args) },
    }
    new Function('window', staticRouteNormalizationScript())(window)
    expect(calls).toEqual([[window.history.state, '', '/app/signin/?next=today#form']])

    const html = '<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/></head><body></body></html>'
    const normalized = injectStaticRouteNormalization(html)
    expect(normalized.indexOf('<script>')).toBeLessThan(normalized.indexOf('<meta'))
    expect(normalized).toContain(staticRouteNormalizationScript())
  })
})
