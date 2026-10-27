import { PrepCard } from '@/components/cards/PrepCard'
import {
  Badge,
  Card,
  CheckCircle,
  Divider,
  EmptyState,
  ErrorNote,
  IconButton,
  LoadingBlock,
  ScreenHeader,
  ScreenScroll,
  Txt,
  UButton,
  useShell,
} from '@/components/ds'
import { showApiError } from '@/lib/apiErrors'
import { useAuth } from '@/lib/AuthContext'
import { addDays, dayKey, monthRangeLabel, parseDayKey, startOfWeek, weekdayInitial, weekdayName, weekDayKeys } from '@/lib/data/dateKeys'
import { formatKcal } from '@/lib/data/foodItem'
import { frequentFoods, listRecentEntries } from '@/lib/data/foodLog'
import {
  addPlanEntry,
  autofillWeek,
  deletePlanEntry,
  listPlanEntries,
  planCandidatesFrom,
  plannedTotals,
  PLAN_MEAL_TYPES,
  setPlanEntryLogged,
  type PlanEntry,
} from '@/lib/data/mealPlan'
import { loadPrepOverview, loadProfileSummary } from '@/lib/data/overview'
import { listSavedMeals, type SavedMeal } from '@/lib/data/savedMeals'
import { useFocusLoader } from '@/lib/data/useLoader'
import { fonts, usePalette } from '@/lib/theme/palette'
import { useRouter } from 'expo-router'
import { Fragment, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

const AUTOFILL_SLOTS = ['Breakfast', 'Lunch', 'Dinner'] as const

export default function PlanScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const c = usePalette()
  const { wide } = useShell()
  const userId = user?.$id ?? null
  const todayKey = dayKey()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(todayKey)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const weekStart = useMemo(() => addDays(startOfWeek(), weekOffset * 7), [weekOffset])
  const weekKeys = useMemo(() => weekDayKeys(weekStart), [weekStart])
  const day = weekKeys.includes(selectedDay) ? selectedDay : weekKeys[0]

  const state = useFocusLoader(async () => {
    const [summary, entries, prep, savedMeals] = await Promise.all([
      loadProfileSummary(userId!, user?.name),
      listPlanEntries(userId!, weekKeys[0], weekKeys[6]),
      loadPrepOverview(userId!, weekStart),
      listSavedMeals(userId!),
    ])
    return { summary, entries, prep, savedMeals }
  }, userId ? `${userId}:${weekKeys[0]}` : null)

  const data = state.data
  const dayEntries = useMemo(() => (data ? data.entries.filter((entry) => entry.day === day) : []), [data, day])
  const totals = plannedTotals(dayEntries)
  const goal = data?.summary.targets.kcal ?? 0
  const plannedDays = useMemo(() => new Set(data?.entries.map((entry) => entry.day) ?? []), [data])
  const dayDate = parseDayKey(day)
  const missingTypes = PLAN_MEAL_TYPES.filter((type) => !dayEntries.some((entry) => entry.meal_type === type))
  const nextType = missingTypes.includes('Snack') ? 'Snack' : (missingTypes[0] ?? 'Snack')

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

  function toggleLogged(entry: PlanEntry) {
    if (!userId) return
    void run(entry.$id, () => setPlanEntryLogged(userId, entry, !entry.logged))
  }

  function autofill() {
    if (!userId || !data) return
    void run('autofill', async () => {
      const [saved, recent] = await Promise.all([listSavedMeals(userId), listRecentEntries(userId)])
      const candidates = planCandidatesFrom(saved, frequentFoods(recent, 20), recent, data.entries)
      const additions = autofillWeek(weekStart, data.entries, candidates)
      if (additions.length === 0) {
        const hasOptions = AUTOFILL_SLOTS.some((slot) => (candidates.get(slot)?.length ?? 0) > 0)
        setNotice(
          hasOptions
            ? 'Every breakfast, lunch and dinner slot left this week is already planned.'
            : 'Log, save, or plan a breakfast, lunch, or dinner first. Auto-fill builds your week from meals you already eat.',
        )
        return
      }
      setNotice(null)
      for (const addition of additions) await addPlanEntry(userId, addition)
    })
  }

  const dayPicker = (
    <View style={styles.weekRow}>
      <IconButton icon="chevron-back" size={40} tone="chip" accessibilityLabel="Previous week" onPress={() => setWeekOffset((v) => v - 1)} />
      <View style={styles.days}>
        {weekKeys.map((key) => {
          const date = parseDayKey(key)
          const active = key === day
          const isToday = key === todayKey
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${weekdayName(date)} ${date.getDate()}${plannedDays.has(key) ? ', has planned meals' : ''}`}
              onPress={() => setSelectedDay(key)}
              style={[styles.dayPill, { backgroundColor: active ? c.inverse : c.card }]}
              testID={`plan-day-${key}`}
            >
              <Text style={[styles.dayInitial, { color: active ? c.onInverse : c.inkMuted }]}>{weekdayInitial(date)}</Text>
              <Text style={[styles.dayNumber, { color: active ? c.onInverse : isToday ? c.primary : c.ink }]}>{date.getDate()}</Text>
              <View style={[styles.dot, { backgroundColor: plannedDays.has(key) ? (active ? c.mint : c.primary) : 'transparent' }]} />
            </Pressable>
          )
        })}
      </View>
      <IconButton icon="chevron-forward" size={40} tone="chip" accessibilityLabel="Next week" onPress={() => setWeekOffset((v) => v + 1)} />
    </View>
  )

  const dayCard = (
    <Card style={styles.dayCard} testID="plan-day-card">
      <View style={styles.dayHeader}>
        <View style={styles.flex}>
          <Txt variant="heading">{day === todayKey ? `Today · ${weekdayName(dayDate)}` : weekdayName(dayDate)}</Txt>
          <Txt variant="caption" tone="muted">
            {goal > 0 ? `${formatKcal(totals.kcal)} of ${formatKcal(goal)} kcal planned` : `${formatKcal(totals.kcal)} kcal planned`}
          </Txt>
        </View>
        <IconButton
          icon="add"
          tone="mint"
          size={40}
          accessibilityLabel="Add a meal to this day"
          onPress={() => router.push({ pathname: '/plan-entry', params: { day } })}
        />
      </View>
      {dayEntries.length === 0 ? (
        <EmptyState compact icon="restaurant-outline" title="Nothing planned" body="Add meals for this day or auto-fill the week from foods you log." />
      ) : (
        dayEntries.map((entry, index) => (
          <Fragment key={entry.$id}>
            {index > 0 ? <Divider /> : null}
            <View style={styles.entryRow}>
              <CheckCircle
                checked={entry.logged}
                disabled={busy === entry.$id || (!entry.logged && entry.day !== todayKey)}
                accessibilityLabel={
                  entry.day === todayKey || entry.logged
                    ? entry.logged
                      ? `Mark ${entry.name} as not eaten`
                      : `Log ${entry.name} as eaten`
                    : `${entry.name} can be logged on ${weekdayName(parseDayKey(entry.day))}`
                }
                onPress={() => toggleLogged(entry)}
              />
              <Pressable
                style={styles.flex}
                accessibilityRole="button"
                accessibilityHint="Edit planned meal"
                onPress={() => router.push({ pathname: '/plan-entry', params: { id: entry.$id, day: entry.day } })}
              >
                <Txt variant="caption" tone="muted">
                  {entry.meal_type}
                </Txt>
                <Txt variant="subheading" numberOfLines={1} style={entry.logged ? { color: c.inkMuted } : undefined}>
                  {entry.name}
                </Txt>
              </Pressable>
              {entry.prepped ? <Badge label="Prepped" tone="peach" /> : null}
              <Txt variant="bodyStrong" tone="muted">
                {formatKcal(entry.kcal)}
              </Txt>
              <IconButton
                icon="close"
                tone="chip"
                size={32}
                accessibilityLabel={`Remove ${entry.name} from plan`}
                onPress={() => userId && void run(entry.$id, () => deletePlanEntry(userId, entry.$id))}
              />
            </View>
          </Fragment>
        ))
      )}
      <UButton
        label={`Add ${nextType.toLowerCase()}`}
        tone="chip"
        size="sm"
        onPress={() => router.push({ pathname: '/plan-entry', params: { day, meal: nextType } })}
        style={styles.addButton}
        testID="plan-add-entry"
      />
    </Card>
  )

  const savedMealsCard = data ? (
    <Card style={styles.savedMealsCard} testID="plan-saved-meals">
      <View style={styles.dayHeader}>
        <View style={styles.flex}>
          <Txt variant="subheading">Saved meals</Txt>
          <Txt variant="caption" tone="muted">Add a meal preset to {day === todayKey ? 'today' : weekdayName(dayDate)}’s plan.</Txt>
        </View>
        <Badge label={`${data.savedMeals.length}`} tone="mint" />
      </View>
      {data.savedMeals.length === 0 ? (
        <View style={styles.savedEmpty}>
          <Txt variant="caption" tone="muted">Saved meals appear here. Log a meal in Food log and save it to reuse it in your plan.</Txt>
          <UButton label="Open food log" tone="chip" size="sm" onPress={() => router.push('/(tabs)/logfood')} />
        </View>
      ) : data.savedMeals.slice(0, 5).map((meal: SavedMeal) => (
        <Fragment key={meal.$id}>
          <Divider />
          <View style={styles.savedMealRow}>
            <View style={styles.flex}>
              <Txt variant="caption" tone="muted">{meal.meal_type}</Txt>
              <Txt variant="bodyStrong" numberOfLines={1}>{meal.name}</Txt>
              <Txt variant="caption" tone="muted">{formatKcal(meal.kcal)} kcal · {meal.item_count} item{meal.item_count === 1 ? '' : 's'}</Txt>
            </View>
            <UButton
              label={busy === `saved:${meal.$id}` ? 'Adding…' : 'Add'}
              tone="mint"
              size="sm"
              disabled={busy !== null}
              onPress={() => void run(`saved:${meal.$id}`, () => addPlanEntry(userId!, {
                day,
                meal_type: meal.meal_type,
                name: meal.name,
                kcal: meal.kcal,
                protein: meal.protein,
                carbs: meal.carbs,
                fat: meal.fat,
                prepped: false,
              }))}
              testID={`plan-add-saved-${meal.$id}`}
            />
          </View>
        </Fragment>
      ))}
      {data.savedMeals.length > 5 ? <Txt variant="caption" tone="muted">Showing 5 of {data.savedMeals.length} saved meals.</Txt> : null}
    </Card>
  ) : null

  const prep = data ? (
    <PrepCard
      prep={data.prep}
      layout="plan"
      onGrocery={() => router.push({ pathname: '/grocery', params: { week: data.prep.weekStart } })}
      onEdit={() => router.push({ pathname: '/prep-edit', params: { week: data.prep.weekStart } })}
    />
  ) : null

  return (
    <ScreenScroll
      refreshing={state.loading}
      onRefresh={state.reload}
      maxWidth={wide ? 1040 : undefined}
      footer={
        wide ? undefined : (
          <UButton
            label={busy === 'autofill' ? 'Filling…' : 'Auto-fill week'}
            tone="inverse"
            size="lg"
            fullWidth
            disabled={busy === 'autofill' || !data}
            onPress={autofill}
            testID="plan-autofill"
          />
        )
      }
    >
      <ScreenHeader
        overline={monthRangeLabel(weekStart, addDays(weekStart, 6))}
        title="Meal plan"
        right={
          wide ? (
            <UButton
              label={busy === 'autofill' ? 'Filling…' : 'Auto-fill week'}
              tone="inverse"
              size="sm"
              disabled={busy === 'autofill' || !data}
              onPress={autofill}
              testID="plan-autofill"
            />
          ) : null
        }
      />
      {dayPicker}
      {state.error ? <ErrorNote message={state.error} onRetry={state.reload} /> : null}
      {notice ? (
        <Card tone="mint" style={styles.notice}>
          <Txt variant="caption" color={c.mintInk} style={styles.flex}>
            {notice}
          </Txt>
          <IconButton icon="close" tone="card" size={30} accessibilityLabel="Dismiss" onPress={() => setNotice(null)} />
        </Card>
      ) : null}
      {!data && state.loading ? (
        <LoadingBlock />
      ) : wide ? (
        <View style={styles.wideRow}>
          <View style={styles.flex}>{dayCard}</View>
          <View style={styles.flex}>
            {savedMealsCard}
            {prep}
          </View>
        </View>
      ) : (
        <>
          {dayCard}
          {savedMealsCard}
          {prep}
        </>
      )}
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  days: { flex: 1, flexDirection: 'row', gap: 6 },
  dayPill: { flex: 1, alignItems: 'center', borderRadius: 18, paddingVertical: 10, gap: 2 },
  dayInitial: { fontFamily: fonts.medium, fontSize: 12 },
  dayNumber: { fontFamily: fonts.bold, fontSize: 17 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  dayCard: { gap: 4 },
  savedMealsCard: { gap: 8 },
  savedEmpty: { gap: 12, alignItems: 'flex-start' },
  savedMealRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  addButton: { marginTop: 8, alignSelf: 'flex-start' },
  wideRow: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
})
