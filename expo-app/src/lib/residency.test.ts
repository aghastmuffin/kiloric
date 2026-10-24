import { describe, expect, it } from 'vitest'
import {
  H_PYLORI_WARNING,
  RESIDENCY_BAR_MESSAGE,
  isAsianCountry,
  isBarredResidency,
  isEuCountry,
  isRaceValue,
  nextAsiaAnswer,
  showHPyloriWarning,
} from './residency'

describe('residency gates', () => {
  it('bars EU member states and outermost regions', () => {
    expect(isEuCountry('de')).toBe(true)
    expect(isEuCountry('FR')).toBe(true)
    expect(isEuCountry('IE')).toBe(true)
    expect(isBarredResidency('SE')).toBe(true)
    expect(isBarredResidency('GF')).toBe(true)
    expect(isBarredResidency('CY')).toBe(true)
    expect(isEuCountry('GB')).toBe(false)
    expect(isEuCountry('US')).toBe(false)
    expect(isEuCountry('NO')).toBe(false)
  })

  it('bars Russia and Vietnam with the same notice', () => {
    expect(isBarredResidency('RU')).toBe(true)
    expect(isBarredResidency('vn')).toBe(true)
    expect(isEuCountry('RU')).toBe(false)
    expect(RESIDENCY_BAR_MESSAGE).toContain('Regulation (EU) 2016/679')
    expect(RESIDENCY_BAR_MESSAGE).toContain('242-FZ')
    expect(RESIDENCY_BAR_MESSAGE).toContain('116/2025/QH15')
  })

  it('treats a yes answer or an Asian country of residence as the H. pylori flag', () => {
    expect(isAsianCountry('JP')).toBe(true)
    expect(isAsianCountry('KR')).toBe(true)
    expect(isAsianCountry('IN')).toBe(true)
    expect(isAsianCountry('VN')).toBe(true)
    expect(isAsianCountry('US')).toBe(false)
    expect(isAsianCountry('GB')).toBe(false)
    expect(showHPyloriWarning('US', true)).toBe(true)
    expect(showHPyloriWarning('US', false)).toBe(false)
    expect(showHPyloriWarning('US', null)).toBe(false)
    expect(showHPyloriWarning('JP', false)).toBe(true)
    expect(showHPyloriWarning('JP', null)).toBe(true)
    expect(H_PYLORI_WARNING).toContain('H. Pylori')
  })

  it('sets the Asia answer from the selected country', () => {
    expect(nextAsiaAnswer(null, 'US', 'JP')).toBe(true)
    expect(nextAsiaAnswer(false, 'US', 'TH')).toBe(true)
    expect(nextAsiaAnswer(true, 'JP', 'US')).toBe(null)
    expect(nextAsiaAnswer(true, 'US', 'CA')).toBe(true)
    expect(nextAsiaAnswer(false, 'US', 'CA')).toBe(false)
  })

  it('accepts only the listed race values', () => {
    expect(isRaceValue('asian')).toBe(true)
    expect(isRaceValue('prefer_not_to_say')).toBe(true)
    expect(isRaceValue('')).toBe(false)
    expect(isRaceValue('unknown')).toBe(false)
  })
})
