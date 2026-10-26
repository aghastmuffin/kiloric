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
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { authenticatedRequest } from '@/lib/apiUtils'
import { showApiError } from '@/lib/apiErrors'
import { withTimeout } from '@/lib/asyncUtils'
import { useAuth } from '@/lib/AuthContext'
import {
  entryMacros,
  foodItemFromEntry,
  frequentFoods,
  listEntriesForDay,
  listRecentEntries,
  logFood,
  recentFoods,
  removeFoodEntry,
  updateFoodEntry,
  type FoodEntry,
  type FoodEntrySource,
  type LogMealType,
} from '@/lib/data/foodLog'
import { effectiveMealNames, loadPlanPreferences } from '@/lib/planPreferences'
import { formatAmount, formatKcal, foodItemFromProduct, scaleMacros, type FoodItem } from '@/lib/data/foodItem'
import { loadTodayBudget } from '@/lib/data/overview'
import { stashReviewItem } from '@/lib/data/reviewHandoff'
import { listSavedMeals, logSavedMeal, saveMealFromEntries, type SavedMeal } from '@/lib/data/savedMeals'
import { useFocusLoader } from '@/lib/data/useLoader'
import { loadFavoriteFoods, toggleFavoriteFood, type FavoriteFood } from '@/lib/foodFavorites'
import { triggerImpactHaptic, triggerNotificationHaptic, triggerSelectionHaptic } from '@/lib/haptics'
import { useMealTypePreferences } from '@/lib/MealTypePreferencesContext'
import { fonts, usePalette } from '@/lib/theme/palette'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

type ListTab = 'recent' | 'frequent' | 'favorites' | 'meals' | 'results'

type Selection =
  | { kind: 'food'; key: string; item: FoodItem; servings: number; source: FoodEntrySource }
  | { kind: 'meal'; key: string; meal: SavedMeal }

type Row = {
  key: string
  title: string
  subtitle: string
  kcal: number
  barcode?: string | null
  item?: FoodItem
  selection: Selection
  onOpen?: () => void
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

function EntryEditorModal({
  visible,
  entry,
  saving,
  onSave,
  onDelete,
  onClose,
}: {
  visible: boolean
  entry: FoodEntry | null
  saving: boolean
  onSave: (updates: { servings: number; mealType: LogMealType; loggedAt: string }) => void
  onDelete: (entry: FoodEntry) => void
  onClose: () => void
}) {
  const c = usePalette()
  const [servings, setServings] = useState(entry?.servings ?? 1)
  const [mealType, setMealType] = useState<LogMealType>(entry?.meal_type ?? 'Snack')
  const [loggedAt, setLoggedAt] = useState(entry?.logged_at ?? new Date().toISOString())

  useEffect(() => {
    if (entry) {
      setServings(entry.servings)
      setMealType(entry.meal_type)
      setLoggedAt(entry.logged_at)
    }
  }, [entry])

  if (!entry) return null

  const baseItem = foodItemFromEntry(entry)
  const macros = scaleMacros(baseItem.perServing, servings)

  function stepServings(delta: number) {
    triggerSelectionHaptic()
    setServings((curr) => Math.max(0.25, Math.round((curr + delta) * 100) / 100))
  }

  function handleSave() {
    triggerImpactHaptic()
    onSave({ servings, mealType, loggedAt })
  }

  const timeStr = new Date(loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={editorStyles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[editorStyles.card, { backgroundColor: c.card, borderColor: c.line }]}>
          <View style={editorStyles.header}>
            <View style={editorStyles.flex}>
              <Txt variant="title" numberOfLines={1}>
                {entry.name}
              </Txt>
              {entry.brand ? (
                <Txt variant="caption" tone="muted">
                  {entry.brand}
                </Txt>
              ) : null}
            </View>
            <IconButton icon="close" accessibilityLabel="Close editor" onPress={onClose} />
          </View>

          <View style={editorStyles.stepperBlock}>
            <Txt variant="label" tone="muted">
              Servings
            </Txt>
            <View style={editorStyles.stepperRow}>
              <IconButton icon="remove" tone="chip" size={48} accessibilityLabel="Decrease servings" onPress={() => stepServings(-0.5)} />
              <View style={editorStyles.amountTextWrap}>
                <Text style={[editorStyles.amountText, { color: c.ink }]}>{formatAmount(servings)}</Text>
                <Txt variant="caption" tone="muted">
                  {entry.serving_label ?? 'servings'} · {formatKcal(macros.kcal)} kcal
                </Txt>
              </View>
              <IconButton icon="add" tone="chip" size={48} accessibilityLabel="Increase servings" onPress={() => stepServings(0.5)} />
            </View>
            <View style={editorStyles.quickPicks}>
              {[0.5, 1, 1.5, 2].map((v) => (
                <Chip
                  key={v}
                  label={`${v}`}
                  selected={servings === v}
                  selectedTone="mint"
                  onPress={() => {
                    triggerSelectionHaptic()
                    setServings(v)
                  }}
                />
              ))}
            </View>
          </View>

          <View style={editorStyles.fieldGroup}>
            <Txt variant="label" tone="muted">
              Meal
            </Txt>
            <View style={editorStyles.mealTypeRow}>
              {LOG_MEAL_TYPES.map((type) => (
                <Chip
                  key={type}
                  label={type}
                  selected={mealType === type}
                  onPress={() => {
                    triggerSelectionHaptic()
                    setMealType(type)
                  }}
                />
              ))}
            </View>
          </View>

          <View style={editorStyles.fieldGroup}>
            <Txt variant="label" tone="muted">
              Time logged
            </Txt>
            <View style={[editorStyles.timeBox, { backgroundColor: c.chip }]}>
              <Ionicons name="time-outline" size={18} color={c.inkMuted} />
              <Txt variant="bodyStrong">{timeStr}</Txt>
            </View>
          </View>

          <View style={editorStyles.actions}>
            <IconButton
              icon="trash-outline"
              tone="chip"
              size={48}
              accessibilityLabel="Delete entry"
              onPress={() => onDelete(entry)}
            />
            <UButton
              label={saving ? 'Saving…' : 'Save changes'}
              disabled={saving}
              fullWidth
              onPress={handleSave}
              testID="save-entry-edits"
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}

const editorStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 440, borderRadius: 24, borderWidth: 1, padding: 20, gap: 16 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  stepperBlock: { alignItems: 'center', gap: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  amountTextWrap: { alignItems: 'center' },
  amountText: { fontFamily: fonts.heavy, fontSize: 36, lineHeight: 40 },
  quickPicks: { flexDirection: 'row', gap: 8, marginTop: 4 },
  fieldGroup: { gap: 6 },
  mealTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
})

export default function LogFoodScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const c = usePalette()
  const userId = user?.$id ?? null
  const { selectedMealType, setSelectedMealType } = useMealTypePreferences()
  const { wide } = useShell()

  const [tab, setTab] = useState<ListTab>('recent')
  const [selected, setSelected] = useState<Map<string, Selection>>(new Map())
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [results, setResults] = useState<FoodItem[]>([])
  const [favorites, setFavorites] = useState<FavoriteFood[]>([])
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

  // Editing & deletion state
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null)
  const [savingEntry, setSavingEntry] = useState(false)
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<FoodEntry | null>(null)
  const [undoSnack, setUndoSnack] = useState<{ entry: FoodEntry; timeoutId: ReturnType<typeof setTimeout> } | null>(null)

  const state = useFocusLoader(async () => {
    const [budget, recent, todayEntries, savedMeals, planPrefs, favs] = await Promise.all([
      loadTodayBudget(userId!, user?.name),
      listRecentEntries(userId!),
      listEntriesForDay(userId!),
      listSavedMeals(userId!),
      userId ? loadPlanPreferences(userId).catch(() => null) : Promise.resolve(null),
      loadFavoriteFoods(userId!),
    ])
    setFavorites(favs)
    return { budget, recent, todayEntries, savedMeals, planPrefs, favs }
  }, userId)

  const data = state.data
  const activeMealNames = useMemo(() => {
    if (!data?.planPrefs) return ['Breakfast', 'Lunch', 'Snack', 'Dinner']
    return effectiveMealNames(data.planPrefs)
  }, [data?.planPrefs])

  const mealOptions = useMemo(
    () => activeMealNames.map((type) => ({ value: type, label: type })),
    [activeMealNames],
  )

  const mealType: LogMealType = activeMealNames.includes(selectedMealType)
    ? selectedMealType
    : (activeMealNames[0] ?? 'Snack')

  const recent = useMemo(() => (data ? recentFoods(data.recent) : []), [data])
  const frequent = useMemo(() => (data ? frequentFoods(data.recent) : []), [data])
  const loggedForMeal = useMemo(
    () => (data ? data.todayEntries.filter((entry) => entry.meal_type === mealType) : []),
    [data, mealType],
  )

  const favoriteBarcodesSet = useMemo(
    () => new Set(favorites.map((f) => f.barcode)),
    [favorites],
  )

  async function handleToggleFavorite(item: { barcode?: string | null; name: string; perServing?: { kcal: number; protein: number; carbs: number; fat: number } }) {
    if (!userId) return
    triggerSelectionHaptic()
    const barcode = item.barcode?.trim() || item.name.trim()
    const updated = await toggleFavoriteFood(userId, {
      barcode,
      title: item.name,
      kcal: item.perServing?.kcal ?? null,
      protein: item.perServing?.protein ?? null,
      carbs: item.perServing?.carbs ?? null,
      fat: item.perServing?.fat ?? null,
    })
    setFavorites(updated)
  }

  function openReview(item: FoodItem, source: FoodEntrySource, servings = 1) {
    const id = stashReviewItem(item, source, servings)
    router.push({ pathname: '/review-log', params: { id, meal: mealType } })
  }

  function entryRow(entry: FoodEntry, prefix: string): Row {
    const item = foodItemFromEntry(entry)
    const barcode = entry.barcode ?? entry.name
    return {
      key: `${prefix}:${entry.$id}`,
      title: entry.name,
      subtitle: `${servingSubtitle(entry.serving_label, entry.servings)} · ${formatKcal(entry.kcal)} kcal${entry.protein >= 10 ? ` · ${Math.round(entry.protein)} g protein` : ''}`,
      kcal: entry.kcal,
      barcode,
      item,
      selection: { kind: 'food', key: `${prefix}:${entry.$id}`, item, servings: entry.servings, source: 'recent' },
      onOpen: () => openReview(item, 'recent', entry.servings),
    }
  }

  const rows: Row[] = useMemo(() => {
    if (tab === 'results') {
      return results.map((item, index) => {
        const barcode = item.barcode ?? item.name
        const key = `result:${barcode}:${index}`
        return {
          key,
          title: item.name,
          subtitle: `${[item.brand, item.servingLabel.replace(/^1 serving = /, '')].filter(Boolean).join(' · ')} · ${formatKcal(item.perServing.kcal)} kcal`,
          kcal: item.perServing.kcal,
          barcode,
          item,
          selection: { kind: 'food', key, item, servings: 1, source: 'search' },
          onOpen: () => openReview(item, 'search'),
        }
      })
    }
    if (tab === 'favorites') {
      return favorites.map((fav, index) => {
        const item: FoodItem = {
          name: fav.title,
          brand: null,
          barcode: fav.barcode,
          servingGrams: 100,
          servingLabel: '1 serving',
          perServing: {
            kcal: fav.kcal ?? 0,
            protein: fav.protein ?? 0,
            carbs: fav.carbs ?? 0,
            fat: fav.fat ?? 0,
          },
        }
        const key = `fav:${fav.barcode}:${index}`
        return {
          key,
          title: fav.title,
          subtitle: `${formatKcal(fav.kcal ?? 0)} kcal${fav.protein ? ` · ${Math.round(fav.protein)} g protein` : ''}`,
          kcal: fav.kcal ?? 0,
          barcode: fav.barcode,
          item,
          selection: { kind: 'food', key, item, servings: 1, source: 'recent' },
          onOpen: () => openReview(item, 'recent'),
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
  }, [tab, results, frequent, favorites, recent, data, mealType])

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

  async function performEntrySave(updates: { servings: number; mealType: LogMealType; loggedAt: string }) {
    if (!userId || !editingEntry) return
    setSavingEntry(true)
    try {
      await updateFoodEntry(userId, editingEntry, updates)
      setEditingEntry(null)
      await state.reload()
    } catch (err) {
      showApiError(err, 'appwrite')
    } finally {
      setSavingEntry(false)
    }
  }

  async function executeRemove(entry: FoodEntry) {
    if (!userId) return
    try {
      await removeFoodEntry(userId, entry)
      setEditingEntry(null)
      setConfirmDeleteEntry(null)
      await state.reload()

      if (undoSnack?.timeoutId) clearTimeout(undoSnack.timeoutId)
      const timeoutId = setTimeout(() => {
        setUndoSnack(null)
      }, 5000)

      setUndoSnack({ entry, timeoutId })
      triggerNotificationHaptic('success')
    } catch (err) {
      showApiError(err, 'appwrite')
    }
  }

  async function handleUndoDelete() {
    if (!userId || !undoSnack) return
    clearTimeout(undoSnack.timeoutId)
    const entryToRestore = undoSnack.entry
    setUndoSnack(null)

    try {
      const item = foodItemFromEntry(entryToRestore)
      await logFood(userId, {
        item,
        servings: entryToRestore.servings,
        mealType: entryToRestore.meal_type,
        source: entryToRestore.source ?? 'recent',
      })
      await state.reload()
      triggerNotificationHaptic('success')
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
    frequent: { title: 'No frequent items yet', body: 'Foods you log more than once show up here.' },
    favorites: { title: 'No favorite foods yet', body: 'Tap the star icon on any food to save it as a favorite.' },
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
        options={mealOptions}
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
        <Chip label="Favorites" selected={tab === 'favorites'} onPress={() => setTab('favorites')} />
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
          rows.map((row, index) => {
            const barcodeKey = row.barcode ?? row.title
            const isFav = favoriteBarcodesSet.has(barcodeKey)
            return (
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
                  {row.item ? (
                    <IconButton
                      icon={isFav ? 'star' : 'star-outline'}
                      tone="chip"
                      size={40}
                      accessibilityLabel={isFav ? `Remove ${row.title} from favorites` : `Star ${row.title}`}
                      onPress={() => void handleToggleFavorite(row.item!)}
                    />
                  ) : null}
                  <CheckCircle
                    tone="add"
                    size={44}
                    checked={selected.has(row.key)}
                    accessibilityLabel={`Select ${row.title}`}
                    onPress={() => toggle(row)}
                  />
                </View>
              </Fragment>
            )
          })
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
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint="Tap to edit servings, meal type or time"
                  onPress={() => setEditingEntry(entry)}
                  style={styles.rowText}
                >
                  <Txt variant="bodyStrong" numberOfLines={1}>
                    {entry.name}
                  </Txt>
                  <Txt variant="caption" tone="muted">
                    {entry.servings} serving{entry.servings === 1 ? '' : 's'} · {formatKcal(macros.kcal)} kcal · P {Math.round(macros.protein)} · C {Math.round(macros.carbs)} · F {Math.round(macros.fat)}
                  </Txt>
                </Pressable>
                <IconButton
                  icon="trash-outline"
                  tone="chip"
                  size={36}
                  accessibilityLabel={`Remove ${entry.name}`}
                  onPress={() => setConfirmDeleteEntry(entry)}
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

      {undoSnack ? (
        <View style={[styles.snackBanner, { backgroundColor: c.ink }]}>
          <Txt variant="body" color={c.card}>
            “{undoSnack.entry.name}” deleted
          </Txt>
          <UButton label="Undo" tone="mint" size="sm" onPress={() => void handleUndoDelete()} />
        </View>
      ) : null}

      <EntryEditorModal
        visible={!!editingEntry}
        entry={editingEntry}
        saving={savingEntry}
        onSave={(updates) => void performEntrySave(updates)}
        onDelete={(entry) => {
          setEditingEntry(null)
          setConfirmDeleteEntry(entry)
        }}
        onClose={() => setEditingEntry(null)}
      />

      <ConfirmDialog
        visible={!!confirmDeleteEntry}
        title="Delete food entry?"
        message={`Are you sure you want to remove "${confirmDeleteEntry?.name}" from your log?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => confirmDeleteEntry && void executeRemove(confirmDeleteEntry)}
        onCancel={() => setConfirmDeleteEntry(null)}
      />

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
  snackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 12,
  },
})
