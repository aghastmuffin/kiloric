import { MotionView } from '@/components/MotionView'
import { SwipeableRow } from '@/components/SwipeableRow'
import type { FavoriteFood } from '@/lib/foodFavorites'
import { MEAL_TYPE_OPTIONS, type MealType } from '@/lib/meals'
import { isOrdsPresent, ORDS_FIELD_PRIORITY, productHasUnknownDetails } from '@/lib/ordsNormalize'
import { getBarcodeFromProduct, getProductTitle } from '@/lib/productDisplay'
import { useTheme } from '@/lib/theme/ThemeContext'
import { borderRadius, spacing, type ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { Ionicons } from '@expo/vector-icons'
import { memo, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

export type SearchResult = Record<string, unknown>

type AddStatus = { state: 'adding' | 'added' | 'error'; message: string }

export type ContributePayload = {
  query?: string
  code?: string
  product_name?: string
  brands?: string
  categories?: string
  quantity?: string
  serving_size?: string
  serving_quantity?: string
  allergens?: string
  traces_tags?: string
  nutriscore_grade?: string
  ecoscore_grade?: string
  'energy-kcal_100g'?: string
  'energy-kj_100g'?: string
  proteins_100g?: string
  carbohydrates_100g?: string
  fat_100g?: string
  fiber_100g?: string
  sugars_100g?: string
  'added-sugars_100g'?: string
  polyols_100g?: string
  'saturated-fat_100g'?: string
  'trans-fat_100g'?: string
  'monounsaturated-fat_100g'?: string
  'polyunsaturated-fat_100g'?: string
  sodium_100g?: string
  cholesterol_100g?: string
  'vitamin-a_100g'?: string
  'vitamin-c_100g'?: string
  'vitamin-d_100g'?: string
  'vitamin-b12_100g'?: string
  calcium_100g?: string
  iron_100g?: string
  potassium_100g?: string
  magnesium_100g?: string
  caffeine_100g?: string
  taurine_100g?: string
  'carbon-footprint_100g'?: string
  nova_group?: string
  additives_n?: string
}

const HIDDEN_KEYS = new Set([
  'product',
  'product_data',
  'data',
  'nutriments',
  'images',
  'selected_images',
  'image',
  'image_small_url',
  'image_thumb_url',
  'image_front_url',
  'image_front_small_url',
  'image_front_thumb_url',
  'image_nutrition_url',
  'image_ingredients_url',
  'languages',
  'languages_codes',
  'lang',
  'states',
  'states_tags',
  'states_hierarchy',
  'entry_dates_tags',
  'last_modified_t',
  'created_t',
  'last_updated_t',
  'completeness',
  'rev',
  'schema_version',
  'interface_version_created',
  'interface_version_modified',
  // Alias duplicates — prefer *_100g columns from ORDS
  'calories',
  'energy-kcal',
  'energy_kcal',
  'energy-kj',
  'energy_kj',
  'proteins',
  'protein',
  'carbohydrates',
  'carbs',
  'fat',
  'fiber',
  'fibre',
  'sugars',
  'sugar',
  'sodium',
  'saturated-fat',
  'saturated_fat',
  'trans-fat',
  'trans_fat',
  'monounsaturated-fat',
  'monounsaturated_fat',
  'polyunsaturated-fat',
  'polyunsaturated_fat',
  'added-sugars',
  'added_sugars',
  'vitamin-a',
  'vitamin_a',
  'vitamin-c',
  'vitamin_c',
  'vitamin-d',
  'vitamin_d',
  'vitamin-b12',
  'vitamin_b12',
  'calcium',
  'iron',
  'potassium',
  'magnesium',
  'caffeine',
  'taurine',
  'carbon-footprint',
  'carbon_footprint',
])

const TITLE_SKIP = new Set([
  'name',
  'title',
  'food_name',
  'product_name',
  'description',
  'label',
])

const FIELD_PRIORITY = [...ORDS_FIELD_PRIORITY]

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' || typeof item === 'number' ? String(item) : null))
      .filter(Boolean)
      .join(', ') || '—'
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function unwrapProduct(item: SearchResult): SearchResult {
  for (const key of ['product', 'product_data', 'data']) {
    const value = item[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as SearchResult
    }
  }
  return item
}

function getBrand(item: SearchResult): string {
  for (const key of ['brands', 'brand', 'manufacturer', 'store']) {
    const value = item[key]
    if (typeof value === 'string' && isOrdsPresent(value)) return value.trim()
  }
  return 'Food database'
}

function getCaloriesLabel(item: SearchResult): string {
  const nutriments =
    item.nutriments && typeof item.nutriments === 'object' && !Array.isArray(item.nutriments)
      ? (item.nutriments as Record<string, unknown>)
      : null

  const calories =
    item.energy_kcal_100g ??
    item['energy-kcal_100g'] ??
    item.calories ??
    item['energy-kcal'] ??
    item.energy_kcal ??
    nutriments?.energy_kcal_100g ??
    nutriments?.['energy-kcal_100g'] ??
    nutriments?.['energy-kcal'] ??
    nutriments?.energy_kcal

  if (typeof calories === 'number' && Number.isFinite(calories)) {
    return `${Math.round(calories)} kcal / 100g`
  }
  if (typeof calories === 'string' && isOrdsPresent(calories)) {
    return calories.includes('kcal') ? calories : `${calories} kcal`
  }
  return 'Nutrition incomplete'
}

function scalarEntries(source: SearchResult): [string, unknown][] {
  const entries: [string, unknown][] = []
  for (const [key, value] of Object.entries(source)) {
    if (HIDDEN_KEYS.has(key) || TITLE_SKIP.has(key)) continue
    if (!isOrdsPresent(value)) continue
    if (typeof value === 'object' && !Array.isArray(value)) continue
    entries.push([key, value])
  }
  return entries.sort(([a], [b]) => {
    const rankA = (FIELD_PRIORITY as readonly string[]).indexOf(a)
    const rankB = (FIELD_PRIORITY as readonly string[]).indexOf(b)
    const scoreA = rankA === -1 ? FIELD_PRIORITY.length : rankA
    const scoreB = rankB === -1 ? FIELD_PRIORITY.length : rankB
    if (scoreA !== scoreB) return scoreA - scoreB
    return a.localeCompare(b)
  })
}

function readString(...candidates: unknown[]): string | undefined {
  for (const value of candidates) {
    if (typeof value === 'string' && isOrdsPresent(value)) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return undefined
}

function nutrimentValue(
  product: SearchResult,
  ...keys: string[]
): string | undefined {
  const nutriments =
    product.nutriments && typeof product.nutriments === 'object' && !Array.isArray(product.nutriments)
      ? (product.nutriments as Record<string, unknown>)
      : null
  for (const key of keys) {
    const fromRoot = readString(product[key])
    if (fromRoot) return fromRoot
    if (nutriments) {
      const fromNut = readString(nutriments[key])
      if (fromNut) return fromNut
    }
  }
  return undefined
}

/** Build contribute-food route params from a search/scan product. */
export function contributeParamsFromProduct(
  item: SearchResult,
  sourceQuery?: string,
): ContributePayload {
  const product = unwrapProduct(item)
  const barcode = getBarcodeFromProduct(product) ?? getBarcodeFromProduct(item) ?? undefined
  const productName = getProductTitle(product, '')
  return {
    query: sourceQuery?.trim() || productName || barcode,
    code: barcode,
    product_name: productName || undefined,
    brands: readString(product.brands, product.brand),
    categories: readString(product.categories),
    quantity: readString(product.quantity),
    serving_size: readString(product.serving_size),
    serving_quantity: nutrimentValue(product, 'serving_quantity'),
    allergens: readString(product.allergens),
    traces_tags: readString(product.traces_tags),
    nutriscore_grade: readString(product.nutriscore_grade),
    ecoscore_grade: readString(product.ecoscore_grade),
    'energy-kcal_100g': nutrimentValue(
      product,
      'energy_kcal_100g',
      'energy-kcal_100g',
      'energy-kcal',
      'energy_kcal',
      'calories',
    ),
    'energy-kj_100g': nutrimentValue(product, 'energy_kj_100g', 'energy-kj_100g', 'energy-kj'),
    proteins_100g: nutrimentValue(product, 'proteins_100g', 'proteins', 'protein'),
    carbohydrates_100g: nutrimentValue(
      product,
      'carbohydrates_100g',
      'carbohydrates',
      'carbs',
    ),
    fat_100g: nutrimentValue(product, 'fat_100g', 'fat'),
    fiber_100g: nutrimentValue(product, 'fiber_100g', 'fiber', 'fibre'),
    sugars_100g: nutrimentValue(product, 'sugars_100g', 'sugars', 'sugar'),
    'added-sugars_100g': nutrimentValue(
      product,
      'added_sugars_100g',
      'added-sugars_100g',
      'added-sugars',
    ),
    polyols_100g: nutrimentValue(product, 'polyols_100g', 'polyols'),
    'saturated-fat_100g': nutrimentValue(
      product,
      'saturated_fat_100g',
      'saturated-fat_100g',
      'saturated-fat',
    ),
    'trans-fat_100g': nutrimentValue(product, 'trans_fat_100g', 'trans-fat_100g', 'trans-fat'),
    'monounsaturated-fat_100g': nutrimentValue(
      product,
      'monounsaturated_fat_100g',
      'monounsaturated-fat_100g',
      'monounsaturated-fat',
    ),
    'polyunsaturated-fat_100g': nutrimentValue(
      product,
      'polyunsaturated_fat_100g',
      'polyunsaturated-fat_100g',
      'polyunsaturated-fat',
    ),
    sodium_100g: nutrimentValue(product, 'sodium_100g', 'sodium'),
    cholesterol_100g: nutrimentValue(product, 'cholesterol_100g', 'cholesterol'),
    'vitamin-a_100g': nutrimentValue(product, 'vitamin_a_100g', 'vitamin-a_100g', 'vitamin-a'),
    'vitamin-c_100g': nutrimentValue(product, 'vitamin_c_100g', 'vitamin-c_100g', 'vitamin-c'),
    'vitamin-d_100g': nutrimentValue(product, 'vitamin_d_100g', 'vitamin-d_100g', 'vitamin-d'),
    'vitamin-b12_100g': nutrimentValue(
      product,
      'vitamin_b12_100g',
      'vitamin-b12_100g',
      'vitamin-b12',
    ),
    calcium_100g: nutrimentValue(product, 'calcium_100g', 'calcium'),
    iron_100g: nutrimentValue(product, 'iron_100g', 'iron'),
    potassium_100g: nutrimentValue(product, 'potassium_100g', 'potassium'),
    magnesium_100g: nutrimentValue(product, 'magnesium_100g', 'magnesium'),
    caffeine_100g: nutrimentValue(product, 'caffeine_100g', 'caffeine'),
    taurine_100g: nutrimentValue(product, 'taurine_100g', 'taurine'),
    'carbon-footprint_100g': nutrimentValue(
      product,
      'carbon_footprint_100g',
      'carbon-footprint_100g',
      'carbon-footprint',
    ),
    nova_group: nutrimentValue(product, 'nova_group'),
    additives_n: nutrimentValue(product, 'additives_n'),
  }
}

/** Extract macro numbers for favorites / previews from a normalized product. */
export function macrosFromProduct(item: SearchResult): {
  kcal: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
} {
  const product = unwrapProduct(item)
  const read = (...keys: string[]): number | null => {
    for (const key of keys) {
      const raw = product[key]
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw
      if (typeof raw === 'string' && isOrdsPresent(raw)) {
        const parsed = Number.parseFloat(raw)
        if (Number.isFinite(parsed)) return parsed
      }
    }
    const nutriments =
      product.nutriments && typeof product.nutriments === 'object' && !Array.isArray(product.nutriments)
        ? (product.nutriments as Record<string, unknown>)
        : null
    if (nutriments) {
      for (const key of keys) {
        const raw = nutriments[key]
        if (typeof raw === 'number' && Number.isFinite(raw)) return raw
      }
    }
    return null
  }

  return {
    kcal: read('energy_kcal_100g', 'energy-kcal_100g', 'energy_kcal', 'energy-kcal', 'calories'),
    protein: read('proteins_100g', 'proteins', 'protein'),
    carbs: read('carbohydrates_100g', 'carbohydrates', 'carbs'),
    fat: read('fat_100g', 'fat'),
  }
}

type Props = {
  isSearching: boolean
  results: SearchResult[]
  searchError: string | null
  searchQuery: string
  selectedMealType: MealType
  mealPickerOpen: boolean
  addStatuses: Record<number, AddStatus>
  favorites: FavoriteFood[]
  onToggleMealPicker: () => void
  onSelectMealType: (type: MealType) => void
  onAdd: (item: SearchResult, index: number) => void
  onToggleFavorite: (item: SearchResult) => void
  onOpenDetail: (barcode: string, item: SearchResult) => void
  onBack: () => void
  onContribute: (payload?: ContributePayload) => void
}

export function LogFoodMultiView({
  isSearching,
  results,
  searchError,
  searchQuery,
  selectedMealType,
  mealPickerOpen,
  addStatuses,
  favorites,
  onToggleMealPicker,
  onSelectMealType,
  onAdd,
  onToggleFavorite,
  onOpenDetail,
  onBack,
  onContribute,
}: Props) {
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const toggleExpanded = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded((current) => ({ ...current, [index]: !current[index] }))
  }

  return (
    <MotionView
      from={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', damping: 20 }}
      style={styles.section}
    >
      <View style={styles.sectionHeader}>
        <View style={styles.resultsHeading}>
          <Pressable onPress={onBack} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
            <Ionicons name="arrow-back" size={18} color={colors.accent} />
          </Pressable>
          <View style={styles.headingCopy}>
            <Text style={styles.sectionTitle}>Matches</Text>
            {searchQuery.trim() ? (
              <Text style={styles.queryHint} numberOfLines={1}>
                {searchQuery.trim()}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.mealSelectWrap}>
          <Pressable
            onPress={onToggleMealPicker}
            style={({ pressed }) => [styles.mealSelect, pressed && styles.pressed]}
          >
            <Text style={styles.mealSelectText}>{selectedMealType}</Text>
            <Ionicons
              name={mealPickerOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
          {mealPickerOpen ? (
            <View style={styles.mealMenu}>
              {MEAL_TYPE_OPTIONS.filter((type) => type !== 'Other').map((type) => (
                <Pressable
                  key={type}
                  onPress={() => onSelectMealType(type)}
                  style={({ pressed }) => [
                    styles.mealMenuItem,
                    type === selectedMealType && styles.mealMenuItemSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.mealMenuItemText,
                      type === selectedMealType && styles.mealMenuItemTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>

      <Text style={styles.swipeHint}>
        Expand a match for full columns · swipe or tap + to add to {selectedMealType}
      </Text>

      <View style={styles.resultsStack}>
        {isSearching ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.emptyText}>Searching foods…</Text>
          </View>
        ) : searchError ? (
          <View style={styles.emptyCard}>
            <Ionicons name="search-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyText}>{searchError}</Text>
            <Pressable
              style={styles.contributeButton}
              onPress={() => {
                const trimmed = searchQuery.trim()
                const looksLikeBarcode = /^\d{8,14}$/.test(trimmed)
                onContribute({
                  query: trimmed,
                  ...(looksLikeBarcode ? { code: trimmed } : {}),
                  ...(!looksLikeBarcode && trimmed ? { product_name: trimmed } : {}),
                })
              }}
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.onAccent} />
              <Text style={styles.contributeButtonText}>Add this product</Text>
            </Pressable>
          </View>
        ) : (
          results.map((item, index) => (
            <ResultCard
              key={`${getBarcodeFromProduct(unwrapProduct(item)) ?? 'row'}-${index}`}
              item={item}
              index={index}
              expanded={Boolean(expanded[index])}
              status={addStatuses[index]}
              favorited={(() => {
                const product = unwrapProduct(item)
                const barcode = getBarcodeFromProduct(product) ?? getBarcodeFromProduct(item)
                return barcode
                  ? favorites.some((favorite) => favorite.barcode === barcode)
                  : false
              })()}
              colors={colors}
              styles={styles}
              onToggleExpand={() => toggleExpanded(index)}
              onAdd={() => onAdd(item, index)}
              onToggleFavorite={() => onToggleFavorite(item)}
              onOpenDetail={(barcode) => onOpenDetail(barcode, item)}
              onImprove={() => onContribute(contributeParamsFromProduct(item, searchQuery))}
            />
          ))
        )}
      </View>
    </MotionView>
  )
}

const ResultCard = memo(
  function ResultCard({
    item,
    index,
    expanded,
    status,
    favorited,
    colors,
    styles,
    onToggleExpand,
    onAdd,
    onToggleFavorite,
    onOpenDetail,
    onImprove,
  }: {
    item: SearchResult
    index: number
    expanded: boolean
    status?: AddStatus
    favorited: boolean
    colors: ThemeColors
    styles: ReturnType<typeof makeStyles>
    onToggleExpand: () => void
    onAdd: () => void
    onToggleFavorite: () => void
    onOpenDetail: (barcode: string) => void
    onImprove: () => void
  }) {
    const product = useMemo(() => unwrapProduct(item), [item])
  const title = getProductTitle(product, `Result ${index + 1}`)
  const barcode = getBarcodeFromProduct(product) ?? getBarcodeFromProduct(item)
  const brand = getBrand(product)
  const calories = getCaloriesLabel(product)
  const columns = useMemo(() => scalarEntries(product), [product])
  const previewColumns = columns.slice(0, expanded ? columns.length : 4)
  const needsLabelPhoto = useMemo(() => productHasUnknownDetails(product), [product])

  const header = (
    <Pressable
      onPress={onToggleExpand}
      style={({ pressed }) => [styles.cardHeader, pressed && styles.pressed]}
    >
      <View style={styles.cardHeaderCopy}>
        <View style={styles.titleRow}>
          <Text style={styles.resultTitle} numberOfLines={expanded ? 3 : 2}>
            {title}
          </Text>
          {barcode ? (
            <Pressable
              hitSlop={8}
              onPress={onToggleFavorite}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Ionicons
                name={favorited ? 'star' : 'star-outline'}
                size={16}
                color={favorited ? colors.accent : colors.textFaint}
              />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.resultBrand} numberOfLines={1}>
          {brand}
          {barcode ? ` · ${barcode}` : ''}
        </Text>
        <View style={styles.badgeRow}>
          <View style={styles.resultBadge}>
            <Text style={styles.resultBadgeText}>{calories}</Text>
          </View>
          <Text style={styles.expandHint}>
            {expanded ? 'Hide columns' : `${columns.length} columns`}
          </Text>
        </View>
        {status ? (
          <Text
            style={[
              styles.resultFeedback,
              status.state === 'error' && styles.resultFeedbackError,
            ]}
          >
            {status.message}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityLabel={`Add ${title}`}
        disabled={!barcode || status?.state === 'adding'}
        onPress={onAdd}
        style={({ pressed }) => [
          styles.addCircle,
          (pressed || status?.state === 'added') && styles.addCircleActive,
        ]}
      >
        {status?.state === 'adding' ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Ionicons
            name={status?.state === 'added' ? 'checkmark' : 'add'}
            size={18}
            color={status?.state === 'added' ? colors.onAccent : colors.textMuted}
          />
        )}
      </Pressable>
    </Pressable>
  )

  const body = (
    <View style={styles.card}>
      {header}
      {previewColumns.length > 0 ? (
        <View style={styles.columnsBlock}>
          {previewColumns.map(([key, value]) => (
            <View key={key} style={styles.columnRow}>
              <Text style={styles.columnLabel}>{formatLabel(key)}</Text>
              <Text style={styles.columnValue} numberOfLines={expanded ? 6 : 2}>
                {formatValue(value)}
              </Text>
            </View>
          ))}
          {!expanded && columns.length > 4 ? (
            <Pressable onPress={onToggleExpand} style={styles.moreColumns}>
              <Text style={styles.moreColumnsText}>
                +{columns.length - 4} more columns
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.accent} />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Text style={styles.mutedInline}>No additional columns on this match.</Text>
      )}

      <View style={styles.cardActions}>
        {barcode ? (
          <Pressable
            onPress={() => onOpenDetail(barcode)}
            style={({ pressed }) => [styles.actionChip, pressed && styles.pressed]}
          >
            <Ionicons name="eye-outline" size={15} color={colors.accent} />
            <Text style={styles.actionChipText}>Full detail</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onImprove}
          style={({ pressed }) => [
            styles.actionChip,
            needsLabelPhoto && styles.actionChipPhoto,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name={needsLabelPhoto ? 'camera-outline' : 'create-outline'}
            size={15}
            color={colors.accent}
          />
          <Text style={styles.actionChipText}>
            {needsLabelPhoto ? 'Snap label photo' : 'Add / change details'}
          </Text>
        </Pressable>
      </View>
      {needsLabelPhoto ? (
        <Text style={styles.photoHint}>
          Unknown details — photograph the nutrition facts and ingredients list.
        </Text>
      ) : null}
    </View>
  )

  return (
    <MotionView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 240, delay: index * 35 }}
    >
      {barcode ? (
        <SwipeableRow
          swipeLeft={{
            label: 'Add',
            icon: 'add-circle-outline',
            onPress: onAdd,
          }}
        >
          {body}
        </SwipeableRow>
      ) : (
        body
      )}
    </MotionView>
  )
},
  (prevProps, nextProps) => {
    return (
      prevProps.index === nextProps.index &&
      prevProps.expanded === nextProps.expanded &&
      prevProps.favorited === nextProps.favorited &&
      prevProps.colors === nextProps.colors &&
      prevProps.styles === nextProps.styles &&
      prevProps.status?.state === nextProps.status?.state &&
      prevProps.status?.message === nextProps.status?.message &&
      prevProps.item === nextProps.item
    )
  }
)

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
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
    resultsHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    headingCopy: {
      flex: 1,
      gap: 2,
    },
    sectionTitle: {
      ...typography.headline,
      color: c.accent,
    },
    queryHint: {
      ...typography.labelSmall,
      color: c.textMuted,
    },
    mealSelectWrap: {
      position: 'relative',
      zIndex: 5,
    },
    mealSelect: {
      minWidth: 118,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: 'rgba(120,118,114,0.3)',
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
    },
    mealSelectText: {
      ...typography.label,
      color: c.accent,
    },
    mealMenu: {
      position: 'absolute',
      top: 42,
      right: 0,
      zIndex: 20,
      minWidth: 140,
      backgroundColor: c.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
    },
    mealMenuItem: {
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
    },
    mealMenuItemSelected: {
      backgroundColor: c.accentSoft,
    },
    mealMenuItemText: {
      ...typography.label,
      color: c.text,
    },
    mealMenuItemTextSelected: {
      color: c.accent,
      fontWeight: '700',
    },
    swipeHint: {
      ...typography.labelSmall,
      color: c.textMuted,
    },
    resultsStack: {
      gap: spacing.md,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: 'rgba(120,118,114,0.2)',
      overflow: 'hidden',
    },
    cardHeader: {
      minHeight: 92,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.surface,
    },
    cardHeaderCopy: {
      flex: 1,
      gap: 4,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    resultTitle: {
      ...typography.body,
      color: c.text,
      flex: 1,
      fontWeight: '600',
    },
    resultBrand: {
      ...typography.labelSmall,
      color: c.textMuted,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: 2,
      flexWrap: 'wrap',
    },
    resultBadge: {
      borderRadius: borderRadius.sm,
      backgroundColor: 'rgba(27,54,93,0.1)',
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    resultBadgeText: {
      ...typography.labelSmall,
      fontSize: 10,
      color: c.accent,
    },
    expandHint: {
      ...typography.labelSmall,
      color: c.textFaint,
      fontSize: 10,
    },
    resultFeedback: {
      ...typography.labelSmall,
      color: c.success,
      marginTop: 4,
    },
    resultFeedbackError: {
      color: c.danger,
    },
    addCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.textMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addCircleActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    columnsBlock: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    columnRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: 'rgba(196,198,207,0.28)',
    },
    columnLabel: {
      ...typography.labelSmall,
      color: c.textMuted,
      flex: 1,
    },
    columnValue: {
      ...typography.labelSmall,
      color: c.text,
      fontSize: 13,
      fontWeight: '500',
      flex: 1.25,
      textAlign: 'right',
    },
    moreColumns: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: spacing.sm,
    },
    moreColumnsText: {
      ...typography.labelSmall,
      color: c.accent,
      fontWeight: '600',
    },
    mutedInline: {
      ...typography.labelSmall,
      color: c.textMuted,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    cardActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      paddingTop: spacing.xs,
    },
    actionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: borderRadius.pill,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surfaceAlt,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    actionChipPhoto: {
      backgroundColor: c.accentSoft,
      borderColor: c.accent,
    },
    actionChipText: {
      ...typography.labelSmall,
      color: c.accent,
      fontWeight: '600',
    },
    photoHint: {
      ...typography.labelSmall,
      color: c.textMuted,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      lineHeight: 18,
    },
    emptyCard: {
      minHeight: 140,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: 'rgba(120,118,114,0.2)',
      padding: spacing.lg,
    },
    emptyText: {
      ...typography.body,
      color: c.textMuted,
      textAlign: 'center',
    },
    contributeButton: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.accent,
      paddingHorizontal: spacing.lg,
      paddingVertical: 12,
      borderRadius: borderRadius.md,
    },
    contributeButtonText: {
      ...typography.label,
      color: c.onAccent,
      fontWeight: '700',
    },
    pressed: {
      opacity: 0.78,
    },
  })
