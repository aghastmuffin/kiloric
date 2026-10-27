import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LogFoodScreen from '@/app/(tabs)/logfood'
import { logFood } from '@/lib/data/foodLog'

const harness = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  request: vi.fn(),
  push: vi.fn(),
  data: {
    budget: { remaining: 1500 },
    recent: [],
    todayEntries: [{ $id: 'breakfast', meal_type: 'Breakfast', name: 'Porridge', servings: 1, kcal: 240, protein: 8, carbs: 40, fat: 5 }],
    savedMeals: [],
    planPrefs: null,
    favs: [],
  },
}))

// Exercise the screen's event handlers and resulting element tree without native hosts.
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = harness.cursor++
    if (!(index in harness.slots)) harness.slots[index] = typeof initial === 'function' ? initial() : initial
    return [harness.slots[index], (value: unknown) => {
      harness.slots[index] = typeof value === 'function' ? value(harness.slots[index]) : value
    }]
  },
  useRef: (initial: unknown) => {
    const index = harness.cursor++
    if (!(index in harness.slots)) harness.slots[index] = { current: initial }
    return harness.slots[index]
  },
  useMemo: (factory: () => unknown) => factory(),
  useEffect: vi.fn(),
}))
vi.mock('react-native', () => ({
  Modal: 'Modal', Pressable: 'Pressable', Text: 'Text', View: 'View',
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1, absoluteFill: {} },
}))
vi.mock('@/components/ds', () => ({
  ...Object.fromEntries(['Card', 'CheckCircle', 'Chip', 'Divider', 'EmptyState', 'ErrorNote', 'Field', 'IconButton', 'LoadingBlock', 'ScreenHeader', 'ScreenScroll', 'SearchField', 'Segmented', 'Txt', 'UButton'].map((name) => [name, name])),
  useShell: () => ({ wide: false }),
}))
vi.mock('@/components/ConfirmDialog', () => ({ ConfirmDialog: 'ConfirmDialog' }))
vi.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }))
vi.mock('expo-router', () => ({ useRouter: () => ({ push: harness.push, canGoBack: () => false }) }))
vi.mock('@/lib/apiUtils', () => ({ authenticatedRequest: harness.request }))
vi.mock('@/lib/apiErrors', () => ({ showApiError: vi.fn() }))
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => ({ user: { $id: 'user', name: 'User' } }) }))
vi.mock('@/lib/MealTypePreferencesContext', () => ({ useMealTypePreferences: () => ({ selectedMealType: 'Breakfast', setSelectedMealType: vi.fn() }) }))
vi.mock('@/lib/theme/palette', () => ({ fonts: {}, usePalette: () => ({}) }))
vi.mock('@/lib/data/useLoader', () => ({ useFocusLoader: () => ({ data: harness.data, loading: false, error: null, reload: vi.fn() }) }))
vi.mock('@/lib/data/foodLog', () => ({
  entryMacros: (entry: unknown) => entry,
  foodItemFromEntry: vi.fn(), frequentFoods: () => [], listEntriesForDay: vi.fn(),
  listRecentEntries: vi.fn(), logFood: vi.fn(), removeFoodEntry: vi.fn(), updateFoodEntry: vi.fn(),
}))
vi.mock('@/lib/planPreferences', () => ({ effectiveMealNames: vi.fn(), loadPlanPreferences: vi.fn() }))
vi.mock('@/lib/data/overview', () => ({ loadTodayBudget: vi.fn() }))
vi.mock('@/lib/data/savedMeals', () => ({ listSavedMeals: vi.fn(), logSavedMeal: vi.fn(), saveMealFromEntries: vi.fn() }))
vi.mock('@/lib/foodFavorites', () => ({ loadFavoriteFoods: vi.fn(), toggleFavoriteFood: vi.fn() }))
vi.mock('@/lib/haptics', () => ({ triggerImpactHaptic: vi.fn(), triggerNotificationHaptic: vi.fn(), triggerSelectionHaptic: vi.fn() }))

type Element = { type: unknown; props: Record<string, unknown> }
type Control = Record<string, unknown> & {
  onChangeText: (text: string) => void
  onSubmit: (text: string) => void
  onPress: () => void
  accessibilityState: { expanded: boolean }
}

function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements)
  if (!node || typeof node !== 'object' || !('props' in node)) return []
  const element = node as Element
  return [element, ...elements(element.props.children)]
}

function render() {
  harness.cursor = 0
  return elements(LogFoodScreen())
}

function control(tree: Element[], type: string, label?: string): Control {
  const element = tree.find((item) => item.type === type && (!label || item.props.label === label))
  if (!element) throw new Error(`Missing ${type}: ${label ?? ''}`)
  return element.props as Control
}

function text(tree: Element[]) {
  return tree.filter((element) => element.type === 'Txt').map((element) => element.props.children).flat().join(' ').replace(/\s+/g, ' ')
}

describe('Food log search and meal breakdown', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    harness.slots = []
    harness.cursor = 0
    harness.request.mockReset()
    harness.request.mockResolvedValue({ items: [{ product_name: 'Bananas', energy_kcal_100g: 89 }] })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('shows fetched foods after typing and allows selecting them to add', async () => {
    control(render(), 'SearchField').onChangeText('bananas')
    await vi.advanceTimersByTimeAsync(300)
    const tree = render()
    expect(harness.request).toHaveBeenCalledWith('/api/fuzzy/bananas')
    expect(text(tree)).toContain('Bananas')
    expect(control(tree, 'Chip', 'Search').selected).toBe(true)
    const add = tree.find((element) => element.type === 'CheckCircle' && element.props.accessibilityLabel === 'Select Bananas')
    expect(add).toBeDefined()
    ;(add!.props.onPress as () => void)()
    const screen = render().find((element) => element.type === 'ScreenScroll')!
    expect((screen.props.footer as Element).props.label).toBe('Add 1 item to Breakfast')
    await ((screen.props.footer as Element).props.onPress as () => Promise<void>)()
    expect(logFood).toHaveBeenCalledWith('user', expect.objectContaining({ mealType: 'Breakfast', servings: 1, item: expect.objectContaining({ name: 'Bananas' }) }))
  })

  it('submits immediately and preserves results when returning from another tab', async () => {
    const search = control(render(), 'SearchField')
    search.onChangeText('bananas')
    search.onSubmit('bananas')
    await vi.advanceTimersByTimeAsync(300)
    expect(harness.request).toHaveBeenCalledTimes(1)
    control(render(), 'Chip', 'Favorites').onPress()
    control(render(), 'Chip', 'Search').onPress()
    expect(text(render())).toContain('Bananas')
  })

  it('ignores an older response after the query changes, including during debounce', async () => {
    let finishOldRequest!: (value: unknown) => void
    harness.request.mockReturnValueOnce(new Promise((resolve) => { finishOldRequest = resolve }))
    control(render(), 'SearchField').onChangeText('banana')
    await vi.advanceTimersByTimeAsync(300)
    control(render(), 'SearchField').onChangeText('oats')
    finishOldRequest({ items: [{ product_name: 'Old banana', energy_kcal_100g: 89 }] })
    await Promise.resolve()
    expect(text(render())).not.toContain('Old banana')
    control(render(), 'SearchField').onChangeText('')
    await vi.advanceTimersByTimeAsync(300)
    expect(control(render(), 'EmptyState').title).toBe('Find food to add')
    expect(harness.request).toHaveBeenCalledTimes(1)
  })

  it('shows a useful no-match state when the search returns no foods', async () => {
    harness.request.mockResolvedValue({ items: [] })
    control(render(), 'SearchField').onChangeText('unknown food')
    await vi.advanceTimersByTimeAsync(300)
    const empty = control(render(), 'EmptyState')
    expect(empty.title).toBe('No matches for “unknown food”.')
    expect(empty.actionLabel).toBe('Add this food')
  })

  it('keeps meal foods collapsed until expanded and places the breakdown after search', () => {
    const tree = render()
    expect(text(tree)).toContain('Your Breakfast')
    expect(text(tree)).not.toContain('Your day')
    expect(text(tree)).not.toContain('Porridge')
    expect(tree.findIndex((element) => element.props.testID === 'logged-today')).toBeGreaterThan(tree.findIndex((element) => element.type === 'SearchField'))
    const meal = tree.find((element) => element.type === 'Pressable' && String(element.props.accessibilityLabel).startsWith('Breakfast,'))!
    expect((meal.props.accessibilityState as { expanded: boolean }).expanded).toBe(false)
    ;(meal.props.onPress as () => void)()
    expect(text(render())).toContain('Porridge')
    expect(text(render())).toContain('240')
  })
})
