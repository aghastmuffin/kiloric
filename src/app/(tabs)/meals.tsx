import { useAuth } from '@/lib/AuthContext';
import { fetchMealItemPreview, type MealItemPreview } from '@/lib/mealItemPreview';
import {
  getTodayMeals,
  listHistoricMeals,
  MEAL_TYPE_OPTIONS,
  moveProductBetweenMeals,
  type MealDocument,
  type MealType
} from '@/lib/meals';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from "expo-router/react-navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

// ─── DraggableItemCard ────────────────────────────────────────────────────────

type DraggableItemCardProps = {
  item: DisplayMealItem;
  isLoadingItems: boolean;
  onDragStart: (item: DisplayMealItem) => void;
  onDragMove: (targetType: MealType | null) => void;
  onDragEnd: (item: DisplayMealItem, targetType: MealType | null) => void;
  findDropTarget: (x: number, y: number) => MealType | null;
};

const DraggableItemCard = memo(function DraggableItemCard({
  item,
  isLoadingItems,
  onDragStart,
  onDragMove,
  onDragEnd,
  findDropTarget,
}: DraggableItemCardProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  // Optimization: useMemo instead of useRef for Animated.Values to keep them stable and avoid render-phase .current access
  const pan = useMemo(() => new Animated.ValueXY(), []);
  const scale = useMemo(() => new Animated.Value(1), []);
  const [isDragging, setIsDragging] = useState(false);

  // Stable proxy object for PanResponder to avoid render-phase ref access
  const proxy = useMemo(() => ({
    onDragStart,
    onDragMove,
    onDragEnd,
    findDropTarget,
    item
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  useEffect(() => {
    Object.assign(proxy, { onDragStart, onDragMove, onDragEnd, findDropTarget, item });
  }, [onDragStart, onDragMove, onDragEnd, findDropTarget, item, proxy]);

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderGrant: () => {
        pan.setValue({ x: 0, y: 0 });
        setIsDragging(true);
        
        // Scale up on drag to make it feel tactile
        Animated.spring(scale, {
          toValue: 1.05,
          friction: 5,
          useNativeDriver: false
        }).start();

        proxy.onDragStart(proxy.item);
      },

      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { 
          useNativeDriver: false,
          listener: (_e, gs) => {
             const target = proxy.findDropTarget(gs.moveX, gs.moveY);
             proxy.onDragMove(target);
          }
        },
      ),

      onPanResponderRelease: (_e, gs) => {
        const target = proxy.findDropTarget(gs.moveX, gs.moveY);
        const currentItem = proxy.item;
        const isValidDrop = target !== null && target !== currentItem.sourceType;

        // Snap back scale
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: false,
        }).start();

        if (isValidDrop) {
          pan.setValue({ x: 0, y: 0 });
          setIsDragging(false);
          cbRef.current.onDragEnd(currentItem, target);
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 5,
            tension: 40,
          }).start(() => {
            setIsDragging(false);
            cbRef.current.onDragEnd(currentItem, null);
          });
        }
      },

      onPanResponderTerminate: () => {
        Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: false }).start();
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start(() => setIsDragging(false));
      },

      onPanResponderTerminationRequest: () => true,
    }),
    [pan, scale, proxy]
  );

  const hasFacts = item.facts.length > 0;

  return (
    <Animated.View
      style={[
        styles.itemCard,
        isDragging && {
          zIndex: 100,
          elevation: 12,
          opacity: 0.95,
          borderColor: colors.accent,
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
        },
        { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }] },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.itemTitle} numberOfLines={2} ellipsizeMode="tail">
          {item.title}
        </Text>
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

      <View
        {...panResponder.panHandlers}
        style={styles.dragHandle}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="reorder-two-outline" size={24} color={colors.textMuted} />
      </View>
    </Animated.View>
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
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Drag State for Visual Previews
  const [dragState, setDragState] = useState<{ activeItem: DisplayMealItem | null; targetZone: MealType | null }>({
    activeItem: null,
    targetZone: null,
  });

  const dropZones = useRef<Map<MealType, { x: number; y: number; width: number; height: number }>>(new Map()).current;
  const zoneRefs = useRef<Record<string, View | null>>({});

  const fetchMeals = useCallback(async (options?: { silent?: boolean }) => {
    if (!user?.$id) return;
    if (!options?.silent) setIsLoading(true);
    try {
      const [todayMeals, historicMeals] = await Promise.all([
        getTodayMeals(user.$id),
        listHistoricMeals(user.$id, 100),
      ]);
      setAllMeals([...todayMeals, ...historicMeals]);
    } catch (error) {
      console.warn("Failed to fetch meals", error);
    } finally {
      if (!options?.silent) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { void fetchMeals(); }, [fetchMeals]);
  useFocusEffect(useCallback(() => { void fetchMeals({ silent: true }); }, [fetchMeals]));

  const selectedStart = getStartOfDay(selectedDate).getTime();
  const selectedEnd = selectedStart + 24 * 60 * 60 * 1000;

  const displayedMeals = useMemo(() => allMeals.filter((meal) => {
    const timestamp = new Date(meal.$createdAt).getTime();
    return timestamp >= selectedStart && timestamp < selectedEnd;
  }), [allMeals, selectedEnd, selectedStart]);

  useEffect(() => {
    let cancelled = false;

    const loadItemPreviews = async () => {
      // Get all unique barcodes and their associated meal types from displayed meals.
      // If a barcode appears in multiple meals, we'll just use the type from the first occurrence
      // for the preview fetch (previews are mostly barcode-based anyway).
      const uniqueEntries = new Map<string, MealType>();
      for (const meal of displayedMeals) {
        for (const barcode of (meal.items ?? [])) {
          if (!uniqueEntries.has(barcode)) {
            uniqueEntries.set(barcode, (meal.type ?? 'Other') as MealType);
          }
        }
      }

      const missingBarcodes = Array.from(uniqueEntries.keys()).filter(b => !itemPreviews[b]);

      if (missingBarcodes.length === 0) {
        return;
      }

      setIsLoadingItems(true);
      try {
        const newPreviews = await Promise.all(
          missingBarcodes.map(async (barcode) => {
            const type = uniqueEntries.get(barcode)!;
            const preview = await fetchMealItemPreview(barcode, type);
            return [barcode, preview] as const;
          }),
        );

        if (!cancelled) {
          setItemPreviews(prev => ({
            ...prev,
            ...Object.fromEntries(newPreviews)
          }));
        }
      } catch (error) {
        console.warn('Failed to load meal item previews', error);
      } finally {
        if (!cancelled) setIsLoadingItems(false);
      }
    };

    void loadItemPreviews();
    return () => { cancelled = true; };
  }, [displayedMeals, itemPreviews]);

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
          const preview = itemPreviews[barcode] ?? {
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
            key: `${meal.$id}-${index}-${barcode}`,
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
      const next = prev.map((meal) => ({ ...meal, items: [...(meal.items ?? [])] }));

      const sourceMeal = next.find((meal) => meal.$id === item.mealId);
      if (!sourceMeal?.items) return prev;

      // Target meal must be on the same day as the source meal. Without this,
      // `next.find` below matches the *first* meal of `targetType` anywhere in
      // `allMeals` — which also holds up to 100 historic meals — so dropping an
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
      await fetchMeals({ silent: true });
    } catch (err) {
      console.warn('Failed to move item between meals', err);
      await fetchMeals({ silent: true });
    }
  }, [user, fetchMeals, showToast]);

  const measureZone = useCallback((type: MealType) => {
    const ref = zoneRefs.current[type];
    if (!ref) return;
    ref.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        dropZones.set(type, { x, y, width, height });
      }
    });
  }, [dropZones]);

  const findDropTarget = useCallback((dropX: number, dropY: number): MealType | null => {
    for (const [type, zone] of dropZones.entries()) {
      if (
        dropX >= zone.x && dropX <= zone.x + zone.width &&
        dropY >= zone.y && dropY <= zone.y + zone.height
      ) {
        return type;
      }
    }
    return null;
  }, [dropZones]);

  const handleDragStart = useCallback((item: DisplayMealItem) => {
    setScrollEnabled(false);
    setDragState({ activeItem: item, targetZone: null });
    MEAL_TYPE_OPTIONS.forEach((type) => measureZone(type));
  }, [measureZone]);

  const handleDragMove = useCallback((target: MealType | null) => {
    setDragState(prev => {
      // Only trigger a state update if the target crossed bounds to keep things performant
      if (prev.targetZone !== target) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        return { ...prev, targetZone: target };
      }
      return prev;
    });
  }, []);

  const handleDragEnd = useCallback((item: DisplayMealItem, target: MealType | null) => {
    setScrollEnabled(true);
    
    // Smooth disappearance of the preview placeholder
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setDragState({ activeItem: null, targetZone: null });

    if (target !== null && target !== item.sourceType) {
      void handleItemDropped(item, target);
    }
  }, [handleItemDropped]);

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
        scrollEnabled={scrollEnabled}
      >
        {isLoading && !isSyncing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.mutedText}>Loading meals…</Text>
          </View>
        ) : !hasItems ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="fast-food-outline" size={48} color={colors.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>No meals logged yet. Drag items to organize them or log a new meal.</Text>
          </View>
        ) : (
          sections.map((section) => {
            const isTargetZone = dragState.targetZone === section.type && dragState.activeItem?.sourceType !== section.type;

            return (
              <View
                key={section.type}
                ref={(el) => { zoneRefs.current[section.type] = el; }}
                onLayout={() => measureZone(section.type)}
                style={styles.section}
              >
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
                  {section.items.length === 0 && !isTargetZone ? (
                    <Text style={styles.emptyTrayText}>Drag items here</Text>
                  ) : (
                    section.items.map((item) => (
                      <DraggableItemCard
                        key={item.key}
                        item={item}
                        // Optimization: Only pass isLoadingItems if this specific card actually needs to show the loader.
                        // This prevents re-rendering all cards when a single new item is being fetched.
                        isLoadingItems={isLoadingItems && item.facts.length === 0}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
                        onDragEnd={handleDragEnd}
                        findDropTarget={findDropTarget}
                      />
                    ))
                  )}

                  {/* Clean Drop Preview Placement Indicator */}
                  {isTargetZone && (
                    <View style={styles.dropPlaceholder}>
                      <Ionicons name="arrow-down-circle-outline" size={24} color={colors.accent} />
                      <Text style={styles.dropPlaceholderText}>Drop to move to {section.friendlyname}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: c.border,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)' }
    }),
  },
  cardHeader: { gap: 2 },
  itemTitle: { color: c.text, fontSize: 17, fontWeight: '600', lineHeight: 22 },

  factsContainer: { backgroundColor: c.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  factLabel: { color: c.textMuted, fontSize: 14, flex: 1 },
  factValue: { color: c.text, fontSize: 14, fontWeight: '600', textAlign: 'right', flex: 1 },
  fallbackBarcodeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  fallbackBarcodeText: { color: c.textMuted, fontSize: 14 },
  dragHandle: { alignItems: 'center', marginTop: -4 },

  dropPlaceholder: {
    minHeight: 74,
    borderWidth: 2,
    borderColor: c.accent,
    borderStyle: 'dashed',
    borderRadius: 16,
    marginVertical: 4,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dropPlaceholderText: {
    color: c.accent,
    fontWeight: '600',
    fontSize: 14,
    marginTop: 4,
  },

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