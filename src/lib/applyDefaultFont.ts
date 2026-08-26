import { setActiveFontFamily } from '@/lib/appFont'

export function applyAppFont(fontFamily?: string, overrideRoles = false) {
  setActiveFontFamily(fontFamily, overrideRoles)
}
