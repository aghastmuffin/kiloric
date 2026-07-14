import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, SafeAreaView, TextInput } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import type { ThemeColors } from '@/lib/theme/tokens';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const router = useRouter();
  
  const [logText, setLogText] = useState('');

  const handleQuickLog = () => {
    // Add logic to quickly log the text input
    console.log('Logging:', logText);
    setLogText('');
  };

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
            <Text style={styles.dateText}>Wed, Oct 25</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.textMuted} />
          </View>
        </View>

        <View style={styles.ringContainer}>
          <Svg width="240" height="240" viewBox="0 0 240 240" style={styles.ringSvg}>
            <Circle cx="120" cy="120" r="100" stroke={colors.border} strokeWidth="8" fill="none" />
            <Circle 
              cx="120" cy="120" r="100" 
              stroke="#f97316" strokeWidth="8" fill="none" 
              strokeDasharray="628" strokeDashoffset="157" strokeLinecap="round" 
            />
          </Svg>
          <View style={styles.ringCenterText}>
            <Text style={styles.ringValue}>1,450</Text>
            <Text style={styles.ringLabel}>kcal eaten</Text>
            <View style={styles.ringRemainingContainer}>
              <Text style={styles.ringRemainingValue}>550</Text>
              <Text style={styles.ringRemainingLabel}>REMAINING</Text>
            </View>
          </View>
        </View>

        <View style={styles.macrosRow}>
          <View style={styles.macroCard}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroTitle}>PROTEIN</Text>
              <Text style={styles.macroValues}>45/120g</Text>
            </View>
            <View style={styles.macroTrack}><View style={[styles.macroFill, {width: '37%'}]} /></View>
          </View>
          <View style={styles.macroCard}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroTitle}>CARBS</Text>
              <Text style={styles.macroValues}>150/250g</Text>
            </View>
            <View style={styles.macroTrack}><View style={[styles.macroFill, {width: '60%'}]} /></View>
          </View>
          <View style={styles.macroCard}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroTitle}>FATS</Text>
              <Text style={styles.macroValues}>30/60g</Text>
            </View>
            <View style={styles.macroTrack}><View style={[styles.macroFill, {width: '50%'}]} /></View>
          </View>
        </View>

        {/* Quick Inline Logging - Replaces the legacy logfood page */}
        <View style={styles.inlineLogSection}>
          <View style={styles.inlineLogInputContainer}>
            <Ionicons name="search" size={20} color={colors.textMuted} style={styles.inlineLogIcon} />
            <TextInput 
              style={styles.inlineLogInput}
              placeholder="Quick log a meal... (e.g. 1 apple)"
              placeholderTextColor={colors.textFaint}
              value={logText}
              onChangeText={setLogText}
              onSubmitEditing={handleQuickLog}
              returnKeyType="done"
            />
          </View>
          <Pressable style={styles.inlineLogButton} onPress={handleQuickLog}>
            <Text style={styles.inlineLogButtonText}>Log</Text>
          </Pressable>
        </View>

        <View style={styles.mealsSection}>
          <View style={styles.mealsHeader}>
            <Text style={styles.mealsTitle}>Today's Meals</Text>
            <Pressable onPress={() => router.push('/(tabs)/meals')}>
              <Text style={styles.editLink}>View Draggable Meals</Text>
            </Pressable>
          </View>

          <View style={styles.mealsList}>
            {/* Breakfast */}
            <View style={[styles.mealItem, styles.mealItemBorder]}>
              <View style={styles.mealIconContainer}>
                <MaterialIcons name="bakery-dining" size={20} color={colors.textMuted} />
              </View>
              <View style={styles.mealInfo}>
                <Text style={styles.mealName}>Breakfast</Text>
                <Text style={styles.mealDesc}>Oatmeal & Berries</Text>
              </View>
              <View style={styles.mealStats}>
                <Text style={styles.mealKcal}>350</Text>
                <Text style={styles.mealUnit}>KCAL</Text>
              </View>
            </View>

            {/* Lunch */}
            <View style={[styles.mealItem, styles.mealItemBorder]}>
              <View style={styles.mealIconContainer}>
                <MaterialIcons name="lunch-dining" size={20} color={colors.textMuted} />
              </View>
              <View style={styles.mealInfo}>
                <Text style={styles.mealName}>Lunch</Text>
                <Text style={styles.mealDesc}>Chicken Salad</Text>
              </View>
              <View style={styles.mealStats}>
                <Text style={styles.mealKcal}>450</Text>
                <Text style={styles.mealUnit}>KCAL</Text>
              </View>
            </View>

            {/* Dinner */}
            <View style={styles.mealItem}>
              <View style={styles.mealIconContainer}>
                <MaterialIcons name="dinner-dining" size={20} color={colors.textMuted} />
              </View>
              <View style={styles.mealInfo}>
                <Text style={styles.mealName}>Dinner</Text>
                <Text style={styles.mealDesc}>Salmon & Quinoa</Text>
              </View>
              <View style={styles.mealStats}>
                <Text style={styles.mealKcal}>650</Text>
                <Text style={styles.mealUnit}>KCAL</Text>
              </View>
            </View>
          </View>
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
  inlineLogSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
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
    backgroundColor: '#f97316',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineLogButtonText: {
    color: '#ffffff',
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
});
