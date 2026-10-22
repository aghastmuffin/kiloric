let activeFontFamily: string | undefined
let activeFontOverridesRoles = false

export function getActiveFontFamily() {
  return activeFontFamily
}

export function getActiveFontOverridesRoles() {
  return activeFontOverridesRoles
}

export function setActiveFontFamily(fontFamily?: string, overrideRoles = false) {
  activeFontFamily = fontFamily
  activeFontOverridesRoles = overrideRoles
}
