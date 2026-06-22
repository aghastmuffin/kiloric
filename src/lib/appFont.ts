let activeFontFamily: string | undefined

export function getActiveFontFamily() {
  return activeFontFamily
}

export function setActiveFontFamily(fontFamily?: string) {
  activeFontFamily = fontFamily
}
