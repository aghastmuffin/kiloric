import { ProgressRing } from '@/components/ProgressRing';
import { showApiError } from '@/lib/apiErrors';
import { useAuth } from '@/lib/AuthContext';
import { getTodayMeals, listHistoricMeals, MEAL_TYPE_OPTIONS, type MealDocument, type MealType } from '@/lib/meals';
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
import { parseDisplayUnitsPreference, formatFluid, mlToFlOz } from '@/lib/units';
import { DraggableItemCard } from '@/components/DraggableItemCard';
import { useMealDragAndDrop } from '@/lib/useMealDragAndDrop';
import { calculateStreak, calculateXP } from '@/lib/gamification';
import { MacroProgressBar } from '@/components/MacroProgressBar';
import { SkeletonBlock } from '@/components/SkeletonBlock';
import { triggerSelectionHaptic, triggerNotificationHaptic } from '@/lib/haptics';
import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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
  Platform,
  UIManager,
  TouchableOpacity,
} from 'react-native';
import { MotiView, MotiText, AnimatePresence } from 'moti';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const today = new Date();
  if (isSameLocalDay(date, today)) return 'Today';
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

function macroPct(value: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, value / target);
}

const getStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [dateDirection, setDateDirection] = useState(1);
  const [profile, setProfile] = useState<ProfileDocument | null>(null);
  const [allMeals, setAllMeals] = useState<MealDocument[]>([]);
  const [waterEntries, setWaterEntries] = useState<WaterDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [waterBusy, setWaterBusy] = useState(false);
  const [waterAnimationKey, setWaterAnimationKey] = useState(0);
  const [logText, setLogText] = useState('');
  const [expandedMeals, setExpandedMeals] = useState<Set<MealType>>(new Set(MEAL_TYPE_OPTIONS));

  // Milestone Toast Banner State
  const [activeToast, setActiveToast] = useState<{ message: string; icon: string } | null>(null);
  const toastedRefs = useRef({ protein: false, hydration: false, streak: false });

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
      setAllMeals([]);
      setWaterEntries([]);
      setLoading(false);
      return;
    }

    try {
      const [nextProfile, todayMeals, historicMeals, water] = await Promise.all([
        getProfile(user.$id),
        getTodayMeals(user.$id),
        listHistoricMeals(user.$id, 100),
        listWaterEntries(user.$id, selectedDate),
      ]);
      setProfile(nextProfile);
      setAllMeals([...todayMeals, ...historicMeals]);
      setWaterEntries(water);
    } catch (err) {
      showApiError(err, 'appwrite');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, user]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const displayUnits = parseDisplayUnitsPreference(profile?.goal_plain, profile?.country);

  const selectedStart = getStartOfDay(selectedDate).getTime();
  const selectedEnd = selectedStart + 24 * 60 * 60 * 1000;

  const displayedMeals = useMemo(() => allMeals.filter((meal) => {
    const timestamp = new Date(meal.$createdAt).getTime();
    return timestamp >= selectedStart && timestamp < selectedEnd;
  }), [allMeals, selectedEnd, selectedStart]);

  const waterMl = useMemo(() => totalWaterMl(waterEntries), [waterEntries]);

  const kcalTarget = profile?.target_kcal ?? DEFAULT_KCAL_TARGET;
  const proteinTarget = profile?.target_protein ?? 0;
  const carbsTarget = profile?.target_carbs ?? 0;
  const fatTarget = profile?.target_fat ?? 0;
  const fluidTarget = profile?.daily_fluid ?? DEFAULT_FLUID_TARGET_ML;

  const shiftDay = (delta: number) => {
    setDateDirection(delta);
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
  } = useMealDragAndDrop(displayedMeals, setAllMeals as any, user?.$id, undefined, loadDashboard);

  const dailyTotals = useMemo(() => sections.reduce((acc, section) => ({
    kcal: acc.kcal + section.kcal,
    protein: acc.protein + section.protein,
    carbs: acc.carbs + section.carbs,
    fat: acc.fat + section.fat,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 }), [sections]);

  const remaining = Math.max(0, kcalTarget - dailyTotals.kcal);

  // Gamification & Streak calculations
  const streak = useMemo(() => calculateStreak(allMeals), [allMeals]);

  const xpInfo = useMemo(() => {
    const kcalHit = dailyTotals.kcal >= kcalTarget * 0.8 && dailyTotals.kcal <= kcalTarget * 1.15;
    const waterHit = waterMl >= fluidTarget;
    const proteinHit = proteinTarget > 0 && dailyTotals.protein >= proteinTarget;
    const carbsHit = carbsTarget > 0 && dailyTotals.carbs >= carbsTarget;
    const fatHit = fatTarget > 0 && dailyTotals.fat >= fatTarget;

    return calculateXP(
      displayedMeals.length,
      waterEntries.length,
      waterHit,
      kcalHit,
      proteinHit,
      carbsHit,
      fatHit
    );
  }, [displayedMeals.length, waterEntries.length, dailyTotals, waterMl, kcalTarget, fluidTarget, proteinTarget, carbsTarget, fatTarget]);

  // Toast Triggering Effects
  useEffect(() => {
    if (viewingToday) {
      // 1. Protein Target Toast
      if (proteinTarget > 0 && dailyTotals.protein >= proteinTarget && !toastedRefs.current.protein) {
        toastedRefs.current.protein = true;
        setActiveToast({ message: '🎯 Protein target hit!', icon: 'trophy' });
        triggerNotificationHaptic('success');
      }
      // 2. Hydration Complete Toast
      if (fluidTarget > 0 && waterMl >= fluidTarget && !toastedRefs.current.hydration) {
        toastedRefs.current.hydration = true;
        setActiveToast({ message: '💧 Hydration complete!', icon: 'water' });
        triggerNotificationHaptic('success');
      }
      // 3. Streak toast if streak >= 3
      if (streak >= 3 && !toastedRefs.current.streak) {
        toastedRefs.current.streak = true;
        setActiveToast({ message: `🔥 ${streak}-day streak active!`, icon: 'flame' });
        triggerNotificationHaptic('success');
      }
    }
  }, [dailyTotals.protein, proteinTarget, waterMl, fluidTarget, streak, viewingToday]);

  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => setActiveToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const handleQuickLog = () => {
    const query = logText.trim();
    router.push({
      pathname: '/(tabs)/logfood',
      params: query ? { q: query } : undefined,
    });
    setLogText('');
  };

  const handleAddWater = async (amountMl: number) => {
    if (!user?.$id || waterBusy) return;
    triggerSelectionHaptic();
    setWaterBusy(true);
    setWaterAnimationKey(prev => prev + 1); // Trigger animation on ring
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

  // Generate date dots: Last 5 days ending today
  const dateDots = useMemo(() => {
    const dots = [];
    const today = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dots.push(d);
    }
    return dots;
  }, []);

  if (authLoading || (loading && !profile && allMeals.length === 0 && waterEntries.length === 0 && user)) {
    return (
      <SafeAreaView style={[styles.safeArea, { padding: 20 }]}>
        <View style={{ gap: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <SkeletonBlock height={36} width={36} borderRadius={18} />
            <SkeletonBlock height={30} width={120} borderRadius={8} />
            <SkeletonBlock height={32} width={32} borderRadius={16} />
          </View>
          <SkeletonBlock height={14} width="100%" borderRadius={7} />
          <View style={{ alignItems: 'center', marginTop: 30 }}>
            <SkeletonBlock height={200} width={200} borderRadius={100} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
            <SkeletonBlock height={80} borderRadius={16} style={{ flex: 1 }} />
            <SkeletonBlock height={80} borderRadius={16} style={{ flex: 1 }} />
            <SkeletonBlock height={80} borderRadius={16} style={{ flex: 1 }} />
          </View>
          <SkeletonBlock height={100} borderRadius={24} style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <MotiView from={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={styles.centered}>
          <Text style={styles.signedOutTitle}>CalCount</Text>
          <Text style={styles.mutedText}>Sign in to track meals and water.</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/(tabs)/account')}>
            <Text style={styles.primaryButtonText}>Go to Account</Text>
          </Pressable>
        </MotiView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {activeToast && (
          <MotiView
            from={{ opacity: 0, translateY: -80, scale: 0.9 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            exit={{ opacity: 0, translateY: -40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.toastBanner}
          >
            <Ionicons name={activeToast.icon as any} size={22} color={colors.onAccent} style={{ marginRight: 8 }} />
            <Text style={styles.toastText}>{activeToast.message}</Text>
          </MotiView>
        )}
      </AnimatePresence>

      <MotiView from={{ opacity: 0, translateY: -10 }} animate={{ opacity: 1, translateY: 0 }} style={styles.header}>
        <Pressable style={styles.avatarContainer} onPress={() => router.push('/(tabs)/account')}>
          <Ionicons name="person" size={18} color={colors.textMuted} />
        </Pressable>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>CalCount</Text>
          {streak > 0 && (
            <MotiView
              from={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10 }}
              style={styles.streakBadge}
            >
              <Ionicons name="flame" size={16} color={colors.streakColor} />
              <Text style={[styles.streakText, { color: colors.streakColor }]}>{streak}</Text>
            </MotiView>
          )}
        </View>

        <Pressable style={styles.headerAction} onPress={() => router.push('/(tabs)/logfood')}>
          <MotiView
            from={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 8 }}
          >
            <Ionicons name="add-circle" size={32} color={colors.accent} />
          </MotiView>
        </Pressable>
      </MotiView>

      {/* Gamified XP Progress Bar */}
      <View style={styles.xpBarContainer}>
        <View style={styles.xpHeader}>
          <View style={[styles.levelBadge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.levelBadgeText, { color: colors.onAccent }]}>Lv. {xpInfo.level}</Text>
          </View>
          <Text style={styles.xpText}>{xpInfo.xpInCurrentLevel} / {xpInfo.xpNeeded} XP</Text>
        </View>
        <View style={[styles.xpTrack, { backgroundColor: colors.progressTrail }]}>
          <View style={[styles.xpFill, { width: `${(xpInfo.xpInCurrentLevel / xpInfo.xpNeeded) * 100}%`, backgroundColor: colors.xpAccent }]} />
        </View>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
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

          {/* horizontal Date Dots selection strip */}
          <View style={styles.dateDotsStrip}>
            {dateDots.map((d, index) => {
              const isSelected = isSameLocalDay(d, selectedDate);
              const dayName = d.toLocaleDateString(undefined, { weekday: 'narrow' });
              const dayNum = d.getDate();
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateDotCard,
                    isSelected && { backgroundColor: colors.accent, borderColor: colors.accent }
                  ]}
                  onPress={() => {
                    setSelectedDate(d);
                    setDateDirection(d.getTime() > selectedDate.getTime() ? 1 : -1);
                  }}
                >
                  <Text style={[styles.dateDotDayName, isSelected && { color: colors.onAccent }]}>{dayName}</Text>
                  <Text style={[styles.dateDotDayNum, isSelected && { color: colors.onAccent }]}>{dayNum}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.dateRow}>
            <Pressable onPress={() => shiftDay(-1)} hitSlop={12} style={styles.navButton}>
              <MaterialIcons name="chevron-left" size={26} color={colors.text} />
            </Pressable>
            <MotiText 
              key={selectedDate.toISOString() + "-label"}
              from={{ opacity: 0, translateY: -5 }} 
              animate={{ opacity: 1, translateY: 0 }} 
              style={styles.dateText}
            >
              {formatDayLabel(selectedDate)}
            </MotiText>
            <Pressable onPress={() => shiftDay(1)} hitSlop={12} disabled={viewingToday} style={[styles.navButton, viewingToday && { opacity: 0.3 }]}>
              <MaterialIcons
                name="chevron-right"
                size={26}
                color={colors.text}
              />
            </Pressable>
          </View>
        </View>

        <AnimatePresence exitBeforeEnter custom={dateDirection}>
          <MotiView
            key={selectedDate.toISOString()}
            from={{ opacity: 0, translateX: dateDirection * 40 }}
            animate={{ opacity: 1, translateX: 0 }}
            exit={{ opacity: 0, translateX: -dateDirection * 40 }}
            transition={{ type: 'timing', duration: 300 }}
            style={{ gap: 24 }}
          >
            <View style={[
              styles.ringContainer,
              dailyTotals.kcal >= kcalTarget * 0.8 && {
                shadowColor: colors.accent,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
              }
            ]}>
              <ProgressRing
                value={dailyTotals.kcal}
                max={kcalTarget}
                label="kcal eaten"
                size={240}
              />
              <Text style={[styles.ringRemainingValue, { color: colors.accent }]}>
                {Math.round(remaining).toLocaleString()} remaining
              </Text>
              <Text style={styles.ringTargetHint}>
                of {kcalTarget.toLocaleString()} daily target
              </Text>
            </View>

            {/* Macro Cards with gradient identity */}
            <View style={styles.macrosRow}>
              {(
                [
                  ['PROTEIN', dailyTotals.protein, proteinTarget, ['#ffb454', '#f97316']],
                  ['CARBS', dailyTotals.carbs, carbsTarget, ['#64d2ff', '#0a84ff']],
                  ['FATS', dailyTotals.fat, fatTarget, ['#b18cf8', '#5e5ce6']],
                ] as const
              ).map(([label, value, target, gradient], idx) => (
                <View key={label} style={styles.macroCard}>
                  <View style={styles.macroHeader}>
                    <Text style={styles.macroTitle}>{label}</Text>
                    <Text style={styles.macroValues}>
                      {Math.round(value)}
                      {target > 0 ? `/${target}g` : 'g'}
                    </Text>
                  </View>
                  <MacroProgressBar
                    progress={macroPct(value, target || Math.max(value, 1))}
                    gradientColors={gradient}
                  />
                </View>
              ))}
            </View>

            <View style={styles.waterSection}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitleText}>Water</Text>
                {waterEntries.length > 0 ? (
                  <Pressable onPress={handleUndoWater} disabled={waterBusy}>
                    <Text style={[styles.editLink, { color: colors.accent }]}>Undo</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.waterCard}>
                <MotiView
                  key={`water-ring-${waterAnimationKey}`}
                  from={{ scale: 0.9, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                >
                  <ProgressRing
                    value={displayUnits === 'imperial' ? mlToFlOz(waterMl) : waterMl}
                    max={displayUnits === 'imperial' ? mlToFlOz(fluidTarget) : fluidTarget}
                    label={displayUnits === 'imperial' ? "fl oz" : "ml"}
                    size={120}
                    color={colors.accent}
                  />
                </MotiView>
                <View style={styles.waterActions}>
                  <Text style={styles.waterTarget}>
                    {formatFluid(displayUnits, waterMl)} / {formatFluid(displayUnits, fluidTarget)}
                  </Text>
                  <View style={styles.waterPresets}>
                    {WATER_PRESETS_ML.map((amount) => {
                      const displayAmount = displayUnits === 'imperial' ? mlToFlOz(amount) : amount;
                      return (
                        <Pressable
                          key={amount}
                          style={({ pressed }) => [
                            styles.waterPreset,
                            { borderColor: colors.accent },
                            pressed && { backgroundColor: colors.accentSoft },
                            waterBusy && styles.disabled
                          ]}
                          disabled={waterBusy}
                          onPress={() => void handleAddWater(amount)}
                        >
                          <Text style={styles.waterPresetText}>+{displayAmount}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              </View>
            </View>

            {/* Quick-log Glassmorphism themed input card */}
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
              <Pressable style={({ pressed }) => [styles.inlineLogButton, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]} onPress={handleQuickLog}>
                <Text style={[styles.inlineLogButtonText, { color: colors.onAccent }]}>Log</Text>
              </Pressable>
            </View>

            <View style={styles.mealsSection}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitleText}>Meals</Text>
              </View>

              <View style={styles.mealsList}>
                {sections.map((section, index) => {
                  const isLast = index === MEAL_TYPE_OPTIONS.length - 1;
                  const isExpanded = expandedMeals.has(section.type);
                  const isTargetZone = dragState.targetZone === section.type && dragState.activeItem?.sourceType !== section.type;

                  return (
                    <MotiView
                      key={section.type} 
                      from={{ opacity: 0, translateY: 15 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={{ type: 'spring', damping: 14, delay: index * 100 }}
                      style={[styles.mealItemContainer, !isLast && styles.mealItemBorder]}
                      ref={(el) => { zoneRefs.current[section.type] = el; }}
                      onLayout={() => measureZone(section.type)}
                    >
                      <Pressable style={styles.mealItem} onPress={() => toggleMealExpanded(section.type)}>
                        <View style={styles.mealIconContainer}>
                          <MaterialIcons name={MEAL_ICONS[section.type]} size={22} color={colors.text} />
                        </View>
                        <View style={styles.mealInfo}>
                          <Text style={styles.mealName}>{section.type}</Text>
                          <Text style={styles.mealMacros}>
                            {Math.round(section.kcal)} kcal
                          </Text>
                        </View>
                        <View style={styles.mealExpandIcon}>
                          <MaterialIcons 
                            name={isExpanded ? "expand-less" : "expand-more"} 
                            size={24} 
                            color={colors.textMuted} 
                          />
                        </View>
                      </Pressable>
                      
                      {isExpanded && (
                        <MotiView 
                          from={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          style={styles.expandedItemsContainer}
                        >
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
                        </MotiView>
                      )}
                    </MotiView>
                  );
                })}
              </View>
            </View>
          </MotiView>
        </AnimatePresence>
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
      gap: 16,
      padding: 24,
    },
    signedOutTitle: {
      fontSize: 32,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.5,
    },
    mutedText: {
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 22,
      fontSize: 16,
    },
    primaryButton: {
      marginTop: 12,
      backgroundColor: c.accent,
      borderRadius: 24,
      paddingHorizontal: 24,
      paddingVertical: 14,
      ...Platform.select({
        ios: { shadowColor: c.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
        android: { elevation: 4 },
      })
    },
    primaryButtonText: {
      color: c.onAccent,
      fontWeight: '700',
      fontSize: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: c.background,
    },
    headerCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    avatarContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: c.text,
      letterSpacing: -0.5,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(249, 115, 22, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 3,
    },
    streakText: {
      fontSize: 13,
      fontWeight: '700',
    },
    headerAction: {
      width: 36,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    xpBarContainer: {
      paddingHorizontal: 20,
      paddingBottom: 8,
      gap: 6,
    },
    xpHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    levelBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    levelBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    xpText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textMuted,
    },
    xpTrack: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    xpFill: {
      height: '100%',
      borderRadius: 3,
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
      gap: 12,
    },
    todayText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.accent,
      letterSpacing: 1.5,
    },
    dateDotsStrip: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'center',
      marginVertical: 4,
    },
    dateDotCard: {
      width: 48,
      height: 58,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    dateDotDayName: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textMuted,
      textTransform: 'uppercase',
    },
    dateDotDayNum: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    navButton: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 20,
      padding: 4,
    },
    dateText: {
      fontSize: 24,
      fontWeight: '700',
      color: c.text,
      minWidth: 150,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    ringContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 140,
    },
    ringRemainingValue: {
      fontSize: 20,
      fontWeight: '700',
      marginTop: 8,
    },
    ringTargetHint: {
      fontSize: 13,
      color: c.textFaint,
    },
    macrosRow: {
      flexDirection: 'row',
      gap: 12,
    },
    macroCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      gap: 10,
    },
    macroHeader: {
      gap: 4,
    },
    macroTitle: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textMuted,
      letterSpacing: 0.5,
    },
    macroValues: {
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      paddingHorizontal: 4,
      marginBottom: 12,
    },
    sectionTitleText: {
      fontSize: 20,
      fontWeight: '700',
      color: c.text,
      letterSpacing: -0.5,
    },
    waterSection: {
      gap: 4,
    },
    waterCard: {
      backgroundColor: c.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.border,
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    waterActions: {
      flex: 1,
      minWidth: 160,
      gap: 16,
    },
    waterTarget: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text,
      textAlign: 'center',
    },
    waterPresets: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    waterPreset: {
      backgroundColor: c.background,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
    },
    waterPresetText: {
      color: c.accent,
      fontWeight: '700',
      fontSize: 14,
    },
    disabled: {
      opacity: 0.5,
    },
    inlineLogSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginVertical: 4,
    },
    inlineLogInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 20,
      paddingHorizontal: 16,
      height: 54,
      borderWidth: 1,
      borderColor: c.border,
    },
    inlineLogIcon: {
      marginRight: 10,
    },
    inlineLogInput: {
      flex: 1,
      fontSize: 16,
      color: c.text,
      height: '100%',
    },
    inlineLogButton: {
      borderRadius: 20,
      height: 54,
      paddingHorizontal: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    inlineLogButtonText: {
      fontSize: 16,
      fontWeight: '700',
    },
    mealsSection: {
      gap: 4,
    },
    editLink: {
      fontSize: 14,
      fontWeight: '600',
    },
    mealsList: {
      backgroundColor: c.surface,
      borderRadius: 24,
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
      gap: 12,
    },
    mealItemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    mealIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mealInfo: {
      flex: 1,
      gap: 4,
    },
    mealName: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text,
    },
    mealMacros: {
      fontSize: 13,
      color: c.textMuted,
      fontWeight: '500',
    },
    mealExpandIcon: {
      width: 32,
      alignItems: 'flex-end',
    },
    expandedItemsContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 12,
    },
    emptyTrayText: {
      textAlign: 'center',
      color: c.textMuted,
      fontStyle: 'italic',
      fontSize: 14,
      paddingVertical: 12,
    },
    dropPlaceholder: {
      minHeight: 74,
      borderWidth: 2,
      borderColor: c.accent,
      borderStyle: 'dashed',
      borderRadius: 16,
      marginVertical: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.accentSoft,
    },
    dropPlaceholderText: {
      color: c.accent,
      fontWeight: '600',
      fontSize: 14,
      marginTop: 4,
    },
    toastBanner: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 60 : 20,
      left: 20,
      right: 20,
      backgroundColor: '#10b981', // Solid beautiful emerald success green!
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 999,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
        android: { elevation: 6 },
      }),
    },
    toastText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '700',
    },
  });
