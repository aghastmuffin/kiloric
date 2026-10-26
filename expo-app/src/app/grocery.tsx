import {
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
import { addDays, dayKey, monthRangeLabel, parseDayKey, startOfWeek } from '@/lib/data/dateKeys'
import { addGroceryItem, deleteGroceryItem, listGroceryItems, setGroceryChecked, type GroceryItem } from '@/lib/data/mealPlan'
import { useFocusLoader } from '@/lib/data/useLoader'
import { usePalette } from '@/lib/theme/palette'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Fragment, useState } from 'react'
import { StyleSheet, View } from 'react-native'

export default function GroceryScreen() {
  const params = useLocalSearchParams<{ week?: string }>()
  const router = useRouter()
  const c = usePalette()
  const { user } = useAuth()
  const userId = user?.$id ?? null
  const weekStart = params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? params.week : dayKey(startOfWeek())
  const weekDate = parseDayKey(weekStart)

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [formKey, setFormKey] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)

  const state = useFocusLoader(() => listGroceryItems(userId!, weekStart), userId ? `${userId}:${weekStart}` : null)
  const items = state.data ?? []
  const open = items.filter((item) => !item.checked)
  const done = items.filter((item) => item.checked)

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

  function add() {
    if (!userId || !name.trim()) return
    void run('add', async () => {
      await addGroceryItem(userId, weekStart, name, quantity)
      setName('')
      setQuantity('')
      setFormKey((key) => key + 1)
    })
  }

  function renderList(list: GroceryItem[]) {
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
            <Txt variant="subheading" style={item.checked ? { color: c.inkMuted, textDecorationLine: 'line-through' } : undefined}>
              {item.name}
            </Txt>
            {item.quantity ? (
              <Txt variant="caption" tone="muted">
                {item.quantity}
              </Txt>
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
      <Card style={styles.gap} key={formKey}>
        <View style={styles.formRow}>
          <View style={styles.nameField}>
            <Field label="Item" placeholder="Chicken thighs" onChangeText={setName} maxLength={128} testID="grocery-name" />
          </View>
          <Field label="Qty" placeholder="1 kg" onChangeText={setQuantity} maxLength={64} />
        </View>
        <UButton label={busy === 'add' ? 'Adding…' : 'Add to list'} size="md" fullWidth disabled={!name.trim() || busy === 'add'} onPress={add} testID="grocery-add" />
      </Card>
      {state.error ? <ErrorNote message={state.error} onRetry={state.reload} /> : null}
      {!state.data && state.loading ? (
        <LoadingBlock />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon="basket-outline" title="Your list is empty" body="Add what you need for this week’s prep and check items off in the store." />
        </Card>
      ) : (
        <>
          <Card padded={false} style={styles.listCard}>
            {open.length > 0 ? renderList(open) : <EmptyState compact icon="checkmark-done-outline" title="All picked up" />}
          </Card>
          {done.length > 0 ? (
            <>
              <Txt variant="label" tone="muted">
                In the cart · {done.length}
              </Txt>
              <Card padded={false} style={styles.listCard}>
                {renderList(done)}
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
  listCard: { paddingHorizontal: 20, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
})
