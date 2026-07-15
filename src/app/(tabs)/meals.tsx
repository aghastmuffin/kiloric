import { useAuth } from '@/lib/AuthContext';
import {
  getTodayMeals,
  listHistoricMeals,
  type MealDocument,
  type MealType
} from '@/lib/meals';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useMealDragAndDrop } from '@/lib/useMealDragAndDrop';
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

type DisplayMealSection = {
  type: MealType;
  friendlyname: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  items: DisplayMealItem[];
};

import { DraggableItemCard, type DisplayMealItem } from '@/components/DraggableItemCard';

function formatSectionMacros(kcal: number, protein: number, carbs: number, fat: number) {
  return `${Math.round(kcal)} kcal · ${Math.round(protein)}g P · ${Math.round(carbs)}g C · ${Math.round(fat)}g F`;
}

export default function MealsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);

  const bottomOffset = insets.bottom + 18;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [allMeals, setAllMeals] = useState<MealDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

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

  const displayedMeals = useMemo(() => allMeals.filter((meal) => {
    const timestamp = new Date(meal.$createdAt).getTime();
    return timestamp >= selectedStart && timestamp < selectedEnd;
  }), [allMeals, selectedEnd, selectedStart]);

  const {
    sections,
    isLoadingItems,
    scrollEnabled,
    dragState,
    zoneRefs,
    measureZone,
    findDropTarget,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = useMealDragAndDrop(displayedMeals, setAllMeals, user?.$id, showToast, fetchMeals);

  const dailyTotals = useMemo(() => sections.reduce((acc, section) => ({
    kcal: acc.kcal + section.kcal,
    protein: acc.protein + section.protein,
    carbs: acc.carbs + section.carbs,
    fat: acc.fat + section.fat,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }), [sections]);

  const hasItems = sections.some((section) => section.items.length > 0);

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