import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Read a preference written under the Kiloric key, copying a CalCount-era value
 * forward once so existing installs keep their settings.
 */
export async function readStoredPreference(key: string, legacyKey: string): Promise<string | null> {
  const current = await AsyncStorage.getItem(key)
  if (current != null) return current

  const legacy = await AsyncStorage.getItem(legacyKey)
  if (legacy == null) return null

  try {
    await AsyncStorage.setItem(key, legacy)
  } catch (err) {
    console.error('[storedPreference] legacy copy failed', err)
  }
  return legacy
}
