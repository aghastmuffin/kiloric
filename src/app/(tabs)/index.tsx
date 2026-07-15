import { ProgressRing } from '@/components/ProgressRing';
import { showApiError } from '@/lib/apiErrors';
import { useAuth } from '@/lib/AuthContext';
import { getTodayMeals, MEAL_TYPE_OPTIONS, type MealDocument, type MealType } from '@/lib/meals';
import { getProfile, type ProfileDocument } from '@/lib/profile';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import {
  addWaterEntry,
  deleteWaterEntry,
  listWaterEntries,
  totalWaterMl,
  type WaterDocument,
} from '@/lib/water';
import { DraggableItemCard } from '@/components/DraggableItemCard';
import { useMealDragAndDrop } from '@/lib/useMealDragAndDrop';
import { useCallback, useMemo, useState } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  LayoutAnimation,
} from 'react-native';

const WATER_PRESETS_ML = [250, 350, 500] as const;
const DEFAULT_FLUID_TARGET_ML = 2500;
const DEFAULT_KCAL_TARGET = 2000;

const MEAL_ICONS: Record<MealType, keyof typeof MaterialIcons.glyphMap> = {
  Breakfast: 'bakery-dining',
  Lunch: 'lunch-dining',
  Dinner: 'dinner-dining',
  Snack: 'cookie',
  Other: 'restaurant',
};

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function sumMeals(meals: MealDocument[]) {
  return meals.reduce(
    (acc, meal) => ({
      kcal: acc.kcal + (meal.kcal ?? 0),
      protein: acc.protein + (meal.protein ?? 0),
      carbs: acc.carbs + (meal.carbs ?? 0),
      fat: acc.fat + (meal.fat ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function mealSummary(meal: MealDocument | undefined): string {
  if (!meal) return 'Nothing logged';
  const itemCount = meal.items?.length ?? 0;
  if (meal.friendlyname && meal.friendlyname !== meal.type) return meal.friendlyname;
  if (itemCount === 1) return '1 item';
  if (itemCount > 1) return `${itemCount} items`;
  return 'Logged';
}

function macroPct(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((value / target) * 100));
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [profile, setProfile] = useState<ProfileDocument | null>(null);
  const [meals, setMeals] = useState<MealDocument[]>([]);
  const [waterEntries, setWaterEntries] = useState<WaterDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [waterBusy, setWaterBusy] = useState(false);
  const [logText, setLogText] = useState('');
  const [expandedMeals, setExpandedMeals] = useState<Set<MealType>>(new Set());

  const toggleMealExpanded = (type: MealType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedMeals(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const viewingToday = isSameLocalDay(selectedDate, new Date());

  const loadDashboard = useCallback(async () => {
    if (!user?.$id) {
      setProfile(null);
      setMeals([]);
      setWaterEntries([]);
      setLoading(false);
      return;
    }

    try {
      const [nextProfile, todayMeals, water] = await Promise.all([
        getProfile(user.$id),
        // Home always shows "today" meal buckets from Appwrite; historic browsing lives on Meals.
        getTodayMeals(user.$id),
        listWaterEntries(user.$id, selectedDate),
      ]);
      setProfile(nextProfile);
      setMeals(viewingToday ? todayMeals : []);
      setWaterEntries(water);
    } catch (err) {
      showApiError(err, 'appwrite');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, user, viewingToday]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const totals = useMemo(() => sumMeals(meals), [meals]);
  const waterMl = useMemo(() => totalWaterMl(waterEntries), [waterEntries]);

  const kcalTarget = profile?.target_kcal ?? DEFAULT_KCAL_TARGET;
  const proteinTarget = profile?.target_protein ?? 0;
  const carbsTarget = profile?.target_carbs ?? 0;
  const fatTarget = profile?.target_fat ?? 0;
  const fluidTarget = profile?.daily_fluid ?? DEFAULT_FLUID_TARGET_ML;

  const remaining = Math.max(0, kcalTarget - totals.kcal);

  const mealsByType = useMemo(() => {
    const map = new Map<MealType, MealDocument>();
    for (const meal of meals) {
      const type = (meal.type ?? 'Other') as MealType;
      const existing = map.get(type);
      if (!existing || new Date(meal.$createdAt) > new Date(existing.$createdAt)) {
        map.set(type, meal);
      }
    }
    return map;
  }, [meals]);

  const shiftDay = (delta: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };

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
  } = useMealDragAndDrop(meals, setMeals as any, user?.$id, undefined, loadDashboard);

  const handleQuickLog = () => {
    const query = logText.trim();
    router.push({
      pathname: '/(tabs)/logfood',
      params: query ? { q: query } : undefined,
    });
    setLogText('');
  };

  const handleAddWater = async (amountMl: number) => {
    if (!user?.$id || waterBusy || !viewingToday) return;
    setWaterBusy(true);
    try {
      const created = await addWaterEntry(user.$id, amountMl);
      setWaterEntries((prev) => [created, ...prev]);
    } catch (err) {
      showApiError(err, 'appwrite');
    } finally {
      setWaterBusy(false);
    }
  };

  const handleUndoWater = async () => {
    if (!user?.$id || waterBusy || waterEntries.length === 0) return;
    const latest = waterEntries[0];
    setWaterBusy(true);
    try {
      await deleteWaterEntry(user.$id, latest.$id);
      setWaterEntries((prev) => prev.filter((entry) => entry.$id !== latest.$id));
    } catch (err) {
      showApiError(err, 'appwrite');
    } finally {
      setWaterBusy(false);
    }
  };

  if (authLoading || (loading && !profile && meals.length === 0 && waterEntries.length === 0 && user)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.mutedText}>Loading today…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.signedOutTitle}>CalCount</Text>
          <Text style={styles.mutedText}>Sign in to track meals and water.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/(tabs)/account')}>
            <Text style={styles.primaryButtonText}>Go to Account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.avatarContainer} onPress={() => router.push('/(tabs)/account')}>
          <Ionicons name="person" size={18} color={colors.textMuted} />
        </Pressable>
        <Text style={styles.headerTitle}>CalCount</Text>
        <Pressable style={styles.headerAction} onPress={() => router.push('/(tabs)/logfood')}>
          <Ionicons name="add-circle-outline" size={26} color={colors.accent} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        scrollEnabled={scrollEnabled}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.accent}
            onRefresh={() => {
              setRefreshing(true);
              void loadDashboard();
            }}
          />
        }
      >
        <View style={styles.dateHeader}>
          <Text style={styles.todayText}>{viewingToday ? 'TODAY' : 'DAY'}</Text>
          <View style={styles.dateRow}>
            <Pressable onPress={() => shiftDay(-1)} hitSlop={12}>
              <MaterialIcons name="chevron-left" size={24} color={colors.textMuted} />
            </Pressable>
            <Text style={styles.dateText}>{formatDayLabel(selectedDate)}</Text>
            <Pressable onPress={() => shiftDay(1)} hitSlop={12} disabled={viewingToday}>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={viewingToday ? colors.border : colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        {viewingToday ? (
          <>
            <View style={styles.ringContainer}>
              <ProgressRing
                value={totals.kcal}
                max={kcalTarget}
                label="kcal eaten"
                size={220}
              />
              <Text style={[styles.ringRemainingValue, { color: colors.accent }]}>
                {Math.round(remaining).toLocaleString()} remaining
              </Text>
              <Text style={styles.ringTargetHint}>
                of {kcalTarget.toLocaleString()} daily target
              </Text>
            </View>

            <View style={styles.macrosRow}>
              {(
                [
                  ['PROTEIN', totals.protein, proteinTarget],
                  ['CARBS', totals.carbs, carbsTarget],
                  ['FATS', totals.fat, fatTarget],
                ] as const
              ).map(([label, value, target]) => (
                <View key={label} style={styles.macroCard}>
                  <View style={styles.macroHeader}>
                    <Text style={styles.macroTitle}>{label}</Text>
                    <Text style={styles.macroValues}>
                      {Math.round(value)}
                      {target > 0 ? `/${target}g` : 'g'}
                    </Text>
                  </View>
                  <View style={styles.macroTrack}>
                    <View
                      style={[
                        styles.macroFill,
                        {
                          width: `${macroPct(value, target || Math.max(value, 1))}%`,
                          backgroundColor: colors.accent,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.waterSection}>
              <View style={styles.mealsHeader}>
                <Text style={styles.mealsTitle}>Water</Text>
                {waterEntries.length > 0 ? (
                  <Pressable onPress={handleUndoWater} disabled={waterBusy}>
                    <Text style={[styles.editLink, { color: colors.accent }]}>Undo</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.waterCard}>
                <ProgressRing
                  value={waterMl}
                  max={fluidTarget}
                  label="ml"
                  size={140}
                  color={colors.accent}
                />
                <View style={styles.waterActions}>
                  <Text style={styles.waterTarget}>
                    {waterMl} / {fluidTarget} ml
                  </Text>
                  <View style={styles.waterPresets}>
                    {WATER_PRESETS_ML.map((amount) => (
                      <Pressable
                        key={amount}
                        style={[styles.waterPreset, waterBusy && styles.disabled]}
                        disabled={waterBusy}
                        onPress={() => void handleAddWater(amount)}
                      >
                        <Text style={styles.waterPresetText}>+{amount}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.inlineLogSection}>
              <View style={styles.inlineLogInputContainer}>
                <Ionicons name="search" size={20} color={colors.textMuted} style={styles.inlineLogIcon} />
                <TextInput
                  style={styles.inlineLogInput}
                  placeholder="Search food to log…"
                  placeholderTextColor={colors.textFaint}
                  value={logText}
                  onChangeText={setLogText}
                  onSubmitEditing={handleQuickLog}
                  returnKeyType="search"
                />
              </View>
              <Pressable style={[styles.inlineLogButton, { backgroundColor: colors.accent }]} onPress={handleQuickLog}>
                <Text style={[styles.inlineLogButtonText, { color: colors.onAccent }]}>Log</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.pastDayNotice}>
            <Text style={styles.mutedText}>
              Water for this day is shown below. Meal totals for past days are on the Meals tab.
            </Text>
            <View style={styles.waterCard}>
              <ProgressRing value={waterMl} max={fluidTarget} label="ml" size={140} />
              <Text style={styles.waterTarget}>
                {waterMl} / {fluidTarget} ml
              </Text>
            </View>
            <Pressable style={styles.primaryButton} onPress={() => setSelectedDate(new Date())}>
              <Text style={styles.primaryButtonText}>Back to today</Text>
            </Pressable>
          </View>
        )}

        {viewingToday ? (
          <View style={styles.mealsSection}>
            <View style={styles.mealsHeader}>
              <Text style={styles.mealsTitle}>Today&apos;s Meals</Text>
              <Pressable onPress={() => router.push('/(tabs)/meals')}>
                <Text style={[styles.editLink, { color: colors.accent }]}>View all</Text>
              </Pressable>
            </View>

            <View style={styles.mealsList}>
              {sections.map((section, index) => {
                const meal = mealsByType.get(section.type);
                const isLast = index === MEAL_TYPE_OPTIONS.length - 1;
                const isExpanded = expandedMeals.has(section.type);
                const isTargetZone = dragState.targetZone === section.type && dragState.activeItem?.sourceType !== section.type;

                return (
                  <View 
                    key={section.type} 
                    style={[styles.mealItemContainer, !isLast && styles.mealItemBorder]}
                    ref={(el) => { zoneRefs.current[section.type] = el; }}
                    onLayout={() => measureZone(section.type)}
                  >
                    <Pressable style={styles.mealItem} onPress={() => toggleMealExpanded(section.type)}>
                      <View style={styles.mealIconContainer}>
                        <MaterialIcons name={MEAL_ICONS[section.type]} size={20} color={colors.textMuted} />
                      </View>
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealName}>{section.type}</Text>
                        <Text style={styles.mealDesc}>{mealSummary(meal)}</Text>
                      </View>
                      <View style={styles.mealStats}>
                        <Text style={styles.mealKcal}>{Math.round(section.kcal ?? 0)}</Text>
                        <Text style={styles.mealUnit}>KCAL</Text>
                      </View>
                      <MaterialIcons 
                        name={isExpanded ? "expand-less" : "expand-more"} 
                        size={24} 
                        color={colors.textMuted} 
                        style={{ marginLeft: 8 }}
                      />
                    </Pressable>
                    {isExpanded && (
                      <View style={styles.expandedItemsContainer}>
                        {section.items.length === 0 && !isTargetZone ? (
                          <Text style={styles.emptyTrayText}>No items here yet.</Text>
                        ) : (
                          section.items.map((item) => (
                            <DraggableItemCard
                              key={item.key}
                              item={item}
                              isLoadingItems={isLoadingItems && item.facts.length === 0}
                              onDragStart={handleDragStart}
                              onDragMove={handleDragMove}
                              onDragEnd={handleDragEnd}
                              findDropTarget={findDropTarget}
                            />
                          ))
                        )}
                        {isTargetZone && (
                          <View style={styles.dropPlaceholder}>
                            <Ionicons name="arrow-down-circle-outline" size={24} color={colors.accent} />
                            <Text style={styles.dropPlaceholderText}>Drop to move to {section.friendlyname}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      padding: 24,
    },
    signedOutTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: c.text,
    },
    mutedText: {
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
    primaryButton: {
      marginTop: 8,
      backgroundColor: c.accent,
      borderRadius: 12,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    primaryButtonText: {
      color: c.onAccent,
      fontWeight: '600',
      fontSize: 15,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      backgroundColor: c.background,
    },
    avatarContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surfaceAlt,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '600',
      color: c.text,
    },
    headerAction: {
      width: 32,
      alignItems: 'flex-end',
    },
    screen: {
      flex: 1,
    },
    content: {
      padding: 20,
      gap: 24,
      paddingBottom: 40,
    },
    dateHeader: {
      alignItems: 'center',
      gap: 4,
    },
    todayText: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textMuted,
      letterSpacing: 1,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dateText: {
      fontSize: 22,
      fontWeight: '600',
      color: c.text,
      minWidth: 140,
      textAlign: 'center',
    },
    ringContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    ringRemainingValue: {
      fontSize: 17,
      fontWeight: '600',
      marginTop: 4,
    },
    ringTargetHint: {
      fontSize: 12,
      color: c.textFaint,
    },
    macrosRow: {
      flexDirection: 'row',
      gap: 12,
    },
    macroCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: c.border,
      gap: 8,
    },
    macroHeader: {
      gap: 4,
    },
    macroTitle: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textMuted,
    },
    macroValues: {
      fontSize: 11,
      fontWeight: '600',
      color: c.text,
    },
    macroTrack: {
      height: 6,
      backgroundColor: c.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    macroFill: {
      height: '100%',
      borderRadius: 3,
    },
    waterSection: {
      gap: 12,
    },
    waterCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    waterActions: {
      flex: 1,
      minWidth: 160,
      gap: 12,
    },
    waterTarget: {
      fontSize: 15,
      fontWeight: '600',
      color: c.text,
      textAlign: 'center',
    },
    waterPresets: {
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    waterPreset: {
      backgroundColor: c.accentSoft,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    waterPresetText: {
      color: c.accent,
      fontWeight: '700',
      fontSize: 14,
    },
    disabled: {
      opacity: 0.5,
    },
    pastDayNotice: {
      gap: 16,
      alignItems: 'center',
    },
    inlineLogSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    inlineLogInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceAlt,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 48,
      borderWidth: 1,
      borderColor: c.border,
    },
    inlineLogIcon: {
      marginRight: 8,
    },
    inlineLogInput: {
      flex: 1,
      fontSize: 15,
      color: c.text,
      height: '100%',
    },
    inlineLogButton: {
      borderRadius: 12,
      height: 48,
      paddingHorizontal: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inlineLogButtonText: {
      fontSize: 15,
      fontWeight: '600',
    },
    mealsSection: {
      gap: 12,
    },
    mealsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingHorizontal: 4,
    },
    mealsTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: c.text,
    },
    editLink: {
      fontSize: 13,
      fontWeight: '500',
    },
    mealsList: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    mealItemContainer: {
      flexDirection: 'column',
    },
    mealItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    expandedItemsContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 8,
    },
    emptyTrayText: {
      textAlign: 'center',
      color: c.textMuted,
      fontStyle: 'italic',
      fontSize: 13,
      paddingVertical: 12,
    },
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
    mealItemBorder: {
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    mealIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    mealInfo: {
      flex: 1,
    },
    mealName: {
      fontSize: 17,
      color: c.text,
    },
    mealDesc: {
      fontSize: 15,
      color: c.textMuted,
    },
    mealStats: {
      alignItems: 'flex-end',
    },
    mealKcal: {
      fontSize: 17,
      fontWeight: '600',
      color: c.text,
    },
    mealUnit: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textMuted,
    },
  });
