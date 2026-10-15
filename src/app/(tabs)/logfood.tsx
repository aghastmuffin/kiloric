import { authenticatedRequest } from '@/lib/apiUtils';
import {
  LogFoodMultiView,
  macrosFromProduct,
  type ContributePayload,
  type SearchResult,
} from '@/components/LogFoodMultiView';
import { LogItemDragRow } from '@/components/LogItemDragRow';
import { MotionView } from '@/components/MotionView';
import { SwipeableRow } from '@/components/SwipeableRow';
import { AppScreenHeader } from '@/components/ui/AppScreenHeader';
import { showApiError } from '@/lib/apiErrors';
import { useAuth } from '@/lib/AuthContext';
import {
  favoritesUserKey,
  loadFavoriteFoods,
  toggleFavoriteFood,
  type FavoriteFood,
} from '@/lib/foodFavorites';
import { fetchMealItemPreview, type MealItemPreview } from '@/lib/mealItemPreview';
import {
  addProductToMeal,
  getTodayMeals,
  listHistoricMeals,
  MEAL_TYPE_OPTIONS,
  moveProductBetweenMeals,
  removeProductFromMeal,
  type MealDocument,
  type MealType,
} from '@/lib/meals';
import { useMealTypePreferences } from '@/lib/MealTypePreferencesContext';
import { getBarcodeFromProduct, getProductTitle, unwrapProduct } from '@/lib/productDisplay';
import { getProfile } from '@/lib/profile';
import { storeSearchResult } from '@/lib/searchResultStore';
import { useAppLayout } from '@/lib/theme/layout';
import { useTheme } from '@/lib/theme/ThemeContext';
import { borderRadius, spacing, type ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

type FilterChip = 'Favorites' | 'Recent' | 'My Meals'
type LogItem = MealItemPreview & { mealId: string; sourceType: MealType; loggedAt: string }
type LogSection = {
  type: MealType
  kcal: number
  items: LogItem[]
}

const FILTERS: FilterChip[] = ['Favorites', 'Recent', 'My Meals']

const FILTER_ICONS: Record<FilterChip, keyof typeof Ionicons.glyphMap> = {
  Favorites: 'star',
  Recent: 'time',
  'My Meals': 'restaurant',
}

const MEAL_ICONS: Record<MealType, keyof typeof Ionicons.glyphMap> = {
  Breakfast: 'cafe-outline',
  Lunch: 'restaurant-outline',
  Dinner: 'moon-outline',
  Snack: 'nutrition-outline',
  Other: 'ellipse-outline',
}

function mealTypeIcon(type: MealType): keyof typeof Ionicons.glyphMap {
  return MEAL_ICONS[type] ?? 'ellipse-outline'
}

function formatClockSafe(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--:--'
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function servingLabel(facts: { label: string; value: string }[], fallback: string): string {
  const preferred = facts.find((fact) => {
    const label = fact.label.toLowerCase()
    return label.includes('serving') || label.includes('quantity') || label.includes('size')
  })
  return preferred?.value ?? fallback
}

/** Flatten contribute payload into expo-router string params (snake_case keys). */
function buildContributeRouteParams(
  payload: ContributePayload | undefined,
  fallbackQuery: string,
  looksLikeBarcode: boolean,
): Record<string, string> {
  const params: Record<string, string> = {
    query: payload?.query ?? fallbackQuery,
  }

  const code = payload?.code ?? (looksLikeBarcode ? fallbackQuery : undefined)
  if (code) params.code = code
  if (!payload) return params

  for (const [key, value] of Object.entries(payload)) {
    if (key === 'query' || key === 'code') continue
    if (typeof value !== 'string' || !value.trim()) continue
    params[key.replace(/-/g, '_')] = value.trim()
  }

  return params
}

function parseSearchPayload(data: unknown): SearchResult[] {
  if (typeof data === 'string') {
    const trimmed = data.trim().toLowerCase()
    if (!trimmed || trimmed.includes('404') || trimmed.includes('no products')) return []
    try {
      return parseSearchPayload(JSON.parse(data))
    } catch {
      return []
    }
  }

  if (Array.isArray(data)) {
    return data.filter(
      (item): item is SearchResult =>
        !!item && typeof item === 'object' && !Array.isArray(item),
    )
  }

  if (data && typeof data === 'object') {
    const obj = data as SearchResult
    const nested = obj.results ?? obj.products ?? obj.items ?? obj.data
    if (Array.isArray(nested)) return parseSearchPayload(nested)
    return [obj]
  }

  return []
}

function MacroPills({
  protein,
  fat,
  carbs,
  styles,
  colors,
}: {
  protein: number | null
  fat: number | null
  carbs: number | null
  styles: ReturnType<typeof makeStyles>
  colors: ThemeColors
}) {
  return (
    <View style={styles.macroRow}>
      <View style={[styles.macroPill, styles.macroProtein]}>
        <Text style={[styles.macroPillText, { color: colors.success }]}>
          P: {protein != null ? Math.round(protein) : '—'}g
        </Text>
      </View>
      <View style={[styles.macroPill, styles.macroFat]}>
        <Text style={[styles.macroPillText, { color: colors.textMuted }]}>
          F: {fat != null ? Math.round(fat) : '—'}g
        </Text>
      </View>
      <View style={[styles.macroPill, styles.macroCarbs]}>
        <Text style={[styles.macroPillText, { color: colors.accent }]}>
          C: {carbs != null ? Math.round(carbs) : '—'}g
        </Text>
      </View>
    </View>
  )
}

export default function LogFoodScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { gutter } = useAppLayout()
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()
  const { user } = useAuth()
  const { selectedMealType, setSelectedMealType } = useMealTypePreferences()
  const searchInputRef = useRef<TextInput>(null)
  const runSearchRef = useRef<(rawQuery?: string) => Promise<void>>(async () => {})
  const searchRequestIdRef = useRef(0)
  const mealLoadRequestIdRef = useRef(0)

  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterChip>('Recent')
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)
  const [mealPickerOpen, setMealPickerOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Breakfast: true,
    Lunch: true,
  })
  const [todayMeals, setTodayMeals] = useState<MealDocument[]>([])
  const [historicMeals, setHistoricMeals] = useState<MealDocument[]>([])
  const [favorites, setFavorites] = useState<FavoriteFood[]>([])
  const [kcalTarget, setKcalTarget] = useState(2400)
  const [previews, setPreviews] = useState<Record<string, MealItemPreview>>({})
  const [loadingMeals, setLoadingMeals] = useState(true)
  const [mealLoadError, setMealLoadError] = useState<string | null>(null)
  const [addStatuses, setAddStatuses] = useState<
    Record<number, { state: 'adding' | 'added' | 'error'; message: string }>
  >({})
  const [moveItem, setMoveItem] = useState<LogItem | null>(null)
  const [scrollEnabled, setScrollEnabled] = useState(true)

  const loadToday = useCallback(async () => {
    const requestId = ++mealLoadRequestIdRef.current
    if (!user?.$id) {
      const savedFavorites = await loadFavoriteFoods('local')
      if (requestId !== mealLoadRequestIdRef.current) return
      setTodayMeals([])
      setHistoricMeals([])
      setFavorites(savedFavorites)
      setLoadingMeals(false)
      return
    }

    setLoadingMeals(true)
    setMealLoadError(null)
    try {
      const [meals, profile, history, savedFavorites] = await Promise.all([
        getTodayMeals(user.$id),
        getProfile(user.$id),
        listHistoricMeals(user.$id, 8),
        loadFavoriteFoods(user.$id),
      ])

      const uniqueBarcodes = new Map<string, MealType>()
      for (const meal of meals) {
        const mealType = (meal.type ?? 'Other') as MealType
        for (const barcode of meal.items ?? []) {
          if (barcode && !uniqueBarcodes.has(barcode)) {
            uniqueBarcodes.set(barcode, mealType)
          }
        }
      }

      const uniquePreviews = new Map<string, MealItemPreview>()
      await Promise.all(
        Array.from(uniqueBarcodes, async ([barcode, mealType]) => {
          uniquePreviews.set(barcode, await fetchMealItemPreview(barcode, mealType))
        }),
      )

      const nextPreviews: Record<string, MealItemPreview> = {}
      for (const meal of meals) {
        const items = meal.items ?? []
        for (let index = 0; index < items.length; index++) {
          const preview = uniquePreviews.get(items[index])
          if (preview) nextPreviews[`${meal.$id}-${index}-${items[index]}`] = preview
        }
      }
      if (requestId !== mealLoadRequestIdRef.current) return
      setTodayMeals(meals)
      setHistoricMeals(history)
      setFavorites(savedFavorites)
      if (profile?.target_kcal) setKcalTarget(profile.target_kcal)
      setPreviews(nextPreviews)
    } catch (error) {
      if (requestId !== mealLoadRequestIdRef.current) return
      console.warn('[Log] failed to load today meals', error)
      setMealLoadError('Today’s meals could not be refreshed. Your existing view has been kept.')
    } finally {
      if (requestId === mealLoadRequestIdRef.current) setLoadingMeals(false)
    }
  }, [user])

  const runSearch = useCallback(async (rawQuery?: string) => {
    const trimmed = (rawQuery ?? query).trim()
    if (!trimmed) return
    const requestId = ++searchRequestIdRef.current

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsSearching(true)
    setHasSearched(true)
    setSearchError(null)
    setAddStatuses({})
    setMealPickerOpen(false)

    try {
      const looksLikeBarcode = /^\d{8,14}$/.test(trimmed)
      const endpoint = looksLikeBarcode
        ? `/api/barcode/${encodeURIComponent(trimmed)}`
        : `/api/fuzzy/${encodeURIComponent(trimmed)}`
      const data = await authenticatedRequest(endpoint)
      if (requestId !== searchRequestIdRef.current) return
      const parsed = parseSearchPayload(data)
      setResults(parsed)
      if (parsed.length === 0) {
        setSearchError('No matches found. Try another food or scan a barcode.')
      }
    } catch (error) {
      if (requestId !== searchRequestIdRef.current) return
      const message = error instanceof Error ? error.message : 'Search failed'
      setResults([])
      setSearchError(message)
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setIsSearching(false)
      }
    }
  }, [query])

  useEffect(() => {
    runSearchRef.current = runSearch
  }, [runSearch])

  useEffect(() => () => {
    searchRequestIdRef.current += 1
    mealLoadRequestIdRef.current += 1
  }, [])

  useFocusEffect(
    useCallback(() => {
      let active = true
      void loadToday()

      AsyncStorage.getItem('saved_barcode')
        .then(async (barcode) => {
          if (!active || !barcode?.trim()) return
          const trimmed = barcode.trim()
          setQuery(trimmed)
          await AsyncStorage.removeItem('saved_barcode')
          if (active) await runSearchRef.current(trimmed)
        })
        .catch((error) => console.error('Could not load scanned barcode', error))

      return () => {
        active = false
      }
    }, [loadToday]),
  )

  // Single-pass computation of sections and daily calorie total to avoid repeated array filter traversals and iterator allocations
  const { sections, dailyKcal } = useMemo(() => {
    const sectionMap = new Map<MealType, { kcal: number; items: LogItem[] }>()
    for (const type of MEAL_TYPE_OPTIONS) {
      sectionMap.set(type, { kcal: 0, items: [] })
    }

    let totalKcal = 0

    for (const meal of todayMeals) {
      const mealKcal = meal.kcal ?? 0
      totalKcal += mealKcal

      const type = (meal.type ?? 'Other') as MealType
      const section = sectionMap.get(type) ?? sectionMap.get('Other')
      if (section) {
        section.kcal += mealKcal

        const items = meal.items
        if (items) {
          for (let index = 0; index < items.length; index++) {
            const barcode = items[index]
            const key = `${meal.$id}-${index}-${barcode}`
            const preview = previews[key] ?? {
              barcode,
              title: `Barcode: ${barcode}`,
              facts: [],
              kcal: null,
              protein: null,
              carbs: null,
              fat: null,
            }
            section.items.push({
              ...preview,
              mealId: meal.$id,
              sourceType: type,
              loggedAt: meal.$createdAt,
            })
          }
        }
      }
    }

    const resultSections: LogSection[] = []
    for (const type of MEAL_TYPE_OPTIONS) {
      const sec = sectionMap.get(type)
      if (sec && (sec.items.length > 0 || sec.kcal > 0)) {
        resultSections.push({
          type,
          kcal: sec.kcal,
          items: sec.items,
        })
      }
    }

    return { sections: resultSections, dailyKcal: totalKcal }
  }, [previews, todayMeals])

  const recentFoods = useMemo(() => {
    const seen = new Set<string>()
    const foods: MealItemPreview[] = []
    for (const meal of todayMeals) {
      for (const [index, barcode] of (meal.items ?? []).entries()) {
        if (seen.has(barcode)) continue
        seen.add(barcode)
        const key = `${meal.$id}-${index}-${barcode}`
        foods.push(
          previews[key] ?? {
            barcode,
            title: `Barcode: ${barcode}`,
            facts: [],
            kcal: null,
            protein: null,
            carbs: null,
            fat: null,
          },
        )
      }
    }
    return foods.slice(0, 8)
  }, [previews, todayMeals])

  const invalidateSearchResults = () => {
    searchRequestIdRef.current += 1
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsSearching(false)
    setHasSearched(false)
    setResults([])
    setSearchError(null)
    setAddStatuses({})
  }

  const clearSearch = () => {
    invalidateSearchResults()
    setQuery('')
  }

  const toggleSection = (type: MealType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded((current) => ({ ...current, [type]: !current[type] }))
  }

  const selectFilter = (chip: FilterChip) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setActiveFilter(chip)
    if (hasSearched) clearSearch()
  }

  const focusSearch = () => {
    searchInputRef.current?.focus()
  }

  const openDetail = useCallback(
    (barcode: string, item?: SearchResult) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      const product = item ? unwrapProduct(item) : { code: barcode }
      const id = storeSearchResult(barcode, product)
      router.push({
        pathname: '/Additions',
        params: { id, barcode, query },
      })
    },
    [query, router],
  )

  const quickAddResult = useCallback(async (item: SearchResult, index: number) => {
    if (addStatuses[index]?.state === 'adding') return
    const product = unwrapProduct(item)
    const barcode = getBarcodeFromProduct(product) ?? getBarcodeFromProduct(item)
    if (!barcode) {
      setAddStatuses((current) => ({
        ...current,
        [index]: { state: 'error', message: 'No barcode available for this item.' },
      }))
      return
    }
    if (!user?.$id) {
      setAddStatuses((current) => ({
        ...current,
        [index]: { state: 'error', message: 'Sign in to add foods.' },
      }))
      return
    }

    setAddStatuses((current) => ({
      ...current,
      [index]: { state: 'adding', message: `Adding to ${selectedMealType}…` },
    }))
    try {
      await addProductToMeal(user.$id, selectedMealType, barcode, product)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setAddStatuses((current) => ({
        ...current,
        [index]: { state: 'added', message: `Added to ${selectedMealType}` },
      }))
      await loadToday()
    } catch (error) {
      console.error('Could not quick-add search result', error)
      setAddStatuses((current) => ({
        ...current,
        [index]: { state: 'error', message: 'Couldn’t add. Try again.' },
      }))
    }
  }, [addStatuses, loadToday, selectedMealType, user])

  const quickAddFood = useCallback(async (food: {
    barcode: string
    title: string
    protein?: number | null
    carbs?: number | null
    fat?: number | null
    kcal?: number | null
  }, mealTypeOverride?: MealType) => {
    if (!user?.$id) return
    try {
      const data = await authenticatedRequest(`/api/barcode/${encodeURIComponent(food.barcode)}`)
      const product =
        data && typeof data === 'object' && !Array.isArray(data)
          ? unwrapProduct(data as SearchResult)
          : { code: food.barcode, product_name: food.title }
      await addProductToMeal(user.$id, mealTypeOverride ?? selectedMealType, food.barcode, product)
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      await loadToday()
    } catch (error) {
      console.warn('Could not add food', error)
      showApiError(error, 'appwrite')
    }
  }, [loadToday, selectedMealType, user])


  const handleToggleFavorite = useCallback(async (food: {
    barcode: string
    title: string
    protein: number | null
    carbs: number | null
    fat: number | null
    kcal: number | null
  }) => {
    const next = await toggleFavoriteFood(favoritesUserKey(user?.$id), food)
    setFavorites(next)
    await Haptics.selectionAsync()
  }, [user?.$id])

  const handleDeleteItem = useCallback((item: LogItem) => {
    Alert.alert('Remove food?', `Remove ${item.title} from ${item.sourceType}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              let nutrition = {
                kcal: item.kcal,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
              }
              if (Object.values(nutrition).every((value) => value == null)) {
                const data = await authenticatedRequest(`/api/barcode/${encodeURIComponent(item.barcode)}`)
                if (data && typeof data === 'object' && !Array.isArray(data)) {
                  nutrition = macrosFromProduct(unwrapProduct(data as SearchResult))
                }
              }
              await removeProductFromMeal(item.mealId, item.barcode, nutrition)
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              await loadToday()
            } catch (error) {
              console.warn('Failed to delete meal item', error)
              Alert.alert('Unable to remove', 'Please try again.')
            }
          })()
        },
      },
    ])
  }, [loadToday])

  const handleMoveItem = useCallback(async (item: LogItem, targetType: MealType) => {
    if (!user?.$id || item.sourceType === targetType) return
    try {
      await moveProductBetweenMeals(
        user.$id,
        item.mealId,
        item.barcode,
        targetType,
        {
          kcal: item.kcal,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        },
      )
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      await loadToday()
    } catch (error) {
      console.warn('Failed to move meal item', error)
      Alert.alert('Unable to move', 'Please try again.')
      await loadToday()
    }
  }, [loadToday, user])

  const showResults = hasSearched

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 112, paddingHorizontal: gutter },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
        >
          <AppScreenHeader
            overline="Food log"
            title={`Add food for ${selectedMealType}`}
            description="Search, scan a barcode, or choose something you’ve logged before."
          />
          <MotionView
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 280 }}
            style={styles.searchBlock}
          >
            <View style={styles.searchRow}>
              <View style={[styles.searchField, searchFocused && styles.searchFieldFocused]}>
                <Ionicons
                  name="search"
                  size={19}
                  color={searchFocused ? colors.brand : colors.textMuted}
                />
                <TextInput
                  ref={searchInputRef}
                  accessibilityLabel="Search for food"
                  autoCapitalize="sentences"
                  placeholder="Search foods, brands, barcodes…"
                  placeholderTextColor={colors.textFaint}
                  returnKeyType="search"
                  style={styles.searchInput}
                   value={query}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                   onChangeText={(value) => {
                     setQuery(value)
                     if (hasSearched || isSearching) invalidateSearchResults()
                   }}
                  onSubmitEditing={() => void runSearch()}
                />
                {query.length > 0 ? (
                  <Pressable
                    accessibilityLabel="Clear search"
                    hitSlop={8}
                    onPress={clearSearch}
                    style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="close" size={14} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
              {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Search foods"
                onPress={() => void runSearch()}
                style={({ pressed }) => [
                  styles.barcodeButton,
                  pressed && styles.barcodeButtonPressed,
                ]}
              >
              <Ionicons name="search" size={24} color={colors.onBrand} />
              </Pressable>
              ) :
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Scan barcode"
                onPress={() => router.push('/cameraview')}
                style={({ pressed }) => [
                  styles.barcodeButton,
                  pressed && styles.barcodeButtonPressed,
                ]}
              >
                <Ionicons name="barcode-outline" size={24} color={colors.onBrand} />
              </Pressable>
              }
            </View>

            {mealLoadError && !showResults ? (
              <View accessibilityLiveRegion="polite" style={styles.loadNotice}>
                <Ionicons name="cloud-offline-outline" size={18} color={colors.danger} />
                <Text style={styles.loadNoticeText}>{mealLoadError}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading meals"
                  onPress={() => void loadToday()}
                  hitSlop={8}
                  style={styles.loadRetry}
                >
                  <Text style={styles.loadRetryText}>RETRY</Text>
                </Pressable>
              </View>
            ) : null}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {FILTERS.map((chip) => {
                const selected = activeFilter === chip
                return (
                  <Pressable
                    key={chip}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => selectFilter(chip)}
                    style={({ pressed }) => [
                      styles.filterChip,
                      selected && styles.filterChipSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name={selected ? FILTER_ICONS[chip] : (`${FILTER_ICONS[chip]}-outline` as keyof typeof Ionicons.glyphMap)}
                      size={14}
                      color={selected ? colors.onBrand : colors.textMuted}
                    />
                    <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>
                      {chip}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </MotionView>

          {showResults ? (
            <LogFoodMultiView
              isSearching={isSearching}
              results={results}
              searchError={searchError}
              searchQuery={query}
              selectedMealType={selectedMealType}
              mealPickerOpen={mealPickerOpen}
              addStatuses={addStatuses}
              favorites={favorites}
              onToggleMealPicker={() => setMealPickerOpen((open) => !open)}
              onSelectMealType={(type) => {
                void setSelectedMealType(type)
                setMealPickerOpen(false)
              }}
              onAdd={(item, index) => void quickAddResult(item, index)}
              onToggleFavorite={(item) => {
                const product = unwrapProduct(item)
                const barcode = getBarcodeFromProduct(product) ?? getBarcodeFromProduct(item)
                if (!barcode) return
                const macros = macrosFromProduct(product)
                void handleToggleFavorite({
                  barcode,
                  title: getProductTitle(product, barcode),
                  protein: macros.protein,
                  carbs: macros.carbs,
                  fat: macros.fat,
                  kcal: macros.kcal,
                })
              }}
              onOpenDetail={(barcode, item) => openDetail(barcode, item)}
              onBack={clearSearch}
              onContribute={(payload) => {
                const trimmed = query.trim()
                const looksLikeBarcode = /^\d{8,14}$/.test(trimmed)
                const params = buildContributeRouteParams(
                  payload,
                  trimmed,
                  looksLikeBarcode,
                )
                router.push({
                  pathname: '/contribute-food',
                  params,
                })
              }}
            />
          ) : (
            <IdleLogPanels
              colors={colors}
              styles={styles}
              activeFilter={activeFilter}
              loadingMeals={loadingMeals}
              dailyKcal={dailyKcal}
              kcalTarget={kcalTarget}
              sections={sections}
              expanded={expanded}
              recentFoods={recentFoods}
              favorites={favorites}
              historicMeals={historicMeals}
              selectedMealType={selectedMealType}
              onToggleSection={toggleSection}
              onAddFood={(food, mealTypeOverride) => void quickAddFood(food, mealTypeOverride)}
              onToggleFavorite={(food) => void handleToggleFavorite(food)}
              onDeleteItem={handleDeleteItem}
              onMoveItem={setMoveItem}
              onMoveItemToType={(item, type) => void handleMoveItem(item, type)}
              onDraggingChange={(dragging) => setScrollEnabled(!dragging)}
              onOpenDetail={(barcode) => openDetail(barcode)}
              onLogNewMeal={focusSearch}
              signedIn={Boolean(user?.$id)}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={moveItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMoveItem(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMoveItem(null)}>
          <Pressable accessibilityViewIsModal style={styles.moveSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.moveSheetHeader}>
              <View style={styles.moveSheetTitleGroup}>
                <Text style={styles.moveSheetEyebrow}>MOVE ITEM</Text>
                <Text style={styles.moveSheetTitle} numberOfLines={1}>
                  {moveItem?.title}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close move menu"
                hitSlop={8}
                onPress={() => setMoveItem(null)}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.moveOptions}>
              {MEAL_TYPE_OPTIONS.filter((type) => type !== moveItem?.sourceType).map((type) => (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  onPress={() => {
                    const item = moveItem
                    setMoveItem(null)
                    if (item) void handleMoveItem(item, type)
                  }}
                  style={({ pressed }) => [styles.moveOption, pressed && styles.moveOptionPressed]}
                >
                  <Ionicons name={mealTypeIcon(type)} size={20} color={colors.accent} />
                  <Text style={styles.moveOptionText}>{type}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function IdleLogPanels({
  colors,
  styles,
  activeFilter,
  loadingMeals,
  dailyKcal,
  kcalTarget,
  sections,
  expanded,
  recentFoods,
  favorites,
  historicMeals,
  selectedMealType,
  onToggleSection,
  onAddFood,
  onToggleFavorite,
  onDeleteItem,
  onMoveItem,
  onMoveItemToType,
  onDraggingChange,
  onOpenDetail,
  onLogNewMeal,
  signedIn,
}: {
  colors: ThemeColors
  styles: ReturnType<typeof makeStyles>
  activeFilter: FilterChip
  loadingMeals: boolean
  dailyKcal: number
  kcalTarget: number
  sections: LogSection[]
  expanded: Record<string, boolean>
  recentFoods: MealItemPreview[]
  favorites: FavoriteFood[]
  historicMeals: MealDocument[]
  selectedMealType: MealType
  onToggleSection: (type: MealType) => void
  onAddFood: (food: {
    barcode: string
    title: string
    protein?: number | null
    carbs?: number | null
    fat?: number | null
    kcal?: number | null
  }, mealTypeOverride?: MealType) => void
  onToggleFavorite: (food: {
    barcode: string
    title: string
    protein: number | null
    carbs: number | null
    fat: number | null
    kcal: number | null
  }) => void
  onDeleteItem: (item: LogItem) => void
  onMoveItem: (item: LogItem) => void
  onMoveItemToType: (item: LogItem, type: MealType) => void
  onDraggingChange: (dragging: boolean) => void
  onOpenDetail: (barcode: string) => void
  onLogNewMeal: () => void
  signedIn: boolean
}) {
  // Track which quick-row food is being dragged so we can show hints
  const [draggingFoodKey, setDraggingFoodKey] = useState<string | null>(null)
  const showTodayLogs = activeFilter === 'Recent' || activeFilter === 'My Meals'
  const sideTitle =
    activeFilter === 'Favorites'
      ? 'Favorites'
      : activeFilter === 'My Meals'
        ? 'My Meals'
        : 'Recent Foods'

  /**
   * ⚡ Bolt: Pre-compute a Set of favorite barcodes for O(1) status lookups
   * during recent food list rendering.
   */
  const favoriteBarcodesSet = useMemo(
    () => new Set(favorites.map((item) => item.barcode)),
    [favorites],
  )

  const isDraggingFood = draggingFoodKey !== null

  const dropZones = useRef(
    new Map<MealType, { x: number; y: number; width: number; height: number }>()
  ).current
  const zoneNodes = useRef(new Map<MealType, View>()).current
  const [dropTarget, setDropTarget] = useState<MealType | null>(null)
  const [draggingItemKey, setDraggingItemKey] = useState<string | null>(null)

  const remasureZones = useCallback(() => {
    for (const [type, node] of zoneNodes.entries()) {
      node.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          dropZones.set(type, { x, y, width, height })
        }
      })
    }
  }, [dropZones, zoneNodes])

  const bindZone = useCallback(
    (type: MealType) => (node: View | null) => {
      if (!node) {
        zoneNodes.delete(type)
        dropZones.delete(type)
        return
      }
      zoneNodes.set(type, node)
      node.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) {
          dropZones.set(type, { x, y, width, height })
        }
      })
    },
    [dropZones, zoneNodes],
  )

  const findDropTarget = useCallback(
    (absoluteX: number, absoluteY: number): MealType | null => {
      for (const [type, box] of dropZones.entries()) {
        if (
          absoluteX >= box.x &&
          absoluteX <= box.x + box.width &&
          absoluteY >= box.y &&
          absoluteY <= box.y + box.height
        ) {
          return type
        }
      }
      return null
    },
    [dropZones],
  )

  return (
    <>
      {showTodayLogs ? (
        <MotionView
          from={{ opacity: 0, translateY: 12 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 320, delay: 60 }}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s Logs</Text>
            <Text style={styles.sectionMeta}>
              {Math.round(dailyKcal).toLocaleString()} / {kcalTarget.toLocaleString()} kcal
            </Text>
          </View>
          {draggingItemKey ? (
            <Text style={styles.dragHint}>Drag onto another meal to move · release to drop</Text>
          ) : isDraggingFood ? (
            <Text style={[styles.dragHint, { color: colors.accent }]}>Drop onto a meal below to log it there ↓</Text>
          ) : (
            <Text style={styles.dragHint}>Hold an item to rearrange · swipe for Move / Delete</Text>
          )}

          {loadingMeals ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.emptyText}>Loading today&apos;s meals…</Text>
            </View>
          ) : !signedIn ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Sign in to see and organise today&apos;s logs.</Text>
            </View>
          ) : sections.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="book-outline" size={28} color={colors.textMuted} />
              <Text style={styles.emptyText}>No meals yet. Search a food or scan a barcode to begin.</Text>
            </View>
          ) : (
            <View style={styles.mealStack}>
              {sections.map((section, index) => {
                const open = expanded[section.type] !== false
                const isDropTarget = dropTarget === section.type
                return (
                  <MotionView
                    key={section.type}
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'spring', damping: 20, delay: 80 + index * 45 }}
                    style={[
                      styles.mealCard,
                      isDropTarget && styles.mealCardDropTarget,
                    ]}
                  >
                    <View
                      ref={bindZone(section.type)}
                      collapsable={false}
                      onLayout={remasureZones}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: open }}
                        onPress={() => onToggleSection(section.type)}
                        style={({ pressed }) => [styles.mealCardHeader, pressed && styles.pressed]}
                      >
                        <View style={styles.mealCardHeaderLeft}>
                          <Ionicons
                            name={MEAL_ICONS[section.type]}
                            size={18}
                            color={isDropTarget ? colors.accent : colors.success}
                          />
                          <Text style={styles.mealCardTitle}>{section.type}</Text>
                        </View>
                        <View style={styles.mealCardHeaderRight}>
                          <Text style={styles.mealCardKcal}>{Math.round(section.kcal)} kcal</Text>
                          <Ionicons
                            name={open ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={colors.textMuted}
                          />
                        </View>
                      </Pressable>

                      {open ? (
                        <View style={styles.mealItems}>
                          {section.items.map((item, itemIndex) => {
                            const itemKey = `${item.mealId}-${item.barcode}-${itemIndex}`
                            const isGhost = draggingItemKey === itemKey
                            const row = (
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`View ${item.title}`}
                                onPress={() => onOpenDetail(item.barcode)}
                                style={({ pressed }) => [
                                  styles.mealItemRow,
                                  itemIndex > 0 && styles.rowDivider,
                                  isGhost && styles.mealItemGhost,
                                  pressed && styles.pressed,
                                ]}
                              >
                                <Text style={styles.mealItemTime}>{formatClockSafe(item.loggedAt)}</Text>
                                <View style={styles.mealItemCopy}>
                                  <Text style={styles.mealItemTitle} numberOfLines={1}>
                                    {item.title}
                                  </Text>
                                  <Text style={styles.mealItemMeta} numberOfLines={1}>
                                    {servingLabel(item.facts, item.barcode)}
                                  </Text>
                                </View>
                                <Text style={styles.mealItemKcal}>
                                  {item.kcal != null ? Math.round(item.kcal) : '—'}
                                </Text>
                              </Pressable>
                            )

                            return (
                              <LogItemDragRow
                                key={itemKey}
                                findDropTarget={findDropTarget}
                                onDragStart={() => {
                                  remasureZones()
                                  setDraggingItemKey(itemKey)
                                  onDraggingChange(true)
                                }}
                                onDragHover={setDropTarget}
                                onDragEnd={(target) => {
                                  setDraggingItemKey(null)
                                  setDropTarget(null)
                                  onDraggingChange(false)
                                  if (target && target !== item.sourceType) {
                                    onMoveItemToType(item, target)
                                  }
                                }}
                              >
                                <SwipeableRow
                                  swipeLeft={{
                                    label: 'Move',
                                    icon: 'arrow-forward-circle-outline',
                                    onPress: () => onMoveItem(item),
                                  }}
                                  swipeRight={{
                                    label: 'Delete',
                                    icon: 'trash-outline',
                                    destructive: true,
                                    onPress: () => onDeleteItem(item),
                                  }}
                                >
                                  {row}
                                </SwipeableRow>
                              </LogItemDragRow>
                            )
                          })}
                        </View>
                      ) : null}
                    </View>
                  </MotionView>
                )
              })}
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={onLogNewMeal}
            style={({ pressed }) => [
              styles.logNewButton,
              pressed && styles.logNewButtonPressed,
            ]}
          >
            <Ionicons name="add" size={18} color={colors.textMuted} />
            <Text style={styles.logNewButtonText}>Log new meal</Text>
          </Pressable>
        </MotionView>
      ) : null}

      <MotionView
        from={{ opacity: 0, translateY: 14 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 340, delay: 120 }}
        style={styles.section}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{sideTitle}</Text>
          {activeFilter === 'Recent' || activeFilter === 'Favorites' ? (
            <Text style={styles.sectionMeta}>
              {isDraggingFood ? 'Drag to a meal ↑' : `Add to ${selectedMealType}`}
            </Text>
          ) : null}
        </View>

        <View style={styles.recentCard}>
          {activeFilter === 'Favorites' ? (
            favorites.length === 0 ? (
              <View style={styles.inlineEmpty}>
                <Text style={styles.emptyText}>
                  Star foods from search or recent lists to keep them here.
                </Text>
              </View>
            ) : (
              favorites.map((food, index) => (
                <FoodQuickRow
                  key={food.barcode}
                  index={index}
                  title={food.title}
                  barcode={food.barcode}
                  protein={food.protein}
                  fat={food.fat}
                  carbs={food.carbs}
                  favorited
                  styles={styles}
                  colors={colors}
                  findDropTarget={findDropTarget}
                  onDragStart={() => {
                    remasureZones()
                    setDraggingFoodKey(food.barcode)
                    setDropTarget(null)
                    onDraggingChange(true)
                  }}
                  onDragHover={setDropTarget}
                  onDragEnd={(target) => {
                    setDraggingFoodKey(null)
                    setDropTarget(null)
                    onDraggingChange(false)
                    onAddFood(food, target ?? undefined)
                  }}
                  onOpen={() => onOpenDetail(food.barcode)}
                  onAdd={() => onAddFood(food)}
                  onToggleFavorite={() => onToggleFavorite(food)}
                />
              ))
            )
          ) : activeFilter === 'My Meals' ? (
            historicMeals.length === 0 ? (
              <View style={styles.inlineEmpty}>
                <Text style={styles.emptyText}>
                  Past meals will show here for quick re-logging.
                </Text>
              </View>
            ) : (
              historicMeals.map((meal, index) => {
                const firstBarcode = meal.items?.[0]
                return (
                  <MotionView
                    key={meal.$id}
                    from={{ opacity: 0, translateX: 8 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    transition={{ type: 'timing', duration: 260, delay: 140 + index * 40 }}
                    style={[styles.recentRow, index > 0 && styles.rowDivider]}
                  >
                    <Pressable
                      style={styles.recentCopy}
                      onPress={() => firstBarcode && onOpenDetail(firstBarcode)}
                      disabled={!firstBarcode}
                    >
                      <Text style={styles.recentTitle} numberOfLines={1}>
                        {meal.friendlyname?.trim() || meal.type || 'Saved meal'}
                      </Text>
                      <MacroPills
                        protein={meal.protein ?? null}
                        fat={meal.fat ?? null}
                        carbs={meal.carbs ?? null}
                        styles={styles}
                        colors={colors}
                      />
                      <Text style={styles.mealItemMeta}>
                        {meal.kcal != null ? `${Math.round(meal.kcal)} kcal` : '—'} · {meal.type}
                      </Text>
                    </Pressable>
                    {firstBarcode ? (
                      <Pressable
                        accessibilityLabel="Add first item from meal"
                        onPress={() =>
                          onAddFood({
                            barcode: firstBarcode,
                            title: meal.friendlyname?.trim() || meal.type || 'Meal item',
                            kcal: meal.kcal,
                            protein: meal.protein,
                            carbs: meal.carbs,
                            fat: meal.fat,
                          })
                        }
                        style={({ pressed }) => [styles.addCircle, pressed && styles.addCircleActive]}
                      >
                        <Ionicons name="add" size={18} color={colors.textMuted} />
                      </Pressable>
                    ) : null}
                  </MotionView>
                )
              })
            )
          ) : recentFoods.length === 0 ? (
            <View style={styles.inlineEmpty}>
              <Text style={styles.emptyText}>
                Recent foods from today will appear here for one-tap logging.
              </Text>
            </View>
          ) : (
            recentFoods.map((food, index) => (
              <FoodQuickRow
                key={food.barcode}
                index={index}
                title={food.title}
                barcode={food.barcode}
                protein={food.protein}
                fat={food.fat}
                carbs={food.carbs}
                favorited={favoriteBarcodesSet.has(food.barcode)}
                styles={styles}
                colors={colors}
                findDropTarget={findDropTarget}
                onDragStart={() => {
                  remasureZones()
                  setDraggingFoodKey(food.barcode)
                  setDropTarget(null)
                  onDraggingChange(true)
                }}
                onDragHover={setDropTarget}
                onDragEnd={(target) => {
                  setDraggingFoodKey(null)
                  setDropTarget(null)
                  onDraggingChange(false)
                  onAddFood(food, target ?? undefined)
                }}
                onOpen={() => onOpenDetail(food.barcode)}
                onAdd={() => onAddFood(food)}
                onToggleFavorite={() =>
                  onToggleFavorite({
                    barcode: food.barcode,
                    title: food.title,
                    protein: food.protein,
                    carbs: food.carbs,
                    fat: food.fat,
                    kcal: food.kcal,
                  })
                }
              />
            ))
          )}
        </View>
      </MotionView>
    </>
  )
}

const FoodQuickRow = memo(
  function FoodQuickRow({
    index,
    title,
    barcode,
    protein,
    fat,
    carbs,
    favorited,
    styles,
    colors,
    findDropTarget,
    onDragStart,
    onDragHover,
    onDragEnd,
    onOpen,
    onAdd,
    onToggleFavorite,
  }: {
    index: number
    title: string
    barcode: string
    protein: number | null
    fat: number | null
    carbs: number | null
    favorited: boolean
    styles: ReturnType<typeof makeStyles>
    colors: ThemeColors
    findDropTarget?: (x: number, y: number) => MealType | null
    onDragStart?: () => void
    onDragHover?: (target: MealType | null) => void
    onDragEnd?: (target: MealType | null) => void
    onOpen: () => void
    onAdd: () => void
    onToggleFavorite: () => void
  }) {
    const row = (
      <View style={[styles.recentRow, index > 0 && styles.rowDivider]}>
        <Pressable style={styles.recentCopy} onPress={onOpen}>
          <View style={styles.recentTitleRow}>
            <Text style={styles.recentTitle} numberOfLines={1}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={favorited ? 'Remove favorite' : 'Save favorite'}
              hitSlop={8}
              onPress={onToggleFavorite}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Ionicons
                name={favorited ? 'star' : 'star-outline'}
                size={16}
                color={favorited ? colors.accent : colors.textFaint}
              />
            </Pressable>
          </View>
          <MacroPills
            protein={protein}
            fat={fat}
            carbs={carbs}
            styles={styles}
            colors={colors}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${title}`}
          onPress={onAdd}
          style={({ pressed }) => [styles.addCircle, pressed && styles.addCircleActive]}
        >
          <Ionicons
            name="add"
            size={18}
            color={pressedColor(colors, false)}
          />
        </Pressable>
      </View>
    )

    const dragEnabled = Boolean(findDropTarget && onDragStart && onDragHover && onDragEnd)

    const inner = (
      <MotionView
        from={{ opacity: 0, translateX: 8 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 260, delay: 140 + index * 40 }}
      >
        <SwipeableRow
          swipeLeft={{
            label: 'Add',
            icon: 'add-circle-outline',
            onPress: onAdd,
          }}
        >
          {row}
        </SwipeableRow>
      </MotionView>
    )

    if (dragEnabled) {
      return (
        <LogItemDragRow
          findDropTarget={findDropTarget!}
          onDragStart={onDragStart!}
          onDragHover={onDragHover!}
          onDragEnd={onDragEnd!}
        >
          {inner}
        </LogItemDragRow>
      )
    }

    return inner
  },
)

function pressedColor(colors: ThemeColors, active: boolean) {
  return active ? colors.onBrand : colors.textMuted
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    gap: 20,
  },
  searchBlock: {
    gap: spacing.md,
  },
  loadNotice: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    backgroundColor: c.dangerSoft,
    borderLeftWidth: 2,
    borderLeftColor: c.danger,
  },
  loadNoticeText: { ...typography.bodySmall, color: c.textMuted, flex: 1 },
  loadRetry: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  loadRetryText: { ...typography.overline, color: c.danger },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  searchField: {
    flex: 1,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: 18,
    paddingRight: spacing.md,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.md,
  },
  searchFieldFocused: {
    borderColor: c.brand,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: c.text,
    paddingVertical: 13,
    // The pill container renders the focus ring; hide the browser default on web.
    // react-native-web honors outlineStyle 'none' even though RN types omit it.
    ...(Platform.OS === 'web'
      ? ({ outlineStyle: 'none' } as unknown as Record<string, never>)
      : null),
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
  },
  barcodeButton: {
    width: 54,
    height: 54,
    borderRadius: borderRadius.pill,
    backgroundColor: c.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeButtonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.92,
  },
  chipRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  filterChip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  filterChipSelected: {
    backgroundColor: c.brand,
    borderColor: c.brand,
  },
  filterChipText: {
    ...typography.labelSmall,
    color: c.textMuted,
  },
  filterChipTextSelected: {
    color: c.onBrand,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderStrong,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.metric,
    color: c.text,
    flex: 1,
    minWidth: 0,
  },
  sectionMeta: {
    ...typography.label,
    color: c.textMuted,
    flexShrink: 1,
    textAlign: 'right',
  },
  dragHint: {
    ...typography.labelSmall,
    color: c.textFaint,
    marginTop: -spacing.sm,
  },
  mealStack: {
    gap: spacing.md,
  },
  mealCard: {
    backgroundColor: c.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  mealCardDropTarget: {
    borderColor: c.accent,
    backgroundColor: c.accentSoft,
  },
  mealCardHeader: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    backgroundColor: c.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  mealCardTitle: {
    ...typography.label,
    color: c.accent,
    fontWeight: '700',
  },
  mealCardKcal: {
    ...typography.label,
    color: c.text,
  },
  mealItems: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  mealItemRow: {
    minHeight: 64,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.surface,
  },
  mealItemGhost: {
    opacity: 0.35,
  },
  mealItemTime: {
    ...typography.label,
    color: c.textMuted,
    width: 48,
  },
  mealItemCopy: {
    flex: 1,
    gap: 2,
  },
  mealItemTitle: {
    ...typography.body,
    color: c.text,
  },
  mealItemMeta: {
    ...typography.labelSmall,
    color: c.textMuted,
  },
  mealItemKcal: {
    ...typography.label,
    color: c.accent,
    fontWeight: '700',
  },
  logNewButton: {
    minHeight: 54,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  logNewButtonPressed: {
    borderColor: c.accent,
    backgroundColor: c.surfaceAlt,
  },
  logNewButtonText: {
    ...typography.label,
    color: c.textMuted,
  },
  recentCard: {
    backgroundColor: c.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  recentRow: {
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: c.surface,
  },
  recentCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  recentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  recentTitle: {
    ...typography.body,
    color: c.text,
    flex: 1,
  },
  macroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  macroPill: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  macroProtein: {
    backgroundColor: c.surfaceAlt,
  },
  macroFat: {
    backgroundColor: c.surfaceAlt,
  },
  macroCarbs: {
    backgroundColor: c.surfaceAlt,
  },
  macroPillText: {
    ...typography.labelSmall,
    fontSize: 10,
  },
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircleActive: {
    backgroundColor: c.brand,
    borderColor: c.brand,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  emptyCard: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: c.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.lg,
  },
  inlineEmpty: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: c.textMuted,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: c.overlay,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  moveSheet: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    padding: 18,
    borderRadius: borderRadius.lg,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    gap: spacing.sm,
  },
  moveSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  moveSheetTitleGroup: { flex: 1, gap: 3 },
  moveSheetEyebrow: {
    ...typography.labelSmall,
    color: c.success,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  moveSheetTitle: {
    ...typography.headline,
    color: c.text,
  },
  moveOptions: { gap: 8 },
  moveOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
  },
  moveOptionPressed: { backgroundColor: c.accentSoft },
  moveOptionText: {
    flex: 1,
    ...typography.body,
    color: c.text,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.78,
  },
})
