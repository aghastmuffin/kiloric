import {
  Card,
  CheckCircle,
  Chip,
  Divider,
  EmptyState,
  ErrorNote,
  Field,
  IconButton,
  LoadingBlock,
  ScreenHeader,
  ScreenScroll,
  SearchField,
  Segmented,
  Txt,
  UButton,
  useShell,
} from '@/components/ds'
import { authenticatedRequest } from '@/lib/apiUtils'
import { showApiError } from '@/lib/apiErrors'
import { withTimeout } from '@/lib/asyncUtils'
import { useAuth } from '@/lib/AuthContext'
import {
  entryMacros,
  foodItemFromEntry,
  frequentFoods,
  LOG_MEAL_TYPES,
  listEntriesForDay,
  listRecentEntries,
  logFood,
  recentFoods,
  removeFoodEntry,
  type FoodEntry,
  type FoodEntrySource,
  type LogMealType,
} from '@/lib/data/foodLog'
import { formatAmount, formatKcal, foodItemFromProduct, scaleMacros, type FoodItem } from '@/lib/data/foodItem'
import { loadTodayBudget } from '@/lib/data/overview'
import { stashReviewItem } from '@/lib/data/reviewHandoff'
import { listSavedMeals, logSavedMeal, saveMealFromEntries, type SavedMeal } from '@/lib/data/savedMeals'
import { useFocusLoader } from '@/lib/data/useLoader'
import { useMealTypePreferences } from '@/lib/MealTypePreferencesContext'
import { usePalette } from '@/lib/theme/palette'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

type ListTab = 'recent' | 'frequent' | 'meals' | 'results'

type Selection =
  | { kind: 'food'; key: string; item: FoodItem; servings: number; source: FoodEntrySource }
  | { kind: 'meal'; key: string; meal: SavedMeal }

type Row = {
  key: string
  title: string
  subtitle: string
  kcal: number
  selection: Selection
  onOpen?: () => void
}

const MEAL_OPTIONS = LOG_MEAL_TYPES.map((type) => ({ value: type, label: type }))

function asLogMealType(value: string): LogMealType {
  return (LOG_MEAL_TYPES as readonly string[]).includes(value) ? (value as LogMealType) : 'Snack'
}

function servingSubtitle(label: string | null | undefined, servings: number): string {
  const base = (label ?? '1 serving').replace(/^1 serving = /, '')
  return servings === 1 ? base : `${formatAmount(servings)} × ${base}`
}

function parseSearchItems(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (Array.isArray(record.items)) return parseSearchItems(record.items)
    if (Array.isArray(record.results)) return parseSearchItems(record.results)
    return [record]
  }
  return []
}

export default function LogFoodScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const c = usePalette()
  const userId = user?.$id ?? null
  const { selectedMealType, setSelectedMealType } = useMealTypePreferences()
  const { wide } = useShell()
  const mealType = asLogMealType(selectedMealType)

  const [tab, setTab] = useState<ListTab>('recent')
  const [selected, setSelected] = useState<Map<string, Selection>>(new Map())
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [results, setResults] = useState<FoodItem[]>([])
  const [adding, setAdding] = useState(false)

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeSearchQueryRef = useRef<string>('')

  function clearSearchDebounce() {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
      searchTimeoutRef.current = null
    }
  }

  useEffect(() => {
    return () => clearSearchDebounce()
  }, [])
  const [mealName, setMealName] = useState('')
  const [savingMeal, setSavingMeal] = useState(false)
  const [savePanelOpen, setSavePanelOpen] = useState(false)

  const state = useFocusLoader(async () => {
    const [budget, recent, todayEntries, savedMeals] = await Promise.all([
      loadTodayBudget(userId!, user?.name),
      listRecentEntries(userId!),
      listEntriesForDay(userId!),
      listSavedMeals(userId!),
    ])
    return { budget, recent, todayEntries, savedMeals }
  }, userId)

  const data = state.data
  const recent = useMemo(() => (data ? recentFoods(data.recent) : []), [data])
  const frequent = useMemo(() => (data ? frequentFoods(data.recent) : []), [data])
  const loggedForMeal = useMemo(
    () => (data ? data.todayEntries.filter((entry) => entry.meal_type === mealType) : []),
    [data, mealType],
  )

  function openReview(item: FoodItem, source: FoodEntrySource, servings = 1) {
    const id = stashReviewItem(item, source, servings)
    router.push({ pathname: '/review-log', params: { id, meal: mealType } })
  }

  function entryRow(entry: FoodEntry, prefix: string): Row {
    const item = foodItemFromEntry(entry)
    return {
      key: `${prefix}:${entry.$id}`,
      title: entry.name,
      subtitle: `${servingSubtitle(entry.serving_label, entry.servings)} · ${formatKcal(entry.kcal)} kcal${entry.protein >= 10 ? ` · ${Math.round(entry.protein)} g protein` : ''}`,
      kcal: entry.kcal,
      selection: { kind: 'food', key: `${prefix}:${entry.$id}`, item, servings: entry.servings, source: 'recent' },
      onOpen: () => openReview(item, 'recent', entry.servings),
    }
  }

  const rows: Row[] = useMemo(() => {
    if (tab === 'results') {
      return results.map((item, index) => {
        const key = `result:${item.barcode ?? item.name}:${index}`
        return {
          key,
          title: item.name,
          subtitle: `${[item.brand, item.servingLabel.replace(/^1 serving = /, '')].filter(Boolean).join(' · ')} · ${formatKcal(item.perServing.kcal)} kcal`,
          kcal: item.perServing.kcal,
          selection: { kind: 'food', key, item, servings: 1, source: 'search' },
          onOpen: () => openReview(item, 'search'),
        }
      })
    }
    if (tab === 'frequent') return frequent.map(({ entry }) => entryRow(entry, 'frequent'))
    if (tab === 'meals') {
      return (data?.savedMeals ?? []).map((meal) => ({
        key: `meal:${meal.$id}`,
        title: meal.name,
        subtitle: `${meal.item_count} item${meal.item_count === 1 ? '' : 's'} · ${formatKcal(meal.kcal)} kcal`,
        kcal: meal.kcal,
        selection: { kind: 'meal', key: `meal:${meal.$id}`, meal },
      }))
    }
    return recent.map((entry) => entryRow(entry, 'recent'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, results, frequent, recent, data, mealType])

  const selectedKcal = useMemo(() => {
    let total = 0
    for (const selection of selected.values()) {
      total += selection.kind === 'meal' ? selection.meal.kcal : scaleMacros(selection.item.perServing, selection.servings).kcal
    }
    return total
  }, [selected])

  function toggle(row: Row) {
    setSelected((current) => {
      const next = new Map(current)
      if (next.has(row.key)) next.delete(row.key)
      else next.set(row.key, row.selection)
      return next
    })
  }

  function openContribute() {
    const text = query.trim()
    router.push({ pathname: '/contribute-food', params: text ? (/^\d{8,14}$/.test(text) ? { code: text } : { query: text }) : {} })
  }

  async function runSearch(text: string) {
    clearSearchDebounce()
    const trimmed = text.trim()
    activeSearchQueryRef.current = trimmed
    if (!trimmed) {
      setResults([])
      setSearching(false)
      setSearchError(null)
      return
    }
    if (/^\d{8,14}$/.test(trimmed)) {
      setSearching(false)
      router.push({ pathname: '/review-log', params: { barcode: trimmed, source: 'search', meal: mealType } })
      return
    }
    setSearching(true)
    setSearchError(null)
    setTab('results')
    try {
      const response = await authenticatedRequest(`/api/fuzzy/${encodeURIComponent(trimmed)}`)
      if (activeSearchQueryRef.current !== trimmed) return
      const items = parseSearchItems(response).map(foodItemFromProduct).filter((item) => item.perServing.kcal > 0 || item.name)
      setResults(items.slice(0, 25))
      if (items.length === 0) setSearchError(`No matches for “${trimmed}”.`)
    } catch (err) {
      if (activeSearchQueryRef.current !== trimmed) return
      setResults([])
      setSearchError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      if (activeSearchQueryRef.current === trimmed) {
        setSearching(false)
      }
    }
  }

  function handleQueryChange(text: string) {
    setQuery(text)
    clearSearchDebounce()
    const trimmed = text.trim()
    if (!trimmed) {
      activeSearchQueryRef.current = ''
      setSearching(false)
      setSearchError(null)
      setResults([])
      if (tab === 'results') setTab('recent')
      return
    }
    setTab('results')
    setSearching(true)
    setSearchError(null)
    searchTimeoutRef.current = setTimeout(() => {
      void runSearch(text)
    }, 300)
  }

  function handleSearchSubmit(text: string) {
    clearSearchDebounce()
    void runSearch(text)
  }

  async function addSelected() {
    if (!userId || selected.size === 0) return
    setAdding(true)
    try {
      for (const selection of selected.values()) {
        if (selection.kind === 'meal') await logSavedMeal(userId, selection.meal, mealType)
        else await logFood(userId, { item: selection.item, servings: selection.servings, mealType, source: selection.source })
      }
      setSelected(new Map())
      await state.reload()
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setAdding(false)
    }
  }

  async function removeEntry(entry: FoodEntry) {
    if (!userId) return
    try {
      await removeFoodEntry(userId, entry)
      await state.reload()
    } catch (err) {
      showApiError(err, 'appwrite')
    }
  }

  async function saveMeal() {
    if (!userId) return
    setSavingMeal(true)
    try {
      await withTimeout(
        saveMealFromEntries(userId, mealName || `My ${mealType.toLowerCase()}`, mealType, loggedForMeal),
        10000,
        'Saving meal timed out. Please check your connection and try again.',
      )
      setMealName('')
      setSavePanelOpen(false)
      setTab('meals')
      await state.reload()
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setSavingMeal(false)
    }
  }

  const remaining = data?.budget.remaining
  const overline = remaining != null ? `Today · ${formatKcal(Math.abs(remaining))} kcal ${remaining < 0 ? 'over' : 'left'}` : 'Today'
  const count = selected.size
  const footer =
    count > 0 ? (
      <UButton
        label={adding ? 'Adding…' : `Add ${count} item${count === 1 ? '' : 's'} to ${mealType}`}
        trailing={`${formatKcal(selectedKcal)} kcal`}
        size="lg"
        fullWidth
        disabled={adding}
        onPress={addSelected}
        testID="add-selected"
      />
    ) : null

  const emptyCopy: Record<ListTab, { title: string; body: string }> = {
    recent: { title: 'Nothing logged yet', body: 'Search or scan a food to log your first item.' },
    frequent: { title: 'No favourites yet', body: 'Foods you log more than once show up here.' },
    meals: { title: 'No saved meals', body: 'Log a few foods, then save them together as a meal below.' },
    results: {
      title: searchError ?? (query.trim() ? `No results for “${query.trim()}”` : 'Search for a food'),
      body: query.trim() ? 'Try another name or scan the barcode, or contribute it below.' : 'Try a brand, a dish, or a barcode number.',
    },
  }

  return (
    <ScreenScroll footer={footer} refreshing={state.loading} onRefresh={state.reload} maxWidth={wide ? 860 : undefined}>
      <ScreenHeader
        overline={overline}
        title="Log food"
        right={
          !wide && router.canGoBack() ? (
            <IconButton icon="close" accessibilityLabel="Close log food" onPress={() => router.back()} />
          ) : null
        }
      />
      <Segmented
        options={MEAL_OPTIONS}
        value={mealType}
        onChange={(value) => void setSelectedMealType(value)}
        testID="meal-segment"
      />
      <View style={styles.searchRow}>
        <SearchField
          placeholder="Search foods, brands, meals"
          onChangeText={handleQueryChange}
          onSubmit={handleSearchSubmit}
          testID="food-search"
        />
        <IconButton
          icon="scan-outline"
          tone="primary"
          size={60}
          accessibilityLabel="Scan a barcode"
          onPress={() => router.push('/cameraview')}
          style={styles.scanButton}
          testID="scan-button"
        />
      </View>
      <View style={styles.chips}>
        <Chip label="Recent" selected={tab === 'recent'} onPress={() => setTab('recent')} />
        <Chip label="Frequent" selected={tab === 'frequent'} onPress={() => setTab('frequent')} />
        <Chip label="My meals" selected={tab === 'meals'} onPress={() => setTab('meals')} />
        {results.length > 0 || searchError || searching ? (
          <Chip label="Results" selected={tab === 'results'} onPress={() => setTab('results')} />
        ) : null}
      </View>
      {query.trim() && tab !== 'results' ? (
        <UButton label={`Search “${query.trim()}”`} tone="mint" size="sm" onPress={() => void runSearch(query)} />
      ) : null}

      {state.error ? <ErrorNote message={state.error} onRetry={state.reload} /> : null}

      <Card padded={false} style={styles.listCard} testID="food-list">
        {searching || (!data && state.loading) ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="nutrition-outline"
            title={emptyCopy[tab].title}
            body={emptyCopy[tab].body}
            actionLabel={tab === 'results' && (searchError || query.trim()) ? 'Add this food' : undefined}
            onAction={tab === 'results' ? openContribute : undefined}
          />
        ) : (
          rows.map((row, index) => (
            <Fragment key={row.key}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint={row.onOpen ? 'Adjust amount before logging' : undefined}
                  onPress={row.onOpen ?? (() => toggle(row))}
                  style={styles.rowText}
                >
                  <Txt variant="subheading" numberOfLines={1}>
                    {row.title}
                  </Txt>
                  <Txt variant="caption" tone="muted" numberOfLines={1}>
                    {row.subtitle}
                  </Txt>
                </Pressable>
                <CheckCircle
                  tone="add"
                  size={44}
                  checked={selected.has(row.key)}
                  accessibilityLabel={`Select ${row.title}`}
                  onPress={() => toggle(row)}
                />
              </View>
            </Fragment>
          ))
        )}
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityHint="Snap a few photos of the package to add it"
        onPress={openContribute}
        testID="add-a-food"
        style={({ pressed }) => [styles.addFood, { backgroundColor: c.mint, opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={[styles.addFoodIcon, { backgroundColor: c.card }]}>
          <Ionicons name="camera-outline" size={22} color={c.mintInk} />
        </View>
        <View style={styles.rowText}>
          <Txt variant="subheading" color={c.mintInk}>
            Can’t find it? Add a food
          </Txt>
          <Txt variant="caption" color={c.mintInk}>
            Snap the barcode, front, ingredients and label.
          </Txt>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.mintInk} />
      </Pressable>

      <Card testID="logged-today">
        <View style={styles.sectionHeader}>
          <Txt variant="subheading">{mealType} today</Txt>
          <Txt variant="caption" tone="muted">
            {formatKcal(loggedForMeal.reduce((sum, entry) => sum + entry.kcal, 0))} kcal
          </Txt>
        </View>
        {loggedForMeal.length === 0 ? (
          <Txt variant="caption" tone="muted">
            Nothing logged to {mealType.toLowerCase()} yet.
          </Txt>
        ) : (
          loggedForMeal.map((entry) => {
            const macros = entryMacros(entry)
            return (
              <View key={entry.$id} style={styles.loggedRow}>
                <View style={styles.rowText}>
                  <Txt variant="bodyStrong" numberOfLines={1}>
                    {entry.name}
                  </Txt>
                  <Txt variant="caption" tone="muted">
                    {formatKcal(macros.kcal)} kcal · P {Math.round(macros.protein)} · C {Math.round(macros.carbs)} · F {Math.round(macros.fat)}
                  </Txt>
                </View>
                <IconButton
                  icon="trash-outline"
                  tone="chip"
                  size={36}
                  accessibilityLabel={`Remove ${entry.name}`}
                  onPress={() => void removeEntry(entry)}
                />
              </View>
            )
          })
        )}
        {loggedForMeal.length > 0 ? (
          savePanelOpen ? (
            <View style={styles.savePanel}>
              <Field
                label="Meal name"
                placeholder={`My ${mealType.toLowerCase()}`}
                onChangeText={setMealName}
                maxLength={128}
                testID="saved-meal-name"
              />
              <View style={styles.saveActions}>
                <UButton label="Cancel" tone="chip" size="sm" onPress={() => setSavePanelOpen(false)} />
                <UButton label={savingMeal ? 'Saving…' : 'Save meal'} size="sm" disabled={savingMeal} onPress={saveMeal} testID="save-meal" />
              </View>
            </View>
          ) : (
            <UButton
              label={`Save ${mealType.toLowerCase()} as a meal`}
              tone="mint"
              size="sm"
              onPress={() => setSavePanelOpen(true)}
              style={styles.saveButton}
            />
          )
        ) : null}
      </Card>
      <View style={{ height: 1, backgroundColor: c.bg }} />
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scanButton: { borderRadius: 20 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  listCard: { paddingHorizontal: 20, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  rowText: { flex: 1, gap: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  loggedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  savePanel: { gap: 10, marginTop: 10 },
  saveActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  saveButton: { marginTop: 10, alignSelf: 'flex-start' },
  addFood: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 24, padding: 16 },
  addFoodIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
})
