import {
  Badge,
  Card,
  Chip,
  ErrorNote,
  Field,
  IconButton,
  LoadingBlock,
  parseDecimal,
  ScreenHeader,
  ScreenScroll,
  Txt,
  UButton,
} from '@/components/ds'
import { showApiError } from '@/lib/apiErrors'
import { useAuth } from '@/lib/AuthContext'
import { addDays, dayKey, monthRangeLabel, parseDayKey, shortWeekday, startOfWeek, weekDayKeys } from '@/lib/data/dateKeys'
import { getPrepSession, listGroceryItems, parsePrepItems, savePrepSession, type GroceryItem } from '@/lib/data/mealPlan'
import { useFocusLoader } from '@/lib/data/useLoader'
import { usePalette } from '@/lib/theme/palette'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

type DraftItem = { key: string; name: string; portions: string }

let nextKey = 0
const newItem = (name = '', portions = ''): DraftItem => ({ key: `item-${(nextKey += 1)}`, name, portions })

function parseTime(text: string): { hours: number; minutes: number } | null {
  const match = text.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) return null
  let hours = Number.parseInt(match[1], 10)
  const minutes = match[2] ? Number.parseInt(match[2], 10) : 0
  const suffix = match[3]?.toLowerCase()
  if (suffix === 'pm' && hours < 12) hours += 12
  if (suffix === 'am' && hours === 12) hours = 0
  if (hours > 23 || minutes > 59) return null
  return { hours, minutes }
}

function formatTime(date: Date): string {
  return `${date.getHours()}:${date.getMinutes() < 10 ? '0' : ''}${date.getMinutes()}`
}

export default function PrepEditScreen() {
  const params = useLocalSearchParams<{ week?: string }>()
  const router = useRouter()
  const c = usePalette()
  const { user } = useAuth()
  const userId = user?.$id ?? null
  const weekStart = params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? params.week : dayKey(startOfWeek())
  const weekDate = parseDayKey(weekStart)
  const weekKeys = weekDayKeys(weekDate)

  const [title, setTitle] = useState('Meal prep')
  const [day, setDay] = useState(weekKeys[6])
  const [time, setTime] = useState('16:00')
  const [duration, setDuration] = useState('90')
  const [items, setItems] = useState<DraftItem[]>([newItem()])
  const [formKey, setFormKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const state = useFocusLoader(async () => {
    const [session, groceries] = await Promise.all([
      getPrepSession(userId!, weekStart),
      listGroceryItems(userId!, weekStart).catch(() => [] as GroceryItem[]),
    ])
    return { session, groceries }
  }, userId ? `${userId}:${weekStart}` : null)

  const session = state.data?.session ?? null
  const groceries = useMemo(() => state.data?.groceries ?? [], [state.data?.groceries])
  const checkedGroceries = useMemo(() => groceries.filter((g) => g.checked), [groceries])

  const [hydrated, setHydrated] = useState<string | null>(null)
  if (state.data && hydrated !== (session?.$id ?? 'initialized')) {
    setHydrated(session?.$id ?? 'initialized')
    if (session) {
      const when = new Date(session.scheduled_at)
      setTitle(session.title)
      setDay(dayKey(when))
      setTime(formatTime(when))
      setDuration(String(session.duration_min))
      const parsed = parsePrepItems(session)
      // Merge checked groceries if not already in session items
      const existingNames = new Set(parsed.map((entry) => entry.name.trim().toLowerCase()))
      const fromGroceries: DraftItem[] = []
      for (const g of checkedGroceries) {
        if (!existingNames.has(g.name.trim().toLowerCase())) {
          existingNames.add(g.name.trim().toLowerCase())
          fromGroceries.push(newItem(g.name.trim(), g.quantity && !isNaN(Number(g.quantity)) ? g.quantity : '2'))
        }
      }
      const combined = [...parsed.map((item) => newItem(item.name, String(item.portions))), ...fromGroceries]
      setItems(combined.length > 0 ? combined : [newItem()])
    } else if (checkedGroceries.length > 0) {
      setItems(
        checkedGroceries.map((g) =>
          newItem(g.name.trim(), g.quantity && !isNaN(Number(g.quantity)) ? g.quantity : '2'),
        ),
      )
    }
    setFormKey((key) => key + 1)
  }

  function updateItem(key: string, field: 'name' | 'portions', value: string) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, [field]: value } : item)))
  }

  async function save() {
    if (!userId) return
    const parsedTime = parseTime(time)
    if (!parsedTime) return setFormError('Enter a time like 16:00 or 4pm.')
    const minutes = parseDecimal(duration)
    if (minutes == null || minutes <= 0) return setFormError('Enter how long the prep takes, in minutes.')
    setFormError(null)
    const scheduledAt = parseDayKey(day)
    scheduledAt.setHours(parsedTime.hours, parsedTime.minutes, 0, 0)
    setSaving(true)
    try {
      await savePrepSession(userId, session, {
        weekStart,
        scheduledAt,
        durationMin: minutes,
        title,
        items: items
          .filter((item) => item.name.trim())
          .map((item) => ({ name: item.name.trim().slice(0, 64), portions: Math.max(0, Math.round(parseDecimal(item.portions) ?? 0)) })),
      })
      router.back()
    } catch (err) {
      showApiError(err, 'server')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScreenScroll
      footer={<UButton label={saving ? 'Saving…' : 'Save prep session'} size="lg" fullWidth disabled={saving} onPress={save} testID="prep-save" />}
    >
      <ScreenHeader
        overline={`Week of ${monthRangeLabel(weekDate, addDays(weekDate, 6))}`}
        title={session ? 'Edit prep' : 'Plan a prep session'}
        right={<IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />}
      />
      {state.error ? <ErrorNote message={state.error} onRetry={state.reload} /> : null}
      {!state.data && state.loading ? (
        <LoadingBlock />
      ) : (
        <View style={styles.gap} key={formKey}>
          <Card style={styles.gap}>
            <Field label="Name" defaultValue={title} onChangeText={setTitle} maxLength={64} testID="prep-title" />
            <Txt variant="caption" tone="muted">
              Day
            </Txt>
            <View style={styles.chips}>
              {weekKeys.map((key) => (
                <Chip key={key} label={shortWeekday(parseDayKey(key))} selected={key === day} onPress={() => setDay(key)} />
              ))}
            </View>
            <View style={styles.row}>
              <Field label="Start time" defaultValue={time} onChangeText={setTime} maxLength={8} testID="prep-time" />
              <Field label="Duration" defaultValue={duration} onChangeText={setDuration} keyboardType="number-pad" suffix="min" testID="prep-duration" />
            </View>
          </Card>
          {checkedGroceries.length > 0 ? (
            <Card tone="peach" style={styles.gap}>
              <View style={styles.suggestedHeader}>
                <View style={styles.flex}>
                  <Txt variant="subheading" color={c.peachInk}>
                    Suggested for next day’s meals
                  </Txt>
                  <Txt variant="caption" color={c.peachInk}>
                    Checked off your grocery list and ready to prep.
                  </Txt>
                </View>
                <Badge label={`${checkedGroceries.length} ready`} tone="card" />
              </View>
              <View style={styles.chips}>
                {checkedGroceries.map((grocery) => {
                  const isAdded = items.some(
                    (dish) => dish.name.trim().toLowerCase() === grocery.name.trim().toLowerCase(),
                  )
                  return (
                    <Chip
                      key={grocery.$id}
                      label={`${isAdded ? '✓ ' : '+ '}${grocery.name}${grocery.quantity ? ` (${grocery.quantity})` : ''}`}
                      selected={isAdded}
                      onPress={() => {
                        if (isAdded) {
                          setItems((current) => {
                            const filtered = current.filter(
                              (dish) => dish.name.trim().toLowerCase() !== grocery.name.trim().toLowerCase(),
                            )
                            return filtered.length > 0 ? filtered : [newItem()]
                          })
                        } else {
                          setItems((current) => {
                            const cleaned = current.filter((dish) => dish.name.trim().length > 0)
                            const qty = grocery.quantity && !isNaN(Number(grocery.quantity)) ? grocery.quantity : '2'
                            return [...cleaned, newItem(grocery.name.trim(), qty)]
                          })
                        }
                      }}
                    />
                  )
                })}
              </View>
            </Card>
          ) : null}
          <Card style={styles.gap}>
            <Txt variant="subheading">What you’re cooking</Txt>
            {items.map((item, index) => (
              <View key={item.key} style={styles.itemRow}>
                <View style={styles.itemName}>
                  <Field
                    label={`Dish ${index + 1}`}
                    defaultValue={item.name}
                    placeholder="Chicken & rice"
                    onChangeText={(text) => updateItem(item.key, 'name', text)}
                    maxLength={64}
                    testID={`prep-item-${index}`}
                  />
                </View>
                <Field
                  label="Portions"
                  defaultValue={item.portions}
                  placeholder="4"
                  keyboardType="number-pad"
                  onChangeText={(text) => updateItem(item.key, 'portions', text)}
                  testID={`prep-portions-${index}`}
                />
                <IconButton
                  icon="close"
                  tone="chip"
                  size={36}
                  accessibilityLabel={`Remove dish ${index + 1}`}
                  onPress={() => setItems((current) => (current.length > 1 ? current.filter((entry) => entry.key !== item.key) : [newItem()]))}
                  style={styles.remove}
                />
              </View>
            ))}
            {items.length < 20 ? (
              <UButton label="Add dish" tone="mint" size="sm" onPress={() => setItems((current) => [...current, newItem()])} style={styles.start} />
            ) : null}
          </Card>
          {formError ? <ErrorNote message={formError} /> : null}
        </View>
      )}
    </ScreenScroll>
  )
}

const styles = StyleSheet.create({
  gap: { gap: 14 },
  row: { flexDirection: 'row', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestedHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  itemName: { flex: 2 },
  remove: { marginBottom: 5 },
  start: { alignSelf: 'flex-start' },
})
