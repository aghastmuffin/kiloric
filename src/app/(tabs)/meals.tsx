import { SwipeableRow } from '@/components/SwipeableRow';
import { useAuth } from '@/lib/AuthContext';
import { fetchMealItemPreview, type MealItemPreview } from '@/lib/mealItemPreview';
import {
  getTodayMeals,
  listHistoricMeals,
  MEAL_TYPE_OPTIONS,
  moveProductBetweenMeals,
  removeProductFromMeal,
  type MealDocument,
  type MealType
} from '@/lib/meals';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const getStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

type DisplayMealItem = MealItemPreview & {
  key: string;
  mealId: string;
  sourceType: MealType;
};

type DisplayMealSection = {
  type: MealType;
  friendlyname: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  items: DisplayMealItem[];
};

const FactRow = memo(function FactRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.factRow}>
      <Text style={styles.factLabel} numberOfLines={1} ellipsizeMode="tail">{label}</Text>
      <Text style={styles.factValue} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
    </View>
  );
});

function formatSectionMacros(kcal: number, protein: number, carbs: number, fat: number) {
  return `${Math.round(kcal)} kcal · ${Math.round(protein)}g P · ${Math.round(carbs)}g C · ${Math.round(fat)}g F`;
}

type SwipeableItemCardProps = {
  item: DisplayMealItem;
  isLoadingItems: boolean;
  actionsEnabled: boolean;
  onDelete: (item: DisplayMealItem) => void;
  onMove: (item: DisplayMealItem) => void;
};

const SwipeableItemCard = memo(function SwipeableItemCard({
  item,
  isLoadingItems,
  actionsEnabled,
  onDelete,
  onMove,
}: SwipeableItemCardProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  const hasFacts = item.facts.length > 0;

  const card = (
    <View style={styles.itemCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.itemTitle} numberOfLines={2} ellipsizeMode="tail">
          {item.title}
        </Text>
        {actionsEnabled && <Ionicons name="swap-horizontal-outline" size={18} color={colors.textFaint} />}
      </View>

      <View style={styles.factsContainer}>
        {hasFacts ? (
          item.facts.map((fact) => (
            <FactRow key={`${item.key}-${fact.label}`} label={fact.label} value={fact.value} />
          ))
        ) : isLoadingItems ? (
          <View style={styles.fallbackBarcodeContainer}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.fallbackBarcodeText}>Loading product…</Text>
          </View>
        ) : (
          <View style={styles.fallbackBarcodeContainer}>
            <Ionicons name="barcode-outline" size={16} color={colors.textMuted} />
            <Text style={styles.fallbackBarcodeText}>Barcode: {item.barcode}</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (!actionsEnabled) return card;

  return (
    <SwipeableRow
      swipeRight={{
        label: 'Delete',
        icon: 'trash-outline',
        destructive: true,
        onPress: () => onDelete(item),
      }}
      swipeLeft={{
        label: 'Move',
        icon: 'arrow-forward-circle-outline',
        onPress: () => onMove(item),
      }}
    >
      {card}
    </SwipeableRow>
  );
});

// ─── MealsScreen ─────────────────────────────────────────────────────────────

export default function MealsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);

  const bottomOffset = insets.bottom + 18;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [allMeals, setAllMeals] = useState<MealDocument[]>([]);
  const [itemPreviews, setItemPreviews] = useState<Record<string, MealItemPreview>>({});

  // Use a ref to always have access to the latest itemPreviews state
  // without triggering useEffect re-runs or creating stale closures
  const itemPreviewsRef = useRef(itemPreviews);
  useEffect(() => {
    itemPreviewsRef.current = itemPreviews;
  }, [itemPreviews]);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [moveItem, setMoveItem] = useState<DisplayMealItem | null>(null);

  const fetchMeals = useCallback(async () => {
    if (!user?.$id) return;
    setIsLoading(true);
    try {
      const [todayMeals, historicMeals] = await Promise.all([
        getTodayMeals(user.$id),
        listHistoricMeals(user.$id, 100),
      ]);
      setAllMeals([...todayMeals, ...historicMeals]);
    } catch (error) {
      console.warn("Failed to fetch meals", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { void fetchMeals(); }, [fetchMeals]);
  useFocusEffect(useCallback(() => { void fetchMeals(); }, [fetchMeals]));

  const selectedStart = getStartOfDay(selectedDate).getTime();
  const selectedEnd = selectedStart + 24 * 60 * 60 * 1000;
  const actionsEnabled = selectedStart === getStartOfDay(new Date()).getTime();

  const displayedMeals = useMemo(() => allMeals.filter((meal) => {
    const timestamp = new Date(meal.$createdAt).getTime();
    return timestamp >= selectedStart && timestamp < selectedEnd;
  }), [allMeals, selectedEnd, selectedStart]);

  useEffect(() => {
    let cancelled = false;

    const loadItemPreviews = async () => {
      const entries: { cacheKey: string; barcode: string; type: MealType }[] = [];

      for (const meal of displayedMeals) {
        for (const [index, barcode] of (meal.items ?? []).entries()) {
          entries.push({
            cacheKey: `${meal.$id}-${index}-${barcode}`,
            barcode,
            type: (meal.type ?? 'Other') as MealType,
          });
        }
      }

      if (entries.length === 0) {
        // Keep previously cached previews to enable instant back-and-forth date rendering
        return;
      }

      // Performance Optimization (Cache-First Incremental Loading):
      // Only fetch previews that are not already present in the local component state.
      // This completely avoids redundant API queries and Promise.all micro-tasks
      // on already-loaded items when the list changes (e.g. after moving an item or date shifts).
      const missingEntries = entries.filter((e) => !itemPreviewsRef.current[e.cacheKey]);

      if (missingEntries.length === 0) {
        // All displayed items are already cached in state, no need to show loading or fetch
        return;
      }

      setIsLoadingItems(true);
      try {
        const previews = await Promise.all(
          missingEntries.map(async ({ cacheKey, barcode, type }) => {
            const preview = await fetchMealItemPreview(barcode, type);
            return [cacheKey, preview] as const;
          }),
        );

        if (!cancelled) {
          setItemPreviews((prev) => {
            const next = { ...prev };
            for (const [key, val] of previews) {
              next[key] = val;
            }
            return next;
          });
        }
      } catch (error) {
        console.warn('Failed to load meal item previews', error);
      } finally {
        if (!cancelled) setIsLoadingItems(false);
      }
    };

    void loadItemPreviews();
    return () => { cancelled = true; };
  }, [displayedMeals]);

  const sections = useMemo<DisplayMealSection[]>(() => {
    return MEAL_TYPE_OPTIONS.map((type) => {
      const mealsForType = displayedMeals.filter((meal) => meal.type === type);
      const friendlyname = mealsForType[0]?.friendlyname || type;

      const totals = mealsForType.reduce((acc, meal) => ({
        kcal: acc.kcal + (meal.kcal || 0),
        protein: acc.protein + (meal.protein || 0),
        carbs: acc.carbs + (meal.carbs || 0),
        fat: acc.fat + (meal.fat || 0),
      }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

      const items: DisplayMealItem[] = [];
      for (const meal of mealsForType) {
        for (const [index, barcode] of (meal.items ?? []).entries()) {
          const cacheKey = `${meal.$id}-${index}-${barcode}`;
          const preview = itemPreviews[cacheKey] ?? {
            barcode,
            title: `Barcode: ${barcode}`,
            facts: [],
            kcal: null,
            protein: null,
            carbs: null,
            fat: null,
          };

          items.push({
            ...preview,
            key: cacheKey,
            mealId: meal.$id,
            sourceType: type,
          });
        }
      }

      return { type, friendlyname, ...totals, items };
    });
  }, [displayedMeals, itemPreviews]);

  const dailyTotals = useMemo(() => sections.reduce((acc, section) => ({
    kcal: acc.kcal + section.kcal,
    protein: acc.protein + section.protein,
    carbs: acc.carbs + section.carbs,
    fat: acc.fat + section.fat,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }), [sections]);

  const hasItems = sections.some((section) => section.items.length > 0);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleForceSync = async () => {
    setIsSyncing(true);
    await fetchMeals();
    setIsSyncing(false);
  };

  const shiftDate = (days: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const handleItemDropped = useCallback(async (item: DisplayMealItem, targetType: MealType) => {
    if (!user?.$id || item.sourceType === targetType) return;

    // Smoother layout transitions with spring
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);

    setAllMeals((prev) => {
      const next: MealDocument[] = prev.map((meal) => ({
        ...meal,
        items: [...(meal.items ?? [])],
      }));

      const sourceMeal = next.find((meal) => meal.$id === item.mealId);
      if (!sourceMeal?.items) return prev;

      // Target meal must be on the same day as the source meal. Without this,
      // `next.find` below matches the *first* meal of `targetType` anywhere in
      // `allMeals` — which also holds up to 100 historic meals — so moving an
      // item into a section that has no meal today (e.g. "Lunch" before you've
      // logged lunch) could silently attach it to some past day's Lunch instead
      // of creating today's, making the item disappear from the current view.
      const dayStart = getStartOfDay(new Date(sourceMeal.$createdAt)).getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const barcodeIndex = sourceMeal.items.indexOf(item.barcode);
      if (barcodeIndex === -1) return prev;

      sourceMeal.items.splice(barcodeIndex, 1);
      sourceMeal.kcal = Math.max(0, (sourceMeal.kcal ?? 0) - (item.kcal ?? 0));
      sourceMeal.protein = Math.max(0, (sourceMeal.protein ?? 0) - (item.protein ?? 0));
      sourceMeal.carbs = Math.max(0, (sourceMeal.carbs ?? 0) - (item.carbs ?? 0));
      sourceMeal.fat = Math.max(0, (sourceMeal.fat ?? 0) - (item.fat ?? 0));

      if (sourceMeal.items.length === 0) {
        const sourceIndex = next.findIndex((meal) => meal.$id === sourceMeal.$id);
        if (sourceIndex !== -1) next.splice(sourceIndex, 1);
      }

      const targetMeal = next.find((meal) => {
        if (meal.type !== targetType) return false;
        const ts = new Date(meal.$createdAt).getTime();
        return ts >= dayStart && ts < dayEnd;
      });
      if (targetMeal) {
        targetMeal.items = [...(targetMeal.items ?? []), item.barcode];
        targetMeal.kcal = (targetMeal.kcal ?? 0) + (item.kcal ?? 0);
        targetMeal.protein = (targetMeal.protein ?? 0) + (item.protein ?? 0);
        targetMeal.carbs = (targetMeal.carbs ?? 0) + (item.carbs ?? 0);
        targetMeal.fat = (targetMeal.fat ?? 0) + (item.fat ?? 0);
        targetMeal.type = targetType;
        targetMeal.friendlyname = targetType;
      } else {
        next.push({
          $id: `optimistic-${item.barcode}-${Date.now()}`,
          $sequence: '0',
          $createdAt: new Date().toISOString(),
          $updatedAt: new Date().toISOString(),
          $permissions: [],
          $databaseId: '',
          $collectionId: '',
          owner: user.$id,
          friendlyname: targetType,
          type: targetType,
          kcal: item.kcal,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          items: [item.barcode],
        } as MealDocument);
      }

      return next;
    });

    showToast(`Moved to ${targetType}`);

    try {
      await moveProductBetweenMeals(
        user.$id,
        item.mealId,
        item.barcode,
        targetType,
        {
          kcal: item.kcal,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        },
      );
      await fetchMeals();
    } catch (err) {
      console.warn('Failed to move item between meals', err);
      await fetchMeals();
    }
  }, [user, fetchMeals, showToast]);

  const handleDeleteItem = useCallback((item: DisplayMealItem) => {
    Alert.alert(
      'Delete meal item?',
      `${item.title} will be removed from ${item.sourceType}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await removeProductFromMeal(item.mealId, item.barcode, {
                  kcal: item.kcal,
                  protein: item.protein,
                  carbs: item.carbs,
                  fat: item.fat,
                });
                await fetchMeals();
                showToast('Meal item deleted');
              } catch (error) {
                console.warn('Failed to delete meal item', error);
                await fetchMeals();
                Alert.alert('Unable to delete item', 'Please try again.');
              }
            })();
          },
        },
      ],
    );
  }, [fetchMeals, showToast]);

  const formatDateLabel = (date: Date) => {
    const today = getStartOfDay(new Date());
    if (date.getTime() === today.getTime()) return "Today";
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  function getSectionIcon(type: MealType): keyof typeof Ionicons.glyphMap {
    switch (type) {
      case 'Breakfast': return 'sunny-outline';
      case 'Lunch': return 'restaurant-outline';
      case 'Dinner': return 'moon-outline';
      case 'Snack': return 'cafe-outline';
      default: return 'help-circle-outline';
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {toastMessage && (
        <Animated.View style={[styles.toastContainer, { top: insets.top + 10 }]}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <View style={styles.header}>
        <View style={styles.calendarStrip}>
          <TouchableOpacity style={styles.navButton} onPress={() => shiftDate(-1)}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.dateLabel}>{formatDateLabel(selectedDate)}</Text>
          {getStartOfDay(selectedDate) < getStartOfDay(new Date()) ? (
            <TouchableOpacity style={styles.navButton} onPress={() => shiftDate(1)}>
              <Ionicons name="chevron-forward" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity disabled style={styles.navButton} onPress={() => shiftDate(1)}>
              <Ionicons name="chevron-forward" size={24} color={colors.textFaint} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{Math.round(dailyTotals.kcal)}</Text>
          <Text style={styles.summaryLabel}>kcal</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{Math.round(dailyTotals.protein)}g</Text>
          <Text style={styles.summaryLabel}>Protein</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{Math.round(dailyTotals.carbs)}g</Text>
          <Text style={styles.summaryLabel}>Carbs</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{Math.round(dailyTotals.fat)}g</Text>
          <Text style={styles.summaryLabel}>Fat</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading && !isSyncing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.mutedText}>Loading meals…</Text>
          </View>
        ) : !hasItems ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="fast-food-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>No meals logged yet. Log a meal to see it here.</Text>
          </View>
        ) : (
          sections.map((section) => (
              <View key={section.type} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name={getSectionIcon(section.type)} size={20} color={colors.accent} />
                    <Text style={styles.sectionTitle}>{section.friendlyname}</Text>
                  </View>
                  <Text style={styles.sectionMacros}>
                    {formatSectionMacros(section.kcal, section.protein, section.carbs, section.fat)}
                  </Text>
                </View>

                <View style={styles.itemsTray}>
                  {section.items.length === 0 ? (
                    <Text style={styles.emptyTrayText}>No items</Text>
                  ) : (
                    section.items.map((item) => (
                      <SwipeableItemCard
                        key={item.key}
                        item={item}
                        actionsEnabled={actionsEnabled}
                        isLoadingItems={isLoadingItems && item.facts.length === 0}
                        onDelete={handleDeleteItem}
                        onMove={setMoveItem}
                      />
                    ))
                  )}
                </View>
              </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={moveItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMoveItem(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setMoveItem(null)}>
          <Pressable style={styles.moveSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.moveSheetHeader}>
              <View style={styles.moveSheetTitleGroup}>
                <Text style={styles.moveSheetEyebrow}>MOVE ITEM</Text>
                <Text style={styles.moveSheetTitle} numberOfLines={1}>{moveItem?.title}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close move menu"
                hitSlop={8}
                onPress={() => setMoveItem(null)}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.moveOptions}>
              {MEAL_TYPE_OPTIONS.filter((type) => type !== moveItem?.sourceType).map((type) => (
                <Pressable
                  key={type}
                  accessibilityRole="button"
                  onPress={() => {
                    const item = moveItem;
                    setMoveItem(null);
                    if (item) void handleItemDropped(item, type);
                  }}
                  style={({ pressed }) => [styles.moveOption, pressed && styles.moveOptionPressed]}
                >
                  <Ionicons name={getSectionIcon(type)} size={20} color={colors.accent} />
                  <Text style={styles.moveOptionText}>{type}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Pressable
        accessibilityRole="button"
        onPress={handleForceSync}
        disabled={isSyncing}
        style={({ pressed }) => [
          styles.floatingSyncButton,
          { bottom: bottomOffset },
          pressed && styles.floatingSyncButtonPressed,
          isSyncing && styles.floatingSyncButtonDisabled,
        ]}
      >
        {isSyncing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.floatingSyncButtonText}>Syncing...</Text>
          </View>
        ) : (
          <>
            <Ionicons name="sync-outline" size={24} color={colors.accent} />
            <Text style={styles.floatingSyncButtonText}>Refresh Meals</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    backgroundColor: c.surface,
  },
  calendarStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navButton: { padding: 8 },
  dateLabel: { fontSize: 18, fontWeight: 'bold', color: c.text, minWidth: 120, textAlign: 'center' },

  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: c.surface,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: c.text },
  summaryLabel: { fontSize: 12, color: c.textMuted, marginTop: 4 },

  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 110, gap: 24 },
  centered: { alignItems: 'center', gap: 12, paddingVertical: 64 },
  mutedText: { color: c.textMuted, fontSize: 15 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyText: { color: c.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  emptyTrayText: { textAlign: 'center', color: c.textMuted, fontStyle: 'italic', fontSize: 13, marginVertical: 12 },

  section: { gap: 14 },
  sectionHeader: {
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingBottom: 8,
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
  sectionMacros: { color: c.accent, fontSize: 14, fontWeight: '600' },
  itemsTray: { minHeight: 50, justifyContent: 'center' },

  itemCard: {
    backgroundColor: c.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.borderStrong,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)' }
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  itemTitle: { color: c.text, fontSize: 17, fontWeight: '600', lineHeight: 22 },

  factsContainer: { backgroundColor: c.accentSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  factLabel: { color: c.textMuted, fontSize: 14, flex: 1 },
  factValue: { color: c.text, fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1 },
  fallbackBarcodeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  fallbackBarcodeText: { color: c.textMuted, fontSize: 14 },

  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: c.overlay,
  },
  moveSheet: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    padding: 18,
    borderRadius: 16,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderStrong,
  },
  moveSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  moveSheetTitleGroup: { flex: 1, gap: 3 },
  moveSheetEyebrow: { color: c.success, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  moveSheetTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
  moveOptions: { gap: 8 },
  moveOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.border,
  },
  moveOptionPressed: { backgroundColor: c.accentSoft },
  moveOptionText: { flex: 1, color: c.text, fontSize: 15, fontWeight: '600' },

  floatingSyncButton: {
    position: 'absolute', right: 16, height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: 20, gap: 8, zIndex: 40,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)' }
    }),
  },
  floatingSyncButtonPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  floatingSyncButtonDisabled: { opacity: 0.6 },
  floatingSyncButtonText: { color: c.accent, fontSize: 16, fontWeight: '600' },

  toastContainer: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#2ecc71',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 9999,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
      android: { elevation: 10 },
      web: { boxShadow: '0px 4px 6px rgba(0,0,0,0.3)' }
    })
  },
  toastText: { color: '#fff', fontWeight: '600', marginLeft: 8, fontSize: 14 },
});