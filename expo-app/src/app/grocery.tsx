import {
  Badge,
  Card,
  CheckCircle,
  Divider,
  EmptyState,
  ErrorNote,
  Field,
  IconButton,
  LoadingBlock,
  ScreenHeader,
  ScreenScroll,
  Txt,
  UButton,
} from '@/components/ds'
import { showApiError } from '@/lib/apiErrors'
import { useAuth } from '@/lib/AuthContext'
import { addDays, dayKey, monthRangeLabel, parseDayKey, startOfWeek, weekdayName } from '@/lib/data/dateKeys'
import {
  addGroceryItem,
  deleteGroceryItem,
  listGroceryItems,
  listPlanEntries,
  setGroceryChecked,
  type GroceryItem,
  type PlanEntry,
} from '@/lib/data/mealPlan'
import { useFocusLoader } from '@/lib/data/useLoader'
import { fonts, usePalette } from '@/lib/theme/palette'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Fragment, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

const DAY_OPTIONS = [
  'All days',
  'Tomorrow',
  'Today',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

const MEAL_OPTIONS = [
  'All meals',
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
] as const

const TAG_DAYS = [
  'Tomorrow',
  'Today',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
  'None',
] as const

const TAG_MEALS = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'None',
] as const

export default function GroceryScreen() {
  const params = useLocalSearchParams<{ week?: string }>()
  const router = useRouter()
  const c = usePalette()
  const { user } = useAuth()
  const userId = user?.$id ?? null
  const weekStart = params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? params.week : dayKey(startOfWeek())
  const weekDate = parseDayKey(weekStart)

  const { tomorrowKey, tomorrowName } = useMemo(() => {
    const d = addDays(new Date(), 1)
    return { tomorrowKey: dayKey(d), tomorrowName: weekdayName(d) }
  }, [])

  // Form states
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [selectedTagDay, setSelectedTagDay] = useState<string>('Tomorrow')
  const [selectedTagMeal, setSelectedTagMeal] = useState<string>('Breakfast')
  const [formKey, setFormKey] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)

  // Dedicated menu filter dropdowns
  const [filterDay, setFilterDay] = useState<string>('All days')
  const [filterMeal, setFilterMeal] = useState<string>('All meals')
  const [dayDropdownOpen, setDayDropdownOpen] = useState(false)
  const [mealDropdownOpen, setMealDropdownOpen] = useState(false)

  // Next day placeholder and expansion state
  const [placeholderMeal, setPlaceholderMeal] = useState('Green eggs and ham')
  const [editingPlaceholder, setEditingPlaceholder] = useState(false)
  const [placeholderDraft, setPlaceholderDraft] = useState('Green eggs and ham')
  const [expandedNextDayMeal, setExpandedNextDayMeal] = useState<string | null>('Breakfast')

  // Load groceries & tomorrow's planned meals
  const state = useFocusLoader(async () => {
    const [groceries, tomorrowEntries] = await Promise.all([
      listGroceryItems(userId!, weekStart),
      listPlanEntries(userId!, tomorrowKey, tomorrowKey).catch(() => [] as PlanEntry[]),
    ])
    return { groceries, tomorrowEntries }
  }, userId ? `${userId}:${weekStart}:${tomorrowKey}` : null)

  const items = useMemo(() => state.data?.groceries ?? [], [state.data?.groceries])
  const tomorrowEntries = useMemo(() => state.data?.tomorrowEntries ?? [], [state.data?.tomorrowEntries])

  // Collect tomorrow's meals (from plan or placeholder)
  const tomorrowMeals = useMemo(() => {
    const map = new Map<string, string>()
    // Start with default placeholder
    map.set('Breakfast', placeholderMeal)
    for (const entry of tomorrowEntries) {
      if (entry.meal_type) {
        map.set(entry.meal_type, entry.name || placeholderMeal)
      }
    }
    return Array.from(map.entries()).map(([mealType, mealTitle]) => ({
      mealType,
      title: mealTitle,
    }))
  }, [tomorrowEntries, placeholderMeal])

  async function run(id: string, action: () => Promise<unknown>) {
    setBusy(id)
    try {
      await action()
      await state.reload()
    } catch (err) {
      showApiError(err, 'server')
    } finally {
      setBusy(null)
    }
  }

  function add(overrideMeal?: string, overrideDay?: string) {
    if (!userId || !name.trim()) return
    const mealToUse = overrideMeal ?? (selectedTagMeal === 'None' ? undefined : selectedTagMeal)
    const dayToUse = overrideDay ?? (selectedTagDay === 'None' ? undefined : selectedTagDay)

    void run('add', async () => {
      await addGroceryItem(userId, weekStart, name, quantity, mealToUse, dayToUse)
      setName('')
      setQuantity('')
      setFormKey((key) => key + 1)
    })
  }

  // Filter & sort items for the dedicated menu view
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items]

    if (filterDay !== 'All days') {
      result = result.filter((item) => {
        const itemDay = (item.day || '').toLowerCase()
        const targetDay = filterDay.toLowerCase()
        if (targetDay === 'tomorrow') {
          return itemDay === 'tomorrow' || itemDay === tomorrowKey.toLowerCase()
        }
        if (targetDay === 'today') {
          return itemDay === 'today' || itemDay === dayKey().toLowerCase()
        }
        return itemDay === targetDay
      })
    }

    if (filterMeal !== 'All meals') {
      result = result.filter((item) => {
        const itemMeal = (item.meal || '').toLowerCase()
        const targetMeal = filterMeal.toLowerCase()
        return itemMeal === targetMeal
      })
    }

    // Sort: Unchecked first, then by Day, then by Meal, then by Name
    result.sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1
      const dayA = a.day || 'ZZZ'
      const dayB = b.day || 'ZZZ'
      if (dayA !== dayB) return dayA.localeCompare(dayB)
      const mealA = a.meal || 'ZZZ'
      const mealB = b.meal || 'ZZZ'
      if (mealA !== mealB) return mealA.localeCompare(mealB)
      return a.name.localeCompare(b.name)
    })

    return result
  }, [items, filterDay, filterMeal, tomorrowKey])

  const open = filteredAndSortedItems.filter((item) => !item.checked)
  const done = filteredAndSortedItems.filter((item) => item.checked)

  // Items for a specific next-day meal
  function getItemsForNextDayMeal(mealType: string) {
    return items.filter((item) => {
      const dayMatches = !item.day ||
        item.day.toLowerCase() === 'tomorrow' ||
        item.day.toLowerCase() === tomorrowKey.toLowerCase() ||
        item.day.toLowerCase() === tomorrowName.toLowerCase()
      const mealMatches = (item.meal || '').toLowerCase() === mealType.toLowerCase()
      return dayMatches && mealMatches
    })
  }

  function renderItemList(list: GroceryItem[]) {
    return list.map((item, index) => (
      <Fragment key={item.$id}>
        {index > 0 ? <Divider /> : null}
        <View style={styles.row}>
          <CheckCircle
            checked={item.checked}
            disabled={busy === item.$id}
            accessibilityLabel={item.checked ? `Uncheck ${item.name}` : `Check off ${item.name}`}
            onPress={() => userId && void run(item.$id, () => setGroceryChecked(userId, item.$id, !item.checked))}
          />
          <View style={styles.flex}>
            <View style={styles.itemHeaderRow}>
              <Txt
                variant="subheading"
                style={item.checked ? { color: c.inkMuted, textDecorationLine: 'line-through' } : undefined}
              >
                {item.name}
              </Txt>
              {item.quantity ? (
                <Txt variant="caption" tone="muted">
                  · {item.quantity}
                </Txt>
              ) : null}
            </View>
            {(item.day || item.meal) ? (
              <View style={styles.tagRow}>
                {item.day ? (
                  <View style={[styles.tagBadge, { backgroundColor: c.chip }]}>
                    <Ionicons name="calendar-outline" size={11} color={c.inkMuted} />
                    <Txt variant="caption" tone="muted" style={styles.tagText}>
                      {item.day}
                    </Txt>
                  </View>
                ) : null}
                {item.meal ? (
                  <View style={[styles.tagBadge, { backgroundColor: c.chip }]}>
                    <Ionicons name="restaurant-outline" size={11} color={c.inkMuted} />
                    <Txt variant="caption" tone="muted" style={styles.tagText}>
                      {item.meal}
                    </Txt>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
          <IconButton
            icon="trash-outline"
            tone="chip"
            size={34}
            accessibilityLabel={`Delete ${item.name}`}
            onPress={() => userId && void run(item.$id, () => deleteGroceryItem(userId, item.$id))}
          />
        </View>
      </Fragment>
    ))
  }

  return (
    <ScreenScroll refreshing={state.loading} onRefresh={state.reload}>
      <ScreenHeader
        overline={`Week of ${monthRangeLabel(weekDate, addDays(weekDate, 6))}`}
        title="Grocery list"
        right={<IconButton icon="close" accessibilityLabel="Close grocery list" onPress={() => router.back()} />}
      />

      {/* ── Next Day's Meals Section ───────────────────────────────────── */}
      <Card tone="peach" style={styles.nextDayCard}>
        <View style={styles.nextDayHeader}>
          <View style={styles.flex}>
            <Txt variant="label" color={c.peachInk}>
              Next Day Meals · Tomorrow ({tomorrowName})
            </Txt>
            <Txt variant="caption" color={c.peachInk}>
              Tap a meal to view or add its grocery items
            </Txt>
          </View>
          <Ionicons name="sunny-outline" size={24} color={c.peachInk} />
        </View>

        <View style={styles.mealList}>
          {tomorrowMeals.map((meal) => {
            const isExpanded = expandedNextDayMeal === meal.mealType
            const mealItems = getItemsForNextDayMeal(meal.mealType)

            return (
              <View key={meal.mealType} style={[styles.mealItemBox, { backgroundColor: c.card }]}>
                {meal.mealType === 'Breakfast' && editingPlaceholder ? (
                  <View style={styles.placeholderEditRow}>
                    <Badge label={meal.mealType} tone="peach" />
                    <TextInput
                      value={placeholderDraft}
                      onChangeText={setPlaceholderDraft}
                      onSubmitEditing={() => {
                        if (placeholderDraft.trim()) {
                          setPlaceholderMeal(placeholderDraft.trim())
                        }
                        setEditingPlaceholder(false)
                      }}
                      style={[styles.placeholderInput, { color: c.ink, borderColor: c.line }]}
                      autoFocus
                    />
                    <IconButton
                      icon="checkmark"
                      size={32}
                      tone="mint"
                      accessibilityLabel="Save placeholder"
                      onPress={() => {
                        if (placeholderDraft.trim()) {
                          setPlaceholderMeal(placeholderDraft.trim())
                        }
                        setEditingPlaceholder(false)
                      }}
                    />
                  </View>
                ) : (
                  <View style={styles.mealItemHeader}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${meal.mealType} tomorrow - ${meal.title}`}
                      accessibilityState={{ expanded: isExpanded }}
                      onPress={() => {
                        setExpandedNextDayMeal(isExpanded ? null : meal.mealType)
                        setSelectedTagMeal(meal.mealType)
                        setSelectedTagDay('Tomorrow')
                      }}
                      style={styles.mealTogglePressable}
                    >
                      <View style={styles.mealTitleRow}>
                        <Badge label={meal.mealType} tone="peach" />
                        <Txt variant="subheading" style={styles.mealTitleText} numberOfLines={1}>
                          {meal.title}
                        </Txt>
                      </View>
                      <Txt variant="caption" tone="muted">
                        {mealItems.length === 0 ? 'No items assigned yet' : `${mealItems.length} item${mealItems.length === 1 ? '' : 's'}`}
                      </Txt>
                    </Pressable>

                    <View style={styles.mealHeaderActions}>
                      {meal.mealType === 'Breakfast' ? (
                        <IconButton
                          icon="pencil-outline"
                          size={32}
                          tone="chip"
                          accessibilityLabel="Edit placeholder meal name"
                          onPress={() => {
                            setPlaceholderDraft(placeholderMeal)
                            setEditingPlaceholder(true)
                          }}
                        />
                      ) : null}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={isExpanded ? 'Collapse' : 'Expand'}
                        onPress={() => {
                          setExpandedNextDayMeal(isExpanded ? null : meal.mealType)
                          setSelectedTagMeal(meal.mealType)
                          setSelectedTagDay('Tomorrow')
                        }}
                        style={styles.chevronButton}
                      >
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={c.inkMuted}
                        />
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Expanded items under this meal */}
                {isExpanded ? (
                  <View style={styles.expandedItemsContainer}>
                    <Divider />
                    {mealItems.length > 0 ? (
                      renderItemList(mealItems)
                    ) : (
                      <View style={styles.emptyMealItems}>
                        <Txt variant="caption" tone="muted">
                          No shopping items tagged for {meal.mealType} tomorrow.
                        </Txt>
                        <UButton
                          label={`+ Add item to ${meal.mealType}`}
                          size="sm"
                          tone="chip"
                          onPress={() => {
                            setSelectedTagDay('Tomorrow')
                            setSelectedTagMeal(meal.mealType)
                          }}
                        />
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            )
          })}
        </View>
      </Card>

      {/* ── Add to Grocery List Card (with Tagging) ────────────────────── */}
      <Card style={styles.gap} key={formKey}>
        <Txt variant="label" tone="muted">
          Add to shopping list
        </Txt>
        <View style={styles.formRow}>
          <View style={styles.nameField}>
            <Field
              label="Item"
              placeholder="e.g. Green eggs"
              onChangeText={setName}
              maxLength={128}
              testID="grocery-name"
            />
          </View>
          <View style={styles.qtyField}>
            <Field
              label="Qty"
              placeholder="2 dozen"
              onChangeText={setQuantity}
              maxLength={64}
            />
          </View>
        </View>

        {/* Tagging Pickers: Day & Meal */}
        <View style={styles.tagsSection}>
          <View style={styles.tagPickerCol}>
            <Txt variant="caption" tone="muted" style={styles.pickerLabel}>
              Assign Day
            </Txt>
            <View style={styles.chipScroll}>
              {TAG_DAYS.map((dayOpt) => {
                const selected = selectedTagDay === dayOpt
                return (
                  <Pressable
                    key={dayOpt}
                    onPress={() => setSelectedTagDay(dayOpt)}
                    style={[
                      styles.chipPressable,
                      {
                        backgroundColor: selected ? c.inverse : c.chip,
                        borderColor: selected ? c.inverse : c.line,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? c.onInverse : c.ink, fontFamily: fonts.medium },
                      ]}
                    >
                      {dayOpt}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          <View style={styles.tagPickerCol}>
            <Txt variant="caption" tone="muted" style={styles.pickerLabel}>
              Assign Meal
            </Txt>
            <View style={styles.chipScroll}>
              {TAG_MEALS.map((mealOpt) => {
                const selected = selectedTagMeal === mealOpt
                return (
                  <Pressable
                    key={mealOpt}
                    onPress={() => setSelectedTagMeal(mealOpt)}
                    style={[
                      styles.chipPressable,
                      {
                        backgroundColor: selected ? c.inverse : c.chip,
                        borderColor: selected ? c.inverse : c.line,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? c.onInverse : c.ink, fontFamily: fonts.medium },
                      ]}
                    >
                      {mealOpt}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        </View>

        <UButton
          label={busy === 'add' ? 'Adding…' : 'Add to list'}
          size="md"
          fullWidth
          disabled={!name.trim() || busy === 'add'}
          onPress={() => add()}
          testID="grocery-add"
        />
      </Card>

      {/* ── Dedicated Filter & Sorting Menu (Dropdown for each Day / Meal) ─ */}
      <Card style={styles.menuCard}>
        <View style={styles.menuHeader}>
          <View style={styles.flex}>
            <Txt variant="label" tone="muted">
              Organized Shopping List
            </Txt>
            <Txt variant="subheading">
              Sorted by Day & Meal
            </Txt>
          </View>
          {(filterDay !== 'All days' || filterMeal !== 'All meals') ? (
            <Pressable
              onPress={() => {
                setFilterDay('All days')
                setFilterMeal('All meals')
              }}
            >
              <Txt variant="caption" color={c.peachInk}>
                Reset filters
              </Txt>
            </Pressable>
          ) : null}
        </View>

        {/* Dropdown row for Day & Meal */}
        <View style={styles.dropdownRow}>
          {/* Day dropdown */}
          <View style={styles.dropdownCol}>
            <Txt variant="caption" tone="muted" style={styles.dropdownLabel}>
              Filter Day
            </Txt>
            <Pressable
              onPress={() => {
                setDayDropdownOpen((o) => !o)
                setMealDropdownOpen(false)
              }}
              style={[styles.dropdownButton, { backgroundColor: c.chip, borderColor: c.line }]}
              accessibilityRole="button"
              accessibilityLabel={`Select Day filter. Current: ${filterDay}`}
            >
              <Text style={[styles.dropdownValueText, { color: c.ink, fontFamily: fonts.medium }]}>
                {filterDay}
              </Text>
              <Ionicons
                name={dayDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={c.inkMuted}
              />
            </Pressable>
            {dayDropdownOpen ? (
              <View style={[styles.dropdownMenu, { backgroundColor: c.card, borderColor: c.line }]}>
                {DAY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      setFilterDay(opt)
                      setDayDropdownOpen(false)
                    }}
                    style={[
                      styles.dropdownMenuItem,
                      opt === filterDay && { backgroundColor: c.chip },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownMenuItemText,
                        { color: opt === filterDay ? c.ink : c.inkMuted, fontFamily: fonts.medium },
                      ]}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          {/* Meal dropdown */}
          <View style={styles.dropdownCol}>
            <Txt variant="caption" tone="muted" style={styles.dropdownLabel}>
              Filter Meal
            </Txt>
            <Pressable
              onPress={() => {
                setMealDropdownOpen((o) => !o)
                setDayDropdownOpen(false)
              }}
              style={[styles.dropdownButton, { backgroundColor: c.chip, borderColor: c.line }]}
              accessibilityRole="button"
              accessibilityLabel={`Select Meal filter. Current: ${filterMeal}`}
            >
              <Text style={[styles.dropdownValueText, { color: c.ink, fontFamily: fonts.medium }]}>
                {filterMeal}
              </Text>
              <Ionicons
                name={mealDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={c.inkMuted}
              />
            </Pressable>
            {mealDropdownOpen ? (
              <View style={[styles.dropdownMenu, { backgroundColor: c.card, borderColor: c.line }]}>
                {MEAL_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      setFilterMeal(opt)
                      setMealDropdownOpen(false)
                    }}
                    style={[
                      styles.dropdownMenuItem,
                      opt === filterMeal && { backgroundColor: c.chip },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownMenuItemText,
                        { color: opt === filterMeal ? c.ink : c.inkMuted, fontFamily: fonts.medium },
                      ]}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </Card>

      {/* ── Status and List Section ────────────────────────────────────── */}
      {state.error ? <ErrorNote message={state.error} onRetry={state.reload} /> : null}

      {!state.data && state.loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon="basket-outline"
            title="Your list is empty"
            body="Add what you need for this week’s prep and check items off in the store."
          />
        </Card>
      ) : filteredAndSortedItems.length === 0 ? (
        <Card>
          <EmptyState
            icon="filter-outline"
            title="No matching items"
            body={`No items found matching Day "${filterDay}" and Meal "${filterMeal}".`}
          />
        </Card>
      ) : (
        <>
          <Card padded={false} style={styles.listCard}>
            {open.length > 0 ? (
              renderItemList(open)
            ) : (
              <EmptyState compact icon="checkmark-done-outline" title="All picked up" />
            )}
          </Card>

          {done.length > 0 ? (
            <>
              <Txt variant="label" tone="muted">
                In the cart · {done.length}
              </Txt>
              <Card padded={false} style={styles.listCard}>
                {renderItemList(done)}
              </Card>
            </>
          ) : null}
        </>
      )}
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 14 },
  formRow: { flexDirection: 'row', gap: 12 },
  nameField: { flex: 2 },
  qtyField: { flex: 1 },
  listCard: { paddingHorizontal: 20, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  itemHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: { fontSize: 11 },
  nextDayCard: { gap: 12 },
  nextDayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealList: { gap: 8 },
  mealItemBox: { borderRadius: 12, overflow: 'hidden' },
  mealItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  mealTogglePressable: {
    flex: 1,
    gap: 2,
  },
  mealTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealTitleText: { flex: 1 },
  mealHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 },
  chevronButton: { padding: 4 },
  placeholderEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  placeholderInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  expandedItemsContainer: { paddingHorizontal: 12, paddingBottom: 8 },
  emptyMealItems: { paddingVertical: 12, alignItems: 'center', gap: 8 },
  tagsSection: { gap: 10 },
  tagPickerCol: { gap: 6 },
  pickerLabel: { fontSize: 12 },
  chipScroll: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipPressable: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  chipText: { fontSize: 12 },
  menuCard: { gap: 12 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownRow: { flexDirection: 'row', gap: 12 },
  dropdownCol: { flex: 1, position: 'relative' },
  dropdownLabel: { fontSize: 11, marginBottom: 4 },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownValueText: { fontSize: 13 },
  dropdownMenu: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 100,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    maxHeight: 200,
  },
  dropdownMenuItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownMenuItemText: { fontSize: 13 },
})
