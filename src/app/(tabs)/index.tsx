import RadialGauge from "@/components/Gague";
import { useAuth } from "@/lib/AuthContext";
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { useRouter } from 'expo-router'; // Removed unused 'useTheme'
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function Dial() {
    // 1. Move hook inside the component
    const { user } = useAuth();
    const [currentValue, setCurrentValue] = useState(0);

    return (
        <View>
            {/* Now 'user' will be correctly populated from context */}
            {user?.$id ? (
                <RadialGauge value={currentValue} max={100} />
            ) : null}
        </View>
    );
}

export default function AboutScreen() {
    const router = useRouter();
    const styles = useThemedStyles(makeStyles);
    const PlaceholderImage = require('../../../assets/images/dark.svg');

    return (
        <View style={styles.container}>
            <View style={styles.infoholder}>
                <View style={styles.infoholderItem}>
                    <Dial />
                </View>
            </View>
            <Text style={styles.text}>Welcome to CalCount</Text>

            <Pressable onPress={() => router.push('/scan')}>
                <Text style={styles.text}>Scan</Text>
            </Pressable>

            <Pressable onPress={() => router.push('/text_query')}>
                <Text style={styles.text}>Text Query</Text>
import type { ThemeColors } from '@/lib/theme/tokens';
import Svg, { Circle } from 'react-native-svg';
import { useAuth } from '@/lib/AuthContext';
import { getProfile } from '@/lib/profile';
import { getTodayMeals } from '@/lib/meals';
import type { MealDocument } from '@/lib/meals';
import { showApiError } from '@/lib/apiErrors';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { panelTiming } from '@/lib/motion';

type DailyData = {
  kcal: number
  protein: number
  carbs: number
  fat: number
  targetKcal: number
  targetProtein: number
  targetCarbs: number
  targetFat: number
}

const EMPTY_DATA: DailyData = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  targetKcal: 2000,
  targetProtein: 125,
  targetCarbs: 225,
  targetFat: 67,
}

function AnimatedMacroFill({ progress }: { progress: number }) {
  const styles = useThemedStyles(makeStyles);
  const width = useSharedValue(0);

  React.useEffect(() => {
    width.value = withTiming(progress, panelTiming);
  }, [progress, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${Math.min(Math.max(width.value, 0), 1) * 100}%`,
  }));

  return <Animated.View style={[styles.macroFill, animatedStyle]} />;
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user } = useAuth();
  const router = useRouter();

  const [data, setData] = useState<DailyData>(EMPTY_DATA);
  const [username, setUsername] = useState<string | null>(null);
  const [mealsList, setMealsList] = useState<MealDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.$id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [profile, meals] = await Promise.all([
        getProfile(user.$id),
        getTodayMeals(user.$id),
      ]);
      const totals = meals.reduce(
        (sum, meal) => ({
          kcal: sum.kcal + (meal.kcal ?? 0),
          protein: sum.protein + (meal.protein ?? 0),
          carbs: sum.carbs + (meal.carbs ?? 0),
          fat: sum.fat + (meal.fat ?? 0),
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      );
      setData({
        ...totals,
        targetKcal: profile?.target_kcal ?? EMPTY_DATA.targetKcal,
        targetProtein: profile?.target_protein ?? EMPTY_DATA.targetProtein,
        targetCarbs: profile?.target_carbs ?? EMPTY_DATA.targetCarbs,
        targetFat: profile?.target_fat ?? EMPTY_DATA.targetFat,
      });
      setUsername(profile?.username ?? null);
      setMealsList(meals);
    } catch (error) {
      showApiError(error, 'appwrite');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#f97316" />
        <Text style={styles.mutedText}>Loading dashboard…</Text>
      </View>
    );
  }

  const calorieRemaining = Math.max(0, data.targetKcal - data.kcal);
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const ringProgress = data.targetKcal > 0 ? Math.min(data.kcal / data.targetKcal, 1) : 0;
  const strokeDashoffset = 628 - (628 * ringProgress);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBaO8LDY5B9YKrvDGmaYMonvt5i6aURvvEiGvpm1c-6Q-boaR_P0xlsgxDpkTS0Hjlq-9S2Q2KK1uZB-VC62STJ4Q7EM3T7qscgBHIMsH0apY630M0NONVwhStDGoX4pesyfBAmunZO0GYC9gzpdZF6tj771xjop6A8jTzRY90NkNxPT2xqB2EZeUHeT7iB-cFfdyt71krajVtz8Fv0UXa9GU3I-I6_IbaNMtyPnU7T_y3avPhNvQgURkVV-Xt-ZNSH1WoKIltTEgMW' }}
            style={styles.avatar}
          />
        </View>
        <Text style={styles.headerTitle}>CalCount</Text>
        <View style={styles.streakContainer}>
          <Text style={styles.streakText}>7</Text>
          <MaterialIcons name="local-fire-department" size={20} color="#f97316" />
        </View>
      </View>

      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.dateHeader}>
          <Text style={styles.todayText}>TODAY</Text>
          <View style={styles.dateRow}>
            <MaterialIcons name="chevron-left" size={24} color={colors.textMuted} />
            <Text style={styles.dateText}>{dateLine}</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
          </View>
        </View>

        <View style={styles.ringContainer}>
          <Svg width="240" height="240" viewBox="0 0 240 240" style={styles.ringSvg}>
            <Circle cx="120" cy="120" r="100" stroke={colors.border} strokeWidth="8" fill="none" />
            <Circle 
              cx="120" cy="120" r="100" 
              stroke="#f97316" strokeWidth="8" fill="none" 
              strokeDasharray="628" strokeDashoffset={strokeDashoffset} strokeLinecap="round" 
            />
          </Svg>
          <View style={styles.ringCenterText}>
            <Text style={styles.ringValue}>{Math.round(data.kcal)}</Text>
            <Text style={styles.ringLabel}>kcal eaten</Text>
            <View style={styles.ringRemainingContainer}>
              <Text style={styles.ringRemainingValue}>{Math.round(calorieRemaining)}</Text>
              <Text style={styles.ringRemainingLabel}>REMAINING</Text>
            </View>
          </View>
        </View>

        <View style={styles.macrosRow}>
          <View style={styles.macroCard}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroTitle}>PROTEIN</Text>
              <Text style={styles.macroValues}>{Math.round(data.protein)}/{Math.round(data.targetProtein)}g</Text>
            </View>
            <View style={styles.macroTrack}>
              <AnimatedMacroFill progress={data.targetProtein > 0 ? data.protein / data.targetProtein : 0} />
            </View>
          </View>
          <View style={styles.macroCard}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroTitle}>CARBS</Text>
              <Text style={styles.macroValues}>{Math.round(data.carbs)}/{Math.round(data.targetCarbs)}g</Text>
            </View>
            <View style={styles.macroTrack}>
              <AnimatedMacroFill progress={data.targetCarbs > 0 ? data.carbs / data.targetCarbs : 0} />
            </View>
          </View>
          <View style={styles.macroCard}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroTitle}>FATS</Text>
              <Text style={styles.macroValues}>{Math.round(data.fat)}/{Math.round(data.targetFat)}g</Text>
            </View>
            <View style={styles.macroTrack}>
              <AnimatedMacroFill progress={data.targetFat > 0 ? data.fat / data.targetFat : 0} />
            </View>
          </View>
        </View>

        <View style={styles.fabContainer}>
          <Pressable style={styles.fab} onPress={() => router.push('/(tabs)/logfood')}>
            <MaterialIcons name="add" size={28} color="#ffffff" />
          </Pressable>
        </View>

        <View style={styles.mealsSection}>
          <View style={styles.mealsHeader}>
            <Text style={styles.mealsTitle}>Today's Meals</Text>
            <Pressable onPress={() => router.push('/(tabs)/meals')}>
              <Text style={styles.editLink}>View All</Text>
            </Pressable>
          </View>

          {mealsList.length > 0 ? (
            <View style={styles.mealsList}>
              {mealsList.map((meal, index) => {
                let iconName: any = 'restaurant';
                if (meal.type === 'Breakfast') iconName = 'bakery-dining';
                else if (meal.type === 'Lunch') iconName = 'lunch-dining';
                else if (meal.type === 'Dinner') iconName = 'dinner-dining';
                else if (meal.type === 'Snack') iconName = 'local-cafe';

                return (
                  <View key={meal.$id} style={[styles.mealItem, index < mealsList.length - 1 && styles.mealItemBorder]}>
                    <View style={styles.mealIconContainer}>
                      <MaterialIcons name={iconName} size={20} color={colors.textMuted} />
                    </View>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName}>{meal.friendlyname || meal.type}</Text>
                      <Text style={styles.mealDesc}>{meal.items?.length || 0} items</Text>
                    </View>
                    <View style={styles.mealStats}>
                      <Text style={styles.mealKcal}>{meal.kcal ?? 0}</Text>
                      <Text style={styles.mealUnit}>KCAL</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.mutedText}>No meals logged today. Add one below!</Text>
          )}

          <Pressable style={styles.addMealButton} onPress={() => router.push('/(tabs)/logfood')}>
            <MaterialIcons name="restaurant-menu" size={18} color={colors.textMuted} />
            <Text style={styles.addMealText}>Log another meal</Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: c.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: c.background,
    gap: 12,
  },
  mutedText: {
    color: c.textMuted,
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
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: c.text,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    color: '#f97316',
    fontWeight: '600',
    fontSize: 16,
  },
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 24,
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
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 240,
    position: 'relative',
  },
  ringSvg: {
    transform: [{ rotate: '-90deg' }],
  },
  ringCenterText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    fontSize: 34,
    fontWeight: '700',
    color: c.text,
    letterSpacing: -1,
  },
  ringLabel: {
    fontSize: 15,
    color: c.textMuted,
  },
  ringRemainingContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  ringRemainingValue: {
    fontSize: 17,
    fontWeight: '600',
    color: '#f97316',
  },
  ringRemainingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
    letterSpacing: 0.5,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: '#f97316',
    borderRadius: 3,
  },
  fabContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
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
    color: '#f97316',
    fontWeight: '500',
  },
  mealsList: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addMealText: {
    fontSize: 15,
    color: c.textMuted,
  }
});