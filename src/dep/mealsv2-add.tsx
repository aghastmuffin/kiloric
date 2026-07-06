import { useAuth } from '@/lib/AuthContext';
import {
    listHistoricMeals,
    MEAL_TYPE_OPTIONS,
    updateMeal,
    type MealDocument,
    type MealType
} from '@/lib/meals';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    LayoutAnimation,
    PanResponder,
    Platform,
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

// Utility: Normalize a Date to midnight for accurate boundary checking
const getStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function MealsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);

  // Calendar & Data State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [allMeals, setAllMeals] = useState<MealDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Drag & Drop Tracking State
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const dragPan = useRef(new Animated.ValueXY()).current;
  const dropZones = useRef<Map<MealType, { x: number; y: number; width: number; height: number }>>(new Map()).current;
  const zoneRefs = useRef<Record<string, View | null>>({});

  const fetchMeals = useCallback(async () => {
    if (!user?.$id) return;
    setIsLoading(true);
    try {
      // Pull latest history. Local state filtering handles the calendar views.
      const meals = await listHistoricMeals(user.$id, 200);
      setAllMeals(meals);
    } catch (error) {
      console.warn("Failed to fetch meals", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.$id]);

  useEffect(() => { void fetchMeals(); }, [fetchMeals]);
  useFocusEffect(useCallback(() => { void fetchMeals(); }, [fetchMeals]));

  const handleForceSync = async () => {
    setIsSyncing(true);
    await fetchMeals();
    setIsSyncing(false);
  };

  const shiftDate = (days: number) => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const handleMealDropped = async (mealId: string, targetType: MealType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    // 1. Optimistic UI update
    setAllMeals(prev => prev.map(m => m.$id === mealId ? { ...m, type: targetType } as MealDocument : m));

    // 2. Persist to Appwrite DB
    try {
      await updateMeal(mealId, { type: targetType });
    } catch (err) {
      console.warn('DB update failed. UI updated optimistically. Press Force Upload to rollback or retry.', err);
    }
  };

  // Extract meals specifically for the selected date
  const selectedStart = getStartOfDay(selectedDate).getTime();
  const selectedEnd = selectedStart + 24 * 60 * 60 * 1000;
  
  const displayedMeals = allMeals.filter(m => {
    const t = new Date(m.$createdAt).getTime();
    return t >= selectedStart && t < selectedEnd;
  });

  const measureZone = (type: MealType) => {
    const ref = zoneRefs.current[type];
    if (ref) {
      // Measure location in window coordinates (matches gesture screen coordinates)
      ref.measureInWindow((x, y, width, height) => {
        dropZones.set(type, { x, y, width, height });
      });
    }
  };

  const buildPanResponder = (meal: MealDocument) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setActiveDragId(meal.$id);
        dragPan.setOffset({ x: 0, y: 0 });
        dragPan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: dragPan.x, dy: dragPan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gestureState) => {
        const dropX = gestureState.moveX;
        const dropY = gestureState.moveY;
        let matchedZone: MealType | null = null;

        for (const [type, zone] of dropZones.entries()) {
          if (
            dropX >= zone.x && dropX <= zone.x + zone.width &&
            dropY >= zone.y && dropY <= zone.y + zone.height
          ) {
            matchedZone = type;
            break;
          }
        }

        if (matchedZone && matchedZone !== meal.type) {
          handleMealDropped(meal.$id, matchedZone);
        }

        Animated.spring(dragPan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(() => {
          setActiveDragId(null);
        });
      },
    });
  };

  const formatDateLabel = (date: Date) => {
    const today = getStartOfDay(new Date());
    if (date.getTime() === today.getTime()) return "Today";
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header & Calendar Navigation Strip */}
      <View style={styles.header}>
        <View style={styles.calendarStrip}>
          <TouchableOpacity style={styles.navButton} onPress={() => shiftDate(-1)}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.dateLabel}>{formatDateLabel(selectedDate)}</Text>
          <TouchableOpacity style={styles.navButton} onPress={() => shiftDate(1)}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleForceSync} disabled={isSyncing} style={styles.syncButton}>
          <Ionicons name="cloud-upload-outline" size={24} color={isSyncing ? colors.textMuted : colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Main Drag-and-Drop Area */}
      <ScrollView 
        style={styles.scrollArea} 
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={activeDragId === null} // Prevent scroll interference while dragging
      >
        {isLoading && !isSyncing ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          MEAL_TYPE_OPTIONS.map(type => {
            const typedMeals = displayedMeals.filter(m => m.type === type);
            
            return (
              <View 
                key={type}
                ref={el => { zoneRefs.current[type] = el; }}
                onLayout={() => measureZone(type)}
                style={styles.dropZone}
              >
                <View style={styles.zoneHeader}>
                  <Text style={styles.zoneTitle}>{type}</Text>
                  <Text style={styles.zoneMacros}>
                    {typedMeals.reduce((acc, m) => acc + (m.kcal || 0), 0)} kcal
                  </Text>
                </View>

                <View style={styles.itemsTray}>
                  {typedMeals.length === 0 ? (
                    <Text style={styles.emptyText}>Drag or log meals here</Text>
                  ) : (
                    typedMeals.map(meal => {
                      const isDragging = activeDragId === meal.$id;
                      const responder = buildPanResponder(meal);

                      return (
                        <Animated.View
                          key={meal.$id}
                          {...responder.panHandlers}
                          style={[
                            styles.mealCard,
                            isDragging && {
                              transform: [{ translateX: dragPan.x }, { translateY: dragPan.y }],
                              zIndex: 100,
                              opacity: 0.9,
                              shadowOpacity: 0.3,
                            }
                          ]}
                        >
                          <Text style={styles.mealTitle} numberOfLines={1}>
                            {meal.friendlyname || 'Unnamed Meal'}
                          </Text>
                          <View style={styles.mealMacros}>
                            <Text style={styles.macroText}>P: {meal.protein || 0}g</Text>
                            <Text style={styles.macroText}>C: {meal.carbs || 0}g</Text>
                            <Text style={styles.macroText}>F: {meal.fat || 0}g</Text>
                          </View>
                        </Animated.View>
                      );
                    })
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  calendarStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navButton: { padding: 8 },
  dateLabel: { fontSize: 18, fontWeight: 'bold', color: colors.text, minWidth: 120, textAlign: 'center' },
  syncButton: { padding: 8 },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  dropZone: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  zoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'flex-end'
  },
  zoneTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textTransform: 'uppercase' },
  zoneMacros: { fontSize: 14, fontWeight: '600', color: colors.accent },
  itemsTray: { minHeight: 60, justifyContent: 'center' },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontStyle: 'italic', fontSize: 13 },
  mealCard: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTitle: { fontSize: 15, fontWeight: '600', color: colors.text, flex: 1, marginRight: 10 },
  mealMacros: { flexDirection: 'row', gap: 8 },
  macroText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
});