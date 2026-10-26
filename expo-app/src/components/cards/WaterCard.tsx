import { Card, ProgressRing, Txt } from '@/components/ds'
import type { WaterDocument } from '@/lib/water'
import { triggerSelectionHaptic } from '@/lib/haptics'
import { fonts, usePalette } from '@/lib/theme/palette'
import { flOzToMl, formatFluid, mlToFlOz, type DisplayUnits } from '@/lib/units'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type Props = {
  totalMl: number
  targetFluidMl: number | null
  units: DisplayUnits
  waterEntries: WaterDocument[]
  onAddWater: (amountMl: number) => Promise<void>
  onUndoWater: (documentId: string) => Promise<void>
  onOpenDetails?: () => void
  disabled?: boolean
  layout?: 'mobile' | 'wide'
}

export function WaterCard({
  totalMl,
  targetFluidMl,
  units,
  waterEntries,
  onAddWater,
  onUndoWater,
  onOpenDetails,
  disabled = false,
  layout = 'mobile',
}: Props) {
  const c = usePalette()
  const [busy, setBusy] = useState(false)

  const targetMl = targetFluidMl && targetFluidMl > 0 ? targetFluidMl : 2500
  const isImperial = units === 'imperial'
  const progress = Math.min(1.5, Math.max(0, totalMl / targetMl))
  const displayTotal = isImperial ? mlToFlOz(totalMl) : totalMl
  const displayTarget = isImperial ? mlToFlOz(targetMl) : targetMl
  const unitLabel = isImperial ? 'fl oz' : 'ml'

  const presets = isImperial
    ? [
        { label: '+8 oz', amountMl: flOzToMl(8) },
        { label: '+16 oz', amountMl: flOzToMl(16) },
        { label: '+24 oz', amountMl: flOzToMl(24) },
      ]
    : [
        { label: '+250 ml', amountMl: 250 },
        { label: '+500 ml', amountMl: 500 },
        { label: '+750 ml', amountMl: 750 },
      ]

  const lastEntry = waterEntries[0] ?? null

  async function handleAdd(amountMl: number) {
    if (busy || disabled) return
    triggerSelectionHaptic()
    setBusy(true)
    try {
      await onAddWater(amountMl)
    } finally {
      setBusy(false)
    }
  }

  async function handleUndo() {
    if (!lastEntry || busy || disabled) return
    triggerSelectionHaptic()
    setBusy(true)
    try {
      await onUndoWater(lastEntry.$id)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card style={layout === 'wide' ? styles.wideCard : undefined} testID="water-card">
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons name="water-outline" size={20} color={c.protein} />
          <Txt variant="subheading">Hydration</Txt>
        </View>
        {onOpenDetails ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View hydration details"
            accessibilityHint="Opens water tracking screen"
            onPress={onOpenDetails}
            hitSlop={8}
            style={styles.detailsLink}
          >
            <Txt variant="caption" color={c.protein}>
              Details
            </Txt>
            <Ionicons name="chevron-forward" size={16} color={c.protein} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.contentRow}>
        <ProgressRing
          progress={progress}
          size={layout === 'wide' ? 110 : 130}
          stroke={12}
          color={c.protein}
          accessibilityLabel={`${formatFluid(units, totalMl)} of ${formatFluid(units, targetMl)} drank today`}
        >
          <Text style={[styles.ringValue, { color: c.ink, fontSize: layout === 'wide' ? 22 : 26 }]}>
            {displayTotal}
          </Text>
          <Text style={[styles.ringLabel, { color: c.inkMuted }]}>
            / {displayTarget} {unitLabel}
          </Text>
        </ProgressRing>

        <View style={styles.actionColumn}>
          <Text style={[styles.presetTitle, { color: c.inkMuted }]}>Quick add</Text>
          <View style={styles.presetsRow}>
            {presets.map((preset) => (
              <Pressable
                key={preset.label}
                accessibilityRole="button"
                accessibilityLabel={`Add ${preset.label} water`}
                accessibilityHint="Logs water for today"
                accessibilityState={{ disabled: busy || disabled }}
                disabled={busy || disabled}
                onPress={() => void handleAdd(preset.amountMl)}
                style={({ pressed }) => [
                  styles.presetBtn,
                  { backgroundColor: c.proteinSoft, opacity: pressed || busy || disabled ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.presetBtnText, { color: c.protein }]}>{preset.label}</Text>
              </Pressable>
            ))}
          </View>

          {lastEntry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Undo last water entry of ${formatFluid(units, lastEntry.amount_ml)}`}
              accessibilityHint="Removes the most recent water log for today"
              accessibilityState={{ disabled: busy || disabled }}
              disabled={busy || disabled}
              onPress={() => void handleUndo()}
              style={({ pressed }) => [
                styles.undoBtn,
                { opacity: pressed || busy || disabled ? 0.6 : 1 },
              ]}
            >
              <Ionicons name="arrow-undo-outline" size={14} color={c.inkMuted} />
              <Text style={[styles.undoText, { color: c.inkMuted }]}>
                Undo ({formatFluid(units, lastEntry.amount_ml)})
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  wideCard: { flex: 1, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailsLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  contentRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  ringValue: { fontFamily: fonts.heavy, letterSpacing: -0.5 },
  ringLabel: { fontFamily: fonts.medium, fontSize: 12 },
  actionColumn: { flex: 1, gap: 8 },
  presetTitle: { fontFamily: fonts.medium, fontSize: 13 },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetBtnText: { fontFamily: fonts.bold, fontSize: 14 },
  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  undoText: { fontFamily: fonts.medium, fontSize: 13 },
})
