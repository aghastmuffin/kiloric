import { Badge, Card, Txt, UButton } from '@/components/ds'
import { shortWeekday, timeLabel, weekdayName } from '@/lib/data/dateKeys'
import type { PrepOverview } from '@/lib/data/overview'
import { usePalette } from '@/lib/theme/palette'
import { StyleSheet, View } from 'react-native'

type Props = {
  prep: PrepOverview
  layout: 'dashboard' | 'plan'
  onGrocery: () => void
  onEdit: () => void
}

export function PrepCard({ prep, layout, onGrocery, onEdit }: Props) {
  const c = usePalette()
  const session = prep.session
  const when = session ? new Date(session.scheduled_at) : null
  const groceryCount = prep.groceries.filter((item) => !item.checked).length
  const groceryLabel = `Grocery list · ${groceryCount} item${groceryCount === 1 ? '' : 's'}`
  const meta = when
    ? [
        `${shortWeekday(when)} ${timeLabel(when)}`,
        session?.duration_min ? `about ${session.duration_min} min` : null,
        layout === 'dashboard' && prep.preppedMeals > 0 ? `${prep.preppedMeals} meals` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  return (
    <Card tone="peach" style={layout === 'dashboard' ? styles.dashboardCard : undefined} testID="prep-card">
      <View style={styles.header}>
        <View style={styles.flex}>
          <Txt variant={layout === 'dashboard' ? 'subheading' : 'heading'} color={c.peachInk}>
            {session ? `${when ? weekdayName(when) : ''} prep`.trim() : 'Meal prep'}
          </Txt>
          <Txt variant="caption" color={c.peachInk}>
            {meta ?? 'Batch-cook for the week ahead'}
          </Txt>
        </View>
        {layout === 'plan' && prep.preppedMeals > 0 ? <Badge label={`${prep.preppedMeals} meals`} tone="card" /> : null}
      </View>

      {prep.items.length > 0 ? (
        <View style={layout === 'plan' ? styles.gridItems : styles.listItems}>
          {prep.items.map((item) => (
            <View
              key={item.name}
              style={[
                layout === 'plan' ? styles.gridItem : styles.listItem,
                { backgroundColor: c.peachCard },
              ]}
            >
              <Txt variant="subheading" numberOfLines={1} style={layout === 'dashboard' ? styles.flex : undefined}>
                {item.name}
              </Txt>
              <Txt variant="caption" tone="muted">
                {item.portions} portions
              </Txt>
            </View>
          ))}
        </View>
      ) : (
        <Txt variant="caption" color={c.peachInk} style={styles.emptyText}>
          No prep session planned for this week yet.
        </Txt>
      )}

      <View style={styles.flex} />
      <View style={styles.actions}>
        <UButton label={groceryLabel} tone="inverse" size="md" fullWidth onPress={onGrocery} testID="grocery-button" />
        <UButton label={session ? 'Edit prep' : 'Plan a prep session'} tone="card" size="sm" onPress={onEdit} testID="edit-prep" />
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dashboardCard: { flex: 1, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  listItems: { gap: 8 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  gridItems: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridItem: { flexBasis: '46%', flexGrow: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 2 },
  emptyText: { marginBottom: 6 },
  actions: { gap: 10, marginTop: 16, alignItems: 'center' },
})
