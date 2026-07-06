import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl';
import { useAuth } from '@/lib/AuthContext';
import { listHistoricMeals, MEAL_TYPE_OPTIONS, updateMeal, type MealDocument, type MealType } from '@/lib/meals';
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

const getStartOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function MealsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);

  const [allMeals, setAllMeals] = useState<MealDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'Today' | 'Yesterday'>('Today');
  
  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drag & Drop State
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const dragPan = useRef(new Animated.ValueXY()).current;
  const dropZones = useRef<Map<MealType, { x: number; y: number; width: number; height: number }>>(new Map()).current;
  const zoneRefs = useRef<Record<string, View | null>>({});

  const fetchMeals = useCallback(async () => {
    if (!user?.$id) return;
    setIsLoading(true);
    try {
      const meals = await listHistoricMeals(user.$id, 100);
      setAllMeals(meals);
    } catch (error) {
      console.warn("Failed to fetch meals", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.$id]);

  useEffect(() => { void fetchMeals(); }, [fetchMeals]);
  useFocusEffect(useCallback(() => { void fetchMeals(); }, [fetchMeals]));

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleMealDropped = async (meal: MealDocument, targetType: MealType) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    // Optimistic UI Update
    setAllMeals(prev => prev.map(m => m.$id === meal.$id ? { ...m, type: targetType } as MealDocument : m));
    showToast(`[${meal.friendlyname || 'Meal'}] moved!`);

    // Persist to DB
    try {
      await updateMeal(meal.$id, { type: targetType });
    } catch (err) {
      console.warn('DB update failed.', err);
    }
  };

  // Filter based on original Segmented Control tabs
  const todayStart = getStartOfDay(new Date()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  
  const displayedMeals = allMeals.filter(m => {
    const t = new Date(m.$createdAt).getTime();
    if (activeTab === 'Today') {
      return t >= todayStart && t < todayStart + 24 * 60 * 60 * 1000;
    } else {
      return t >= yesterdayStart && t < todayStart;
    }
  });

  const dailyTotals = displayedMeals.reduce((acc, m) => ({
    kcal: acc.kcal + (m.kcal || 0),
    protein: acc.protein + (m.protein || 0),
    carbs: acc.carbs + (m.carbs || 0),
    fat: acc.fat + (m.fat || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  const measureZone = (type: MealType) => {
    const ref = zoneRefs.current[type];
    if (ref) {
      // Small timeout ensures layout is fully painted before measuring window coords
      setTimeout(() => {
        ref.measureInWindow((x, y, width, height) => {
          dropZones.set(type, { x, y, width, height });
        });
      }, 100);
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
          handleMealDropped(meal, matchedZone);
        }

        Animated.spring(dragPan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(() => {
          setActiveDragId(null);
        });
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Toast Notification */}
      {toastMessage && (
        <Animated.View style={[styles.toastContainer, { top: insets.top + 10 }]}>
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Header & Controls */}
      <View style={styles.header}>
        <ThemedSegmentedControl
          options={['Today', 'Yesterday']}
          selectedValue={activeTab}
          onValueChange={(val) => setActiveTab(val as 'Today' | 'Yesterday')}
        />
        <TouchableOpacity 
          onPress={async () => {
            setIsSyncing(true);
            await fetchMeals();
            setIsSyncing(false);
          }} 
          disabled={isSyncing} 
          style={styles.syncButton}
        >
          <Ionicons name="cloud-upload-outline" size={24} color={isSyncing ? colors.textMuted : colors.accent} />
        </TouchableOpacity>
      </View>

      {/* Daily Summary */}
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

      {/* Main Drag-and-Drop Area */}
      <ScrollView 
        style={styles.scrollArea} 
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={activeDragId === null} // Stop scrolling while dragging
      >
        {isLoading && !isSyncing ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          MEAL_TYPE_OPTIONS.map(type => {
            const typedMeals = displayedMeals.filter(m => m.type === type);
            const typeTotalCals = typedMeals.reduce((acc, m) => acc + (m.kcal || 0), 0);
            
            return (
              <View 
                key={type}
                ref={el => { zoneRefs.current[type] = el; }}
                onLayout={() => measureZone(type)}
                style={styles.mealTypeCard} // Restored Original Style
              >
                <View style={styles.typeHeader}>
                  <Text style={styles.typeTitle}>{type}</Text>
                  <Text style={styles.typeMacros}>{Math.round(typeTotalCals)} kcal</Text>
                </View>

                <View style={styles.itemsTray}>
                  {typedMeals.length === 0 ? (
                    <Text style={styles.emptyText}>Drag items here</Text>
                  ) : (
                    typedMeals.map(meal => {
                      const isDragging = activeDragId === meal.$id;
                      const responder = buildPanResponder(meal);

                      return (
                        <Animated.View
                          key={meal.$id}
                          {...responder.panHandlers}
                          style={[
                            styles.draggableBox,
                            isDragging && {
                              transform: [{ translateX: dragPan.x }, { translateY: dragPan.y }],
                              zIndex: 100,
                              elevation: 10,
                              opacity: 0.9,
                              borderColor: colors.accent,
                              shadowOpacity: 0.4,
                            }
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemTitle} numberOfLines={1}>
                              {meal.friendlyname || 'Unnamed Meal'}
                            </Text>
                            <Text style={styles.itemMacros}>
                              {meal.kcal || 0} kcal • P: {meal.protein || 0}g
                            </Text>
                          </View>
                          <Ionicons name="menu" size={20} color={colors.textMuted} />
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  syncButton: { marginLeft: 16, padding: 4 },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  summaryLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  
  // Restored Original Meal Type Card Styling
  mealTypeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  typeTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  typeMacros: { fontSize: 14, fontWeight: '600', color: colors.accent },
  
  itemsTray: { minHeight: 40, justifyContent: 'center' },
  emptyText: { textAlign: 'center', color: colors.textMuted, fontStyle: 'italic', fontSize: 13, marginVertical: 8 },
  
  // New Draggable Item Box Styling
  draggableBox: {
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  itemMacros: { fontSize: 13, color: colors.textMuted },

  // Toast Styling
  toastContainer: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: '#2ecc71', // Green success color
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  toastText: { color: '#fff', fontWeight: '600', marginLeft: 8, fontSize: 14 },
});