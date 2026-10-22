import {
  DEFAULT_MEAL_TYPE,
  loadSelectedMealType,
  saveSelectedMealType,
} from '@/lib/mealTypePreferences'
import { type MealType } from '@/lib/meals'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type MealTypePreferencesContextValue = {
  selectedMealType: MealType
  loading: boolean
  setSelectedMealType: (type: MealType) => Promise<void>
}

const MealTypePreferencesContext = createContext<MealTypePreferencesContextValue | null>(null)

export function MealTypePreferencesProvider({ children }: { children: React.ReactNode }) {
  const [selectedMealType, setSelectedMealTypeState] = useState<MealType>(DEFAULT_MEAL_TYPE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSelectedMealType()
      .then(setSelectedMealTypeState)
      .finally(() => setLoading(false))
  }, [])

  const setSelectedMealType = useCallback(async (type: MealType) => {
    setSelectedMealTypeState(type)
    try {
      await saveSelectedMealType(type)
    } catch (err) {
      console.error('[mealTypePreferences] save failed', err)
    }
  }, [])

  const value = useMemo(
    () => ({ selectedMealType, loading, setSelectedMealType }),
    [loading, selectedMealType, setSelectedMealType],
  )

  return (
    <MealTypePreferencesContext.Provider value={value}>
      {children}
    </MealTypePreferencesContext.Provider>
  )
}

export function useMealTypePreferences(): MealTypePreferencesContextValue {
  const context = useContext(MealTypePreferencesContext)
  if (!context) {
    throw new Error('useMealTypePreferences must be used within MealTypePreferencesProvider')
  }
  return context
}
