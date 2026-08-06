import { authenticatedRequest } from '@/components/apiUtils';
import { MealTypePicker } from '@/components/MealTypePicker';
import { SearchModeSwapButton } from '@/components/SearchModeSwapButton';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const PlaceholderImage = require('../../../assets/images/dark.svg');

type SearchType = 'Text' | 'Barcode';

<<<<<<< HEAD
async function fetchQuery(query: string): Promise<string> {
  try {
    const data = await authenticatedRequest(`/api/fuzzy/${encodeURIComponent(query)}`);
    return typeof data === 'string' ? data : JSON.stringify(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `Request failed: ${message}`;
=======
const FILTERS: FilterChip[] = ['Favorites', 'Recent', 'My Meals', 'Recipes']

const FILTER_ICONS: Record<FilterChip, keyof typeof Ionicons.glyphMap> = {
  Favorites: 'star',
  Recent: 'time',
  'My Meals': 'restaurant',
  Recipes: 'book',
}

const MEAL_ICONS: Record<MealType, keyof typeof Ionicons.glyphMap> = {
  Breakfast: 'cafe-outline',
  Lunch: 'restaurant-outline',
  Dinner: 'moon-outline',
  Snack: 'nutrition-outline',
  Other: 'ellipse-outline',
}

function formatClockSafe(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--:--'
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function getBrand(item: SearchResult): string {
  for (const key of ['brands', 'brand', 'manufacturer', 'store']) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
  }
}

async function fetchBarcodeManual(query: string): Promise<string> {
  try {
    const data = await authenticatedRequest(`/api/barcode/${encodeURIComponent(query)}`);
    return typeof data === 'string' ? data : JSON.stringify(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `Request failed: ${message}`;
  }
}

function CrossPlatformDropDown({ 
  selectedType, 
  onSelectType 
}: { 
  selectedType: SearchType; 
  onSelectType: (type: SearchType) => void; 
}) {
<<<<<<< HEAD
  const [isVisible, setIsVisible] = useState(false);
  const options: SearchType[] = ['Text', 'Barcode'];
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity onPress={() => setIsVisible(!isVisible)} style={styles.dropdownTrigger}>
        <Text style={styles.dropdownTriggerText}>{selectedType} ▼</Text>
      </TouchableOpacity>

      {isVisible && (
        <>
          <Pressable style={styles.blanket} onPress={() => setIsVisible(false)} />
          
          <View style={styles.floatingMenu}>
            {options.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.dropdownItem,
                  item === selectedType && styles.dropdownItemSelected
=======
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
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()
  const { user } = useAuth()
  const { selectedMealType, setSelectedMealType } = useMealTypePreferences()
  const searchInputRef = useRef<TextInput>(null)
  const runSearchRef = useRef<(rawQuery?: string) => Promise<void>>(async () => {})

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
  const [addStatuses, setAddStatuses] = useState<
    Record<number, { state: 'adding' | 'added' | 'error'; message: string }>
  >({})
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null)
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const loadToday = useCallback(async () => {
    if (!user?.$id) {
      setTodayMeals([])
      setHistoricMeals([])
      setFavorites(await loadFavoriteFoods())
      setLoadingMeals(false)
      return
    }

    setLoadingMeals(true)
    try {
      const [meals, profile, history, savedFavorites] = await Promise.all([
        getTodayMeals(user.$id),
        getProfile(user.$id),
        listHistoricMeals(user.$id, 8),
        loadFavoriteFoods(),
      ])
      setTodayMeals(meals)
      setHistoricMeals(history)
      setFavorites(savedFavorites)
      if (profile?.target_kcal) setKcalTarget(profile.target_kcal)

      const nextPreviews: Record<string, MealItemPreview> = {}
      await Promise.all(
        meals.flatMap((meal) =>
          (meal.items ?? []).map(async (barcode, index) => {
            const key = `${meal.$id}-${index}-${barcode}`
            nextPreviews[key] = await fetchMealItemPreview(
              barcode,
              (meal.type ?? 'Other') as MealType,
            )
          }),
        ),
      )
      setPreviews(nextPreviews)
    } catch (error) {
      console.warn('[Log] failed to load today meals', error)
    } finally {
      setLoadingMeals(false)
    }
  }, [user])

  const runSearch = useCallback(async (rawQuery?: string) => {
    const trimmed = (rawQuery ?? query).trim()
    if (!trimmed) return

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
      const parsed = parseSearchPayload(data)
      setResults(parsed)
      if (parsed.length === 0) {
        setSearchError('No matches found. Try another food or scan a barcode.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed'
      setResults([])
      setSearchError(message)
    } finally {
      setIsSearching(false)
    }
  }, [query])

  useEffect(() => {
    runSearchRef.current = runSearch
  }, [runSearch])

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

  const sections = useMemo<LogSection[]>(() => {
    return MEAL_TYPE_OPTIONS.map((type) => {
      const mealsForType = todayMeals.filter((meal) => meal.type === type)
      const items: LogItem[] = []
      let kcal = 0

      for (const meal of mealsForType) {
        kcal += meal.kcal ?? 0
        for (const [index, barcode] of (meal.items ?? []).entries()) {
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
          items.push({
            ...preview,
            mealId: meal.$id,
            sourceType: type,
            loggedAt: meal.$createdAt,
          })
        }
      }

      return { type, kcal, items }
    }).filter((section) => section.items.length > 0 || section.kcal > 0)
  }, [previews, todayMeals])

  const dailyKcal = useMemo(
    () => todayMeals.reduce((sum, meal) => sum + (meal.kcal ?? 0), 0),
    [todayMeals],
  )

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

  const clearSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setHasSearched(false)
    setResults([])
    setSearchError(null)
    setAddStatuses({})
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

  const openDetail = useCallback(async (barcode: string) => {
    setSelectedBarcode(barcode)
    setModalVisible(true)
    setDetailLoading(true)
    setDetailError(null)
    setDetailData(null)
    try {
      const data = await authenticatedRequest(`/api/barcode/${barcode}`)
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        setDetailData(data as Record<string, unknown>)
      } else {
        setDetailData({ result: data })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setDetailError(`Request failed: ${message}`)
    } finally {
      setDetailLoading(false)
    }
  }, [])

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
  }) => {
    if (!user?.$id) return
    try {
      const data = await authenticatedRequest(`/api/barcode/${encodeURIComponent(food.barcode)}`)
      const product =
        data && typeof data === 'object' && !Array.isArray(data)
          ? unwrapProduct(data as SearchResult)
          : { code: food.barcode, product_name: food.title }
      await addProductToMeal(user.$id, selectedMealType, food.barcode, product)
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      await loadToday()
    } catch (error) {
      console.warn('Could not add food', error)
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
    const next = await toggleFavoriteFood(food)
    setFavorites(next)
    await Haptics.selectionAsync()
  }, [])

  const handleDeleteItem = useCallback((item: LogItem) => {
    Alert.alert('Remove food?', `Remove ${item.title} from ${item.sourceType}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await removeProductFromMeal(item.mealId, item.barcode, {
                kcal: item.kcal,
                protein: item.protein,
                carbs: item.carbs,
                fat: item.fat,
              })
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

  const showResults = hasSearched

  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 110 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
                  color={searchFocused ? colors.accent : colors.textMuted}
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
                    if (!value.trim() && hasSearched) clearSearch()
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
              <Pressable
                accessibilityLabel="Scan barcode"
                onPress={() => router.push('/cameraview')}
                style={({ pressed }) => [
                  styles.barcodeButton,
                  pressed && styles.barcodeButtonPressed,
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
                ]}
                onPress={() => {
                  onSelectType(item);
                  setIsVisible(false);
                }}
              >
<<<<<<< HEAD
                <Text style={styles.dropdownItemText}>{item}</Text>
              </TouchableOpacity>
            ))}
=======
                <Ionicons name="barcode-outline" size={24} color={colors.onAccent} />
              </Pressable>
            </View>

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
                      color={selected ? colors.onAccent : colors.textMuted}
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
            <SearchResultsPanel
              colors={colors}
              styles={styles}
              isSearching={isSearching}
              results={results}
              searchError={searchError}
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
                void handleToggleFavorite({
                  barcode,
                  title: getProductTitle(product, barcode),
                  protein: null,
                  carbs: null,
                  fat: null,
                  kcal: null,
                })
              }}
              onOpenDetail={(barcode) => void openDetail(barcode)}
              onBack={clearSearch}
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
              onAddFood={(food) => void quickAddFood(food)}
              onToggleFavorite={(food) => void handleToggleFavorite(food)}
              onDeleteItem={handleDeleteItem}
              onOpenDetail={(barcode) => void openDetail(barcode)}
              onLogNewMeal={focusSearch}
              signedIn={Boolean(user?.$id)}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <BarcodeDetailModal
        visible={modalVisible}
        barcode={selectedBarcode}
        data={detailData}
        isLoading={detailLoading}
        error={detailError}
        onClose={() => setModalVisible(false)}
        onMealAdded={() => void loadToday()}
      />
    </GestureHandlerRootView>
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
  }) => void
  onToggleFavorite: (food: {
    barcode: string
    title: string
    protein: number | null
    carbs: number | null
    fat: number | null
    kcal: number | null
  }) => void
  onDeleteItem: (item: LogItem) => void
  onOpenDetail: (barcode: string) => void
  onLogNewMeal: () => void
  signedIn: boolean
}) {
  const showTodayLogs = activeFilter === 'Recent' || activeFilter === 'My Meals'
  const sideTitle =
    activeFilter === 'Favorites'
      ? 'Favorites'
      : activeFilter === 'My Meals'
        ? 'My Meals'
        : activeFilter === 'Recipes'
          ? 'Recipes'
          : 'Recent Foods'

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
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
          </View>
        </>
      )}
    </View>
  );
}

export default function Index() {
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [searchType, setSearchType] = useState<SearchType>('Text');

  const handleTextResponse = useCallback(
    (data: string) => {
      router.push({
        pathname: '/multiresponse',
        params: { query, result: data },
      });
    },
    [query, router],
  );

  const handleScanPress = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    let result = '';

    if (searchType === 'Barcode') {
      result = await fetchBarcodeManual(query.trim());
    } else {
      result = await fetchQuery(query.trim());
    }

    setIsLoading(false);
    handleTextResponse(result);
  };

  const handleCameraPress = () => {
        router.push('/cameraview');
  };

  return (
    <View style={styles.container}>

      <View style={styles.headerRow}>
        <Text style={styles.titleText}>Manually Search {searchType === 'Barcode' ? 'for a' : 'for'}</Text>
        <CrossPlatformDropDown selectedType={searchType} onSelectType={setSearchType} />
      </View>

      {/* Outer row wrapper acting as the visual input background/border */}
      <View style={styles.inputContainer}>
        <TextInput
          placeholder={searchType === 'Barcode' ? "Enter barcode string..." : "Enter query..."}
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
        />
        
        {/* The interactive camera overlay button positioned cleanly inside the row */}
        <TouchableOpacity 
          style={styles.cameraButton} 
          onPress={handleCameraPress}
          activeOpacity={0.7}
        >
          <Text style={styles.cameraIcon}>Scan <Ionicons name={'barcode'} size={24} /> </Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleScanPress}
        disabled={isLoading || !query.trim()}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Please Wait...' : 'Search'}
        </Text>
      </TouchableOpacity>
      
      <MealTypePicker />
      <SearchModeSwapButton current="text_query" />
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
    alignItems: 'center',
  },
<<<<<<< HEAD
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  image: {
    width: 260,
    height: 260,
    borderRadius: 18,
    maxWidth: '90%', 
=======
  searchField: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: 18,
    paddingRight: spacing.md,
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: borderRadius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  searchFieldFocused: {
    borderColor: c.accent,
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 3,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surfaceAlt,
  },
  barcodeButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  barcodeButtonPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.92,
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
  },
  headerRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginTop: 20, 
    marginHorizontal: 20,
    width: '85%',
    maxWidth: 440,
  },
<<<<<<< HEAD
  // Row layout framing both TextInput and the camera icon together safely
  inputContainer: {
=======
  filterChip: {
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
    backgroundColor: c.accent,
    borderColor: c.accent,
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  filterChipText: {
    ...typography.labelSmall,
    color: c.textMuted,
  },
  filterChipTextSelected: {
    color: c.onAccent,
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
    ...typography.headline,
    color: c.accent,
  },
  sectionMeta: {
    ...typography.label,
    color: c.textMuted,
  },
  resultsHeading: {
>>>>>>> 05b5b1a8bf5c3bb3f4899ee6ea0888c032493fa0
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surfaceAlt,
    borderRadius: 12,
    width: '85%',
    maxWidth: 440,
    marginTop: 10,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  // Allows text layout to take up all empty space up to the camera trigger boundaries
  input: {
    flex: 1,
    color: c.text,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 14,
    fontSize: 16,
  },
  // Hitbox parameters for your overlay action
  cameraButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    fontSize: 18,
  },
  button: {
    backgroundColor: c.accent,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    width: '85%',
    maxWidth: 440,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: c.onAccent,
    fontSize: 16,
    fontWeight: 'bold',
  },
  titleText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: c.text,
    letterSpacing: -0.3,
  },
  dropdownContainer: {
    position: 'relative',
    zIndex: 50,
  },
  dropdownTrigger: {
    backgroundColor: c.surfaceAlt,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  dropdownTriggerText: {
    color: c.accent, 
    fontSize: 22,
    fontWeight: 'bold',
  },
  blanket: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 1,
  },
  floatingMenu: {
    position: 'absolute',
    top: 48,
    right: 0,
    backgroundColor: c.surface,
    borderRadius: 12,
    width: 160,
    paddingVertical: 6,
    paddingHorizontal: 6,
    zIndex: 2,
    borderWidth: 1,
    borderColor: c.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.4)',
      }
    }),
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginVertical: 2,
  },
  dropdownItemSelected: {
    backgroundColor: c.accentSoft,
  },
  dropdownItemText: {
    color: c.text,
    fontSize: 16,
    fontWeight: '500',
  },
});