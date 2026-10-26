import { clearFavoriteFoodsCache } from './foodFavorites'
import { clearFontPreferencesCache } from './fontPreferences'
import { clearCachedToken } from './getAccessToken'
import { clearTodayMealsCache } from './meals'
import { clearProfileCache } from './profile'
import { clearMealTypePreferencesCache } from './mealTypePreferences'
import { clearTasksCache } from './tasks'
import { clearThemePreferencesCache } from './theme/themePreferences'
import { clearWaterCache } from './water'
import { resetRecordStoreSession } from './data/recordStore'

export function clearSessionState(): void {
  resetRecordStoreSession()
  clearCachedToken()
  clearProfileCache()
  clearTasksCache()
  clearTodayMealsCache()
  clearFavoriteFoodsCache()
  clearWaterCache()
  clearMealTypePreferencesCache()
  clearFontPreferencesCache()
  clearThemePreferencesCache()
}
