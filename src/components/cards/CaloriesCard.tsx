import { Card, MacroBar, ProgressRing, Txt } from '@/components/ds'
import { formatKcal, type Macros } from '@/lib/data/foodItem'
import type { Targets } from '@/lib/data/overview'
import { fonts, usePalette } from '@/lib/theme/palette'
import { StyleSheet, Text, View } from 'react-native'

type Props = {
  eaten: Macros
  burned: number
  targets: Targets
  remaining: number
  layout: 'mobile' | 'wide'
}

export function CaloriesCard({ eaten, burned, targets, remaining, layout }: Props) {
  const c = usePalette()
  const budget = targets.kcal + burned
  const progress = budget > 0 ? eaten.kcal / budget : 0
  const over = remaining < 0
  const wide = layout === 'wide'
  const macros = [
    { key: 'protein', label: 'Protein', value: eaten.protein, goal: targets.protein, color: c.protein, soft: c.proteinSoft },
    { key: 'carbs', label: 'Carbs', value: eaten.carbs, goal: targets.carbs, color: c.carbs, soft: c.carbsSoft },
    { key: 'fat', label: 'Fat', value: eaten.fat, goal: targets.fat, color: c.fat, soft: c.fatSoft },
  ]

  return (
    <Card style={wide ? styles.wideCard : undefined} testID="calories-card">
      {wide ? <Txt variant="subheading">Calories</Txt> : null}
      <View style={[styles.top, wide && styles.topWide]}>
        <ProgressRing
          progress={progress}
          size={wide ? 132 : 168}
          stroke={wide ? 14 : 16}
          color={over ? c.over : c.primary}
          accessibilityLabel={`${formatKcal(Math.abs(remaining))} kilocalories ${over ? 'over' : 'left'} today`}
        >
          <Text style={[styles.ringValue, { color: c.ink, fontSize: wide ? 26 : 34 }]}>{formatKcal(Math.abs(remaining))}</Text>
          <Text style={[styles.ringLabel, { color: c.inkMuted }]}>{over ? 'kcal over' : 'kcal left'}</Text>
        </ProgressRing>
        <View style={[styles.stats, wide && styles.statsWide]}>
          <Stat label="Eaten" value={formatKcal(eaten.kcal)} inline={wide} />
          <Stat label="Burned" value={formatKcal(burned)} inline={wide} />
          <Stat label={wide ? 'Goal' : 'Daily goal'} value={targets.kcal > 0 ? formatKcal(targets.kcal) : '—'} inline={wide} />
        </View>
      </View>
      <View style={wide ? styles.macrosStacked : styles.macrosRow}>
        {macros.map((macro) => (
          <View key={macro.key} style={wide ? styles.macroStacked : styles.macroCell}>
            <View style={styles.macroHeader}>
              <Text style={[styles.macroLabel, { color: macro.color }]}>{macro.label}</Text>
              <Text style={[styles.macroValue, { color: c.inkMuted }]}>
                {Math.round(macro.value)}/{macro.goal > 0 ? `${macro.goal}` : '—'}
                {wide ? ' g' : 'g'}
              </Text>
            </View>
            <MacroBar
              color={macro.color}
              soft={macro.soft}
              base={macro.goal > 0 ? macro.value / macro.goal : 0}
              height={8}
              label={`${macro.label} ${Math.round(macro.value)} of ${macro.goal} grams`}
            />
          </View>
        ))}
      </View>
    </Card>
  )
}

function Stat({ label, value, inline }: { label: string; value: string; inline: boolean }) {
  const c = usePalette()
  if (inline) {
    return (
      <Text style={[styles.inlineStat, { color: c.inkMuted }]}>
        {label} <Text style={{ color: c.ink, fontFamily: fonts.heavy }}>{value}</Text>
      </Text>
    )
  }
  return (
    <View>
      <Txt variant="caption" tone="muted">
        {label}
      </Txt>
      <Txt variant="metric">{value}</Txt>
    </View>
  )
}

const styles = StyleSheet.create({
  wideCard: { flex: 1, gap: 16 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 28, marginBottom: 20 },
  topWide: { gap: 22, marginBottom: 4 },
  ringValue: { fontFamily: fonts.heavy, letterSpacing: -1 },
  ringLabel: { fontFamily: fonts.medium, fontSize: 13 },
  stats: { gap: 10 },
  statsWide: { gap: 8 },
  inlineStat: { fontFamily: fonts.medium, fontSize: 15 },
  macrosRow: { flexDirection: 'row', gap: 16 },
  macrosStacked: { gap: 12 },
  macroCell: { flex: 1, gap: 6 },
  macroStacked: { gap: 6 },
  macroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 },
  macroLabel: { fontFamily: fonts.bold, fontSize: 14 },
  macroValue: { fontFamily: fonts.medium, fontSize: 13 },
})
