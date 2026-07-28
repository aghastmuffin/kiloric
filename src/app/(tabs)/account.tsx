import { AccountSignInFlow } from '@/components/auth/AccountSignInFlow';
import { FontPreferencePicker } from '@/components/FontPreferencePicker';
import { ThemePreferencePicker } from '@/components/ThemePreferencePicker';
import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl';
import { MacroProgressBar } from '@/components/MacroProgressBar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  NativeDatePicker,
  NativeEnumPicker,
  NativeIntPicker,
  NativeDecimalPicker,
} from '@/components/NativePickers';
import { showApiError } from '@/lib/apiErrors';
import { useAuth } from '@/lib/AuthContext';
import {
  calculateAge,
  buildNutritionPlan,
  calculateWeeklyDeficit,
  ACTIVITY_OPTIONS,
  GOAL_OPTIONS,
  PACE_OPTIONS,
  DIET_OPTIONS,
  type Sex,
  type ActivityLevel,
  type FitnessGoal,
  type GoalPace,
  type DietStyle,
} from '@/lib/nutrition';
import { getProfile, saveProfileFields, dateToIso } from '@/lib/profile';
import { listHistoricMeals } from '@/lib/meals';
import { calculateStreak } from '@/lib/gamification';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { COUNTRY_OPTIONS } from '@/lib/countries';
import { parseDisplayUnitsPreference, appendDisplayUnitsToGoalPlain, type DisplayUnits } from '@/lib/units';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SkeletonBlock } from '@/components/SkeletonBlock';

export default function AccountScreen() {
  const { user, loading } = useAuth();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { padding: 20 }]}>
        <View style={{ gap: 20 }}>
          <SkeletonBlock height={32} width="40%" borderRadius={8} />
          <View style={{ alignItems: 'center', marginVertical: 20 }}>
            <SkeletonBlock height={96} width={96} borderRadius={48} />
            <SkeletonBlock height={24} width={120} borderRadius={8} style={{ marginTop: 12 }} />
          </View>
          <SkeletonBlock height={150} borderRadius={16} />
          <SkeletonBlock height={200} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.avatarContainerHeader}>
            <MaterialIcons name="person" size={20} color={colors.accent} />
          </View>
          <Text style={styles.headerTitle}>Vitals & Profile</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {!user ? <AccountSignInFlow /> : <LoggedInPanel />}
      </ScrollView>
    </SafeAreaView>
  );
}

function LoggedInPanel() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  const [signingOut, setSigningOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile Details
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('US');
  const [dateOfBirth, setDateOfBirth] = useState<Date>(new Date(1990, 0, 15));
  const [age, setAge] = useState('—');

  // Body Details
  const [weight, setWeight] = useState('0');
  const [height, setHeight] = useState('0');
  const [sex, setSex] = useState<Sex>('female');

  // Goals & Targets
  const [targetKcal, setTargetKcal] = useState('2000');
  const [targetProtein, setTargetProtein] = useState('125');
  const [targetCarbs, setTargetCarbs] = useState('225');
  const [targetFat, setTargetFat] = useState('67');
  const [dailyFluid, setDailyFluid] = useState('2500');
  const [targetWeight, setTargetWeight] = useState('');
  const [goalPlain, setGoalPlain] = useState('');

  // Options
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>('lose');
  const [pace, setPace] = useState<GoalPace>('moderate');
  const [diet, setDiet] = useState<DietStyle>('balanced');
  
  const [displayUnits, setDisplayUnits] = useState<DisplayUnits>('metric');

  // Formula Auto-update Confirmation Modal state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingTargets, setPendingTargets] = useState<{
    targetKcal: string;
    targetProtein: string;
    targetCarbs: string;
    targetFat: string;
    dailyFluid: string;
    goalPlain: string;
    targetWeight: string;
  } | null>(null);

  // Gamification Stats
  const [mealsCount, setMealsCount] = useState(0);
  const [streakVal, setStreakVal] = useState(0);
  const [daysTracked, setDaysTracked] = useState(0);

  const loadProfile = useCallback(async () => {
    if (!user?.$id) return;
    setLoading(true);
    try {
      const [profile, historicMeals] = await Promise.all([
        getProfile(user.$id),
        listHistoricMeals(user.$id, 100),
      ]);

      if (profile) {
        setWeight(profile.weight?.toString() ?? '0');
        setHeight(profile.height?.toString() ?? '0');
        setTargetKcal(profile.target_kcal?.toString() ?? '2000');
        setTargetProtein(profile.target_protein?.toString() ?? '125');
        setTargetCarbs(profile.target_carbs?.toString() ?? '225');
        setTargetFat(profile.target_fat?.toString() ?? '67');
        setDailyFluid(profile.daily_fluid?.toString() ?? '2500');
        setUsername(profile.username ?? 'User');
        setBio(profile.bio ?? '');
        setCountry(profile.country ?? 'US');
        setTargetWeight(profile.target_weight?.toString() ?? '');
        setGoalPlain(profile.goal_plain ?? '');
        setDisplayUnits(parseDisplayUnitsPreference(profile.goal_plain, profile.country));

        if (profile.dateOfBirth) {
          const dobDate = new Date(profile.dateOfBirth);
          setDateOfBirth(dobDate);
          setAge(String(calculateAge(dobDate)));
        }

        // Try to guess/infer diet, fitnessGoal, pace from goal_plain text
        if (profile.goal_plain) {
          const lowerGoal = profile.goal_plain.toLowerCase();

          // Guess Diet
          if (lowerGoal.includes('high protein')) {
            setDiet('high_protein');
          } else if (lowerGoal.includes('low carb') || lowerGoal.includes('lower carb')) {
            setDiet('low_carb');
          } else if (lowerGoal.includes('mediterranean')) {
            setDiet('mediterranean');
          } else if (lowerGoal.includes('plant-forward')) {
            setDiet('plant_forward');
          } else {
            setDiet('balanced');
          }

          // Guess Goal
          if (lowerGoal.includes('reach')) {
            setFitnessGoal('lose');
          } else if (lowerGoal.includes('build toward')) {
            setFitnessGoal('gain');
          } else if (lowerGoal.includes('maintain')) {
            setFitnessGoal('maintain');
          }

          // Guess Pace
          if (lowerGoal.includes('~0.25') || lowerGoal.includes('gentle')) {
            setPace('gentle');
          } else if (lowerGoal.includes('~0.75') || lowerGoal.includes('focused')) {
            setPace('aggressive');
          } else {
            setPace('moderate');
          }
        }
      } else {
        setUsername('User');
      }

      if (historicMeals) {
        setMealsCount(historicMeals.length);
        const streak = calculateStreak(historicMeals);
        setStreakVal(streak);

        // Count unique days tracked
        const uniqueDays = new Set<string>();
        historicMeals.forEach((m) => {
          const d = new Date(m.$createdAt);
          uniqueDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
        });
        setDaysTracked(uniqueDays.size || 1);
      }

    } catch (err) {
      showApiError(err, 'appwrite');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  // Central trigger to see if changes in personal details warrant a formula recalculation confirmation
  const checkAndShowFormulaConfirm = (
    updatedFields: {
      weightKg?: number;
      heightCm?: number;
      dob?: Date;
      sexVal?: Sex;
      activityVal?: ActivityLevel;
      goalVal?: FitnessGoal;
      paceVal?: GoalPace;
      dietVal?: DietStyle;
      targetWeightVal?: number;
    }
  ) => {
    const w = (updatedFields.weightKg ?? parseFloat(weight)) || 75;
    const h = (updatedFields.heightCm ?? parseFloat(height)) || 170;
    const dob = updatedFields.dob ?? dateOfBirth;
    const s = updatedFields.sexVal ?? sex;
    const act = updatedFields.activityVal ?? activity;
    const g = updatedFields.goalVal ?? fitnessGoal;
    const p = updatedFields.paceVal ?? pace;
    const d = updatedFields.dietVal ?? diet;
    const tw = updatedFields.targetWeightVal ?? (parseFloat(targetWeight) || null);

    const newPlan = buildNutritionPlan({
      dateOfBirth: dob,
      sex: s,
      heightCm: h,
      weightKg: w,
      activity: act,
      goal: g,
      pace: p,
      diet: d,
      targetWeight: tw,
    });

    const kcalDiff = newPlan.targetKcal !== parseInt(targetKcal, 10);
    const pDiff = newPlan.targetProtein !== parseInt(targetProtein, 10);
    const cDiff = newPlan.targetCarbs !== parseInt(targetCarbs, 10);
    const fDiff = newPlan.targetFat !== parseInt(targetFat, 10);
    const fluidDiff = newPlan.dailyFluid !== parseInt(dailyFluid, 10);

    if (kcalDiff || pDiff || cDiff || fDiff || fluidDiff) {
      setPendingTargets({
        targetKcal: String(newPlan.targetKcal),
        targetProtein: String(newPlan.targetProtein),
        targetCarbs: String(newPlan.targetCarbs),
        targetFat: String(newPlan.targetFat),
        dailyFluid: String(newPlan.dailyFluid),
        goalPlain: newPlan.goalPlain,
        targetWeight: String(newPlan.targetWeight),
      });
      setShowConfirmDialog(true);
    }
  };

  const handleApplyPending = () => {
    if (pendingTargets) {
      setTargetKcal(pendingTargets.targetKcal);
      setTargetProtein(pendingTargets.targetProtein);
      setTargetCarbs(pendingTargets.targetCarbs);
      setTargetFat(pendingTargets.targetFat);
      setDailyFluid(pendingTargets.dailyFluid);
      setGoalPlain(pendingTargets.goalPlain);
      if (pendingTargets.targetWeight) {
        setTargetWeight(pendingTargets.targetWeight);
      }
    }
    setShowConfirmDialog(false);
    setPendingTargets(null);
  };

  const handleCancelPending = () => {
    setShowConfirmDialog(false);
    setPendingTargets(null);
  };

  async function handleSave() {
    if (!user?.$id) return;
    setSaving(true);
    try {
      const planVal = buildNutritionPlan({
        dateOfBirth,
        sex,
        heightCm: parseFloat(height) || 170,
        weightKg: parseFloat(weight) || 75,
        activity,
        goal: fitnessGoal,
        pace,
        diet,
        targetWeight: parseFloat(targetWeight) || null,
      });

      await saveProfileFields(user.$id, {
        username: username.trim(),
        bio: bio.trim() || null,
        country: country.trim().toUpperCase() || null,
        dateOfBirth: dateToIso(dateOfBirth),
        weight: parseFloat(weight) || 0,
        height: parseFloat(height) || 0,
        target_kcal: parseInt(targetKcal, 10) || 0,
        target_protein: parseInt(targetProtein, 10) || 0,
        target_carbs: parseInt(targetCarbs, 10) || 0,
        target_fat: parseInt(targetFat, 10) || 0,
        daily_fluid: parseInt(dailyFluid, 10) || 0,
        target_weight: parseFloat(targetWeight) || null,
        goal_plain: appendDisplayUnitsToGoalPlain(goalPlain, displayUnits),
        TDEE: planVal.tdee,
        weekly_deficit: calculateWeeklyDeficit(planVal.tdee, parseInt(targetKcal, 10) || 0),
      });
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch (err) {
      showApiError(err, 'appwrite');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } catch (err) {
      showApiError(err, 'appwrite');
    } finally {
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <View style={{ padding: 20, gap: 20 }}>
        <View style={{ alignItems: 'center', marginVertical: 20 }}>
          <SkeletonBlock height={96} width={96} borderRadius={48} />
          <SkeletonBlock height={24} width={120} borderRadius={8} style={{ marginTop: 12 }} />
        </View>
        <SkeletonBlock height={150} borderRadius={16} />
        <SkeletonBlock height={200} borderRadius={16} />
      </View>
    );
  }

  const proteinPct =
    Number(targetKcal) > 0
      ? Math.round(((Number(targetProtein) * 4) / Number(targetKcal)) * 100)
      : 0;
  const carbsPct =
    Number(targetKcal) > 0 ? Math.round(((Number(targetCarbs) * 4) / Number(targetKcal)) * 100) : 0;
  const fatPct =
    Number(targetKcal) > 0 ? Math.round(((Number(targetFat) * 9) / Number(targetKcal)) * 100) : 0;

  const calculatedLevel = Math.max(1, Math.floor(mealsCount / 3) + 1);

  return (
    <View style={styles.content}>
      {/* Profile Header Block */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarWrapper}>
          <View style={styles.profileAvatarFallback}>
            <MaterialIcons name="person" size={48} color={colors.textMuted} />
          </View>
          <Pressable
            style={[styles.editAvatarBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/config')}
          >
            <MaterialIcons name="edit" size={16} color={colors.onAccent} />
          </Pressable>
        </View>
        <View style={styles.profileNameRow}>
          <Text style={styles.profileName}>{username}</Text>
          <View style={[styles.levelBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
            <Text style={[styles.levelBadgeText, { color: colors.accent }]}>Lv. {calculatedLevel}</Text>
          </View>
        </View>
        <Text style={styles.profileEmail}>{user?.email}</Text>
      </View>

      {/* Stats Summary Row */}
      <View style={styles.statsSummaryRow}>
        <View style={styles.statsCard}>
          <MaterialIcons name="restaurant" size={20} color={colors.accent} />
          <Text style={styles.statsVal}>{mealsCount}</Text>
          <Text style={styles.statsLabel}>Meals Logged</Text>
        </View>
        <View style={styles.statsCard}>
          <MaterialIcons name="bolt" size={20} color={colors.accent} />
          <Text style={styles.statsVal}>{streakVal}d</Text>
          <Text style={styles.statsLabel}>Current Streak</Text>
        </View>
        <View style={styles.statsCard}>
          <MaterialIcons name="event" size={20} color={colors.accent} />
          <Text style={styles.statsVal}>{daysTracked}</Text>
          <Text style={styles.statsLabel}>Days Tracked</Text>
        </View>
      </View>

      {/* Account Profile Details Section (Made Editable!) */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <MaterialIcons name="face" size={18} color={colors.accent} />
          <Text style={styles.sectionTitleWithIcon}>Profile Details</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.cardItem}>
            <View style={styles.labelRow}>
              <MaterialIcons name="person" size={16} color={colors.accent} />
              <Text style={styles.labelWithIcon}>Username</Text>
            </View>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Your username"
              placeholderTextColor={colors.textFaint}
              maxLength={64}
            />

            <View style={styles.labelRow}>
              <MaterialIcons name="description" size={16} color={colors.accent} />
              <Text style={styles.labelWithIcon}>Bio</Text>
            </View>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us a little about yourself"
              placeholderTextColor={colors.textFaint}
              multiline
              maxLength={512}
            />

            <View style={styles.labelRow}>
              <MaterialIcons name="public" size={16} color={colors.accent} />
              <Text style={styles.labelWithIcon}>Country</Text>
            </View>
            <NativeEnumPicker
              value={country}
              options={COUNTRY_OPTIONS}
              onChange={(val) => {
                setCountry(val);
                // Dynamically update displayUnits if country preference dictates it
                if (val === 'US' || val === 'GB') {
                  setDisplayUnits('imperial');
                } else {
                  setDisplayUnits('metric');
                }
              }}
            />
          </View>
        </View>
      </View>

      {/* Personal Body Details Section (Fully Editable!) */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <MaterialIcons name="fitness-center" size={18} color={colors.accent} />
          <Text style={styles.sectionTitleWithIcon}>Personal Details</Text>
        </View>
        <View style={styles.gridContainer}>
          <View style={styles.gridRow}>
            <View style={[styles.gridItem, styles.gridItemBorderRight, styles.gridItemBorderBottom]}>
              <View style={styles.labelRow}>
                <MaterialIcons name="fitness-center" size={14} color={colors.accent} />
                <Text style={styles.gridLabel}>WEIGHT</Text>
              </View>
              <View style={styles.gridInputRow}>
                <TextInput
                  style={styles.gridInput}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  onBlur={() => {
                    checkAndShowFormulaConfirm({ weightKg: parseFloat(weight) || undefined });
                  }}
                />
                <Text style={styles.gridUnit}>{displayUnits === 'imperial' ? 'lbs' : 'kg'}</Text>
              </View>
            </View>
            <View style={[styles.gridItem, styles.gridItemBorderBottom]}>
              <View style={styles.labelRow}>
                <MaterialIcons name="straighten" size={14} color={colors.accent} />
                <Text style={styles.gridLabel}>HEIGHT</Text>
              </View>
              <View style={styles.gridInputRow}>
                <TextInput
                  style={styles.gridInput}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                  onBlur={() => {
                    checkAndShowFormulaConfirm({ heightCm: parseFloat(height) || undefined });
                  }}
                />
                <Text style={styles.gridUnit}>{displayUnits === 'imperial' ? 'in' : 'cm'}</Text>
              </View>
            </View>
          </View>
          <View style={styles.gridRow}>
            <View style={[styles.gridItem, styles.gridItemBorderRight]}>
              <View style={styles.labelRow}>
                <MaterialIcons name="cake" size={14} color={colors.accent} />
                <Text style={styles.gridLabel}>BIRTHDATE (AGE: {age})</Text>
              </View>
              <NativeDatePicker
                value={dateOfBirth}
                onChange={(dob) => {
                  setDateOfBirth(dob);
                  setAge(String(calculateAge(dob)));
                  checkAndShowFormulaConfirm({ dob });
                }}
              />
            </View>
            <View style={styles.gridItem}>
              <View style={styles.labelRow}>
                <MaterialIcons name="wc" size={14} color={colors.accent} />
                <Text style={styles.gridLabel}>SEX</Text>
              </View>
              <ThemedSegmentedControl
                values={['Female', 'Male']}
                selectedIndex={sex === 'female' ? 0 : 1}
                onChange={(idx) => {
                  const nextSex = idx === 0 ? 'female' : 'male';
                  setSex(nextSex);
                  checkAndShowFormulaConfirm({ sexVal: nextSex });
                }}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Activity & Goal Configuration Options (Added Options!) */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <MaterialIcons name="tune" size={18} color={colors.accent} />
          <Text style={styles.sectionTitleWithIcon}>Activity & Goal Settings</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.cardItem}>
            <View style={styles.labelRow}>
              <MaterialIcons name="directions-run" size={16} color={colors.accent} />
              <Text style={styles.labelWithIcon}>Activity Level</Text>
            </View>
            <NativeEnumPicker
              value={activity}
              options={ACTIVITY_OPTIONS}
              onChange={(val) => {
                setActivity(val);
                checkAndShowFormulaConfirm({ activityVal: val });
              }}
            />

            <View style={styles.labelRow}>
              <MaterialIcons name="track-changes" size={16} color={colors.accent} />
              <Text style={styles.labelWithIcon}>Fitness Goal</Text>
            </View>
            <NativeEnumPicker
              value={fitnessGoal}
              options={GOAL_OPTIONS}
              onChange={(val) => {
                setFitnessGoal(val);
                checkAndShowFormulaConfirm({ goalVal: val });
              }}
            />

            {fitnessGoal !== 'maintain' && (
              <>
                <View style={styles.labelRow}>
                  <MaterialIcons name="speed" size={16} color={colors.accent} />
                  <Text style={styles.labelWithIcon}>Preferred Pace</Text>
                </View>
                <NativeEnumPicker
                  value={pace}
                  options={PACE_OPTIONS}
                  onChange={(val) => {
                    setPace(val);
                    checkAndShowFormulaConfirm({ paceVal: val });
                  }}
                />
              </>
            )}

            <View style={styles.labelRow}>
              <MaterialIcons name="restaurant-menu" size={16} color={colors.accent} />
              <Text style={styles.labelWithIcon}>Dietary Style</Text>
            </View>
            <NativeEnumPicker
              value={diet}
              options={DIET_OPTIONS}
              onChange={(val) => {
                setDiet(val);
                checkAndShowFormulaConfirm({ dietVal: val });
              }}
            />
          </View>
        </View>
      </View>

      {/* Nutrition Goals & Daily Targets Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <MaterialIcons name="local-dining" size={18} color={colors.accent} />
          <Text style={styles.sectionTitleWithIcon}>Nutrition Targets</Text>
        </View>
        <View style={styles.card}>
          <View style={[styles.cardItem, styles.cardItemBorder]}>
            {goalPlain ? <Text style={styles.goalDescription}>{goalPlain}</Text> : null}

            <View style={styles.goalRow}>
              <View style={styles.labelRow}>
                <MaterialIcons name="local-fire-department" size={16} color={colors.accent} />
                <Text style={styles.goalLabel}>Daily Calories</Text>
              </View>
              <View style={styles.goalInputRow}>
                <TextInput
                  style={styles.goalInput}
                  value={targetKcal}
                  onChangeText={setTargetKcal}
                  keyboardType="numeric"
                />
                <Text style={styles.goalUnit}>kcal</Text>
              </View>
            </View>

            <View style={styles.goalRow}>
              <View style={styles.labelRow}>
                <MaterialIcons name="local-drink" size={16} color={colors.accent} />
                <Text style={styles.goalLabel}>Water Target</Text>
              </View>
              <View style={styles.goalInputRow}>
                <TextInput
                  style={styles.goalInput}
                  value={dailyFluid}
                  onChangeText={setDailyFluid}
                  keyboardType="numeric"
                />
                <Text style={styles.goalUnit}>ml</Text>
              </View>
            </View>

            <View style={styles.goalRow}>
              <View style={styles.labelRow}>
                <MaterialIcons name="track-changes" size={16} color={colors.accent} />
                <Text style={styles.goalLabel}>Target Weight</Text>
              </View>
              <View style={styles.goalInputRow}>
                <TextInput
                  style={styles.goalInput}
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  keyboardType="numeric"
                  placeholder="Not set"
                  placeholderTextColor={colors.textFaint}
                  onBlur={() => {
                    checkAndShowFormulaConfirm({ targetWeightVal: parseFloat(targetWeight) || undefined });
                  }}
                />
                <Text style={styles.goalUnit}>{displayUnits === 'imperial' ? 'lbs' : 'kg'}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.cardItem, { gap: 16 }]}>
            <View style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <View style={styles.labelRow}>
                  <MaterialIcons name="restaurant" size={14} color="#f97316" />
                  <Text style={styles.macroName}>Protein ({proteinPct}%)</Text>
                </View>
                <TextInput
                  style={styles.macroValueInput}
                  value={targetProtein}
                  onChangeText={setTargetProtein}
                  keyboardType="numeric"
                />
              </View>
              <MacroProgressBar progress={proteinPct / 100} gradientColors={['#ffb454', '#f97316']} />
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <View style={styles.labelRow}>
                  <MaterialIcons name="grain" size={14} color="#0a84ff" />
                  <Text style={styles.macroName}>Carbs ({carbsPct}%)</Text>
                </View>
                <TextInput
                  style={styles.macroValueInput}
                  value={targetCarbs}
                  onChangeText={setTargetCarbs}
                  keyboardType="numeric"
                />
              </View>
              <MacroProgressBar progress={carbsPct / 100} gradientColors={['#64d2ff', '#0a84ff']} />
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroHeader}>
                <View style={styles.labelRow}>
                  <MaterialIcons name="opacity" size={14} color="#5e5ce6" />
                  <Text style={styles.macroName}>Fats ({fatPct}%)</Text>
                </View>
                <TextInput
                  style={styles.macroValueInput}
                  value={targetFat}
                  onChangeText={setTargetFat}
                  keyboardType="numeric"
                />
              </View>
              <MacroProgressBar progress={fatPct / 100} gradientColors={['#b18cf8', '#5e5ce6']} />
            </View>
          </View>
        </View>
      </View>

      {/* Preferences & UI Settings Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <MaterialIcons name="settings" size={18} color={colors.accent} />
          <Text style={styles.sectionTitleWithIcon}>Preferences</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.settingsBlock}>
            <View style={styles.preferenceRow}>
              <View style={styles.labelRow}>
                <MaterialIcons name="straighten" size={16} color={colors.accent} />
                <Text style={styles.labelWithIcon}>Unit System</Text>
              </View>
              <Text style={styles.hint}>
                Switch between Metric (kg, ml, cm) and Imperial (lbs, fl oz, inches) for display.
              </Text>
              <ThemedSegmentedControl
                values={['Metric', 'Imperial']}
                selectedIndex={displayUnits === 'metric' ? 0 : 1}
                onChange={(idx) => setDisplayUnits(idx === 0 ? 'metric' : 'imperial')}
              />
            </View>
            <ThemePreferencePicker />
            <FontPreferencePicker />
          </View>
        </View>
      </View>

      {/* Form Action Buttons */}
      <View style={styles.section}>
        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.accent }, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={[styles.saveButtonText, { color: colors.onAccent }]}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('/config')}>
          <Text style={[styles.secondaryButtonText, { color: colors.accent }]}>Edit full profile</Text>
        </Pressable>
        <Pressable style={styles.logoutButton} onPress={handleSignOut} disabled={signingOut}>
          <Text style={styles.logoutButtonText}>{signingOut ? 'Logging out…' : 'Log Out'}</Text>
        </Pressable>
      </View>

      {/* OS Agnostic Formula Auto-update Confirmation Modal */}
      <ConfirmDialog
        visible={showConfirmDialog}
        title="Update Targets?"
        message={`We detected changes to your personal details. Do you want to automatically update your daily calorie, macro, and hydration targets based on these changes?`}
        confirmLabel="Update"
        cancelLabel="Keep Custom"
        onConfirm={handleApplyPending}
        onCancel={handleCancelPending}
      />
    </View>
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
      backgroundColor: c.background,
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
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatarContainerHeader: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: c.text,
    },
    container: {
      flexGrow: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: 20,
      gap: 24,
      paddingBottom: 40,
    },
    profileHeader: {
      alignItems: 'center',
      marginVertical: 8,
    },
    avatarWrapper: {
      marginBottom: 12,
      position: 'relative',
    },
    profileAvatarFallback: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: c.surfaceAlt,
      borderWidth: 2,
      borderColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    editAvatarBtn: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: c.background,
    },
    profileNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    profileName: {
      fontSize: 24,
      fontWeight: '700',
      color: c.text,
    },
    levelBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      borderWidth: 1,
    },
    levelBadgeText: {
      fontSize: 12,
      fontWeight: '700',
    },
    profileEmail: {
      fontSize: 15,
      color: c.textMuted,
      marginTop: 4,
    },
    statsSummaryRow: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
      marginVertical: 4,
    },
    statsCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    statsVal: {
      fontSize: 20,
      fontWeight: '700',
      color: c.text,
    },
    statsLabel: {
      fontSize: 11,
      color: c.textMuted,
      fontWeight: '600',
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      paddingHorizontal: 4,
    },
    sectionTitleWithIcon: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 4,
    },
    gridContainer: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    gridRow: {
      flexDirection: 'row',
    },
    gridItem: {
      flex: 1,
      padding: 16,
      gap: 8,
    },
    gridItemBorderRight: {
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: c.border,
    },
    gridItemBorderBottom: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    gridLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textMuted,
      letterSpacing: 0.5,
    },
    gridInputRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    gridInput: {
      fontSize: 22,
      fontWeight: '600',
      color: c.text,
      padding: 0,
      minWidth: 48,
    },
    gridUnit: {
      fontSize: 14,
      color: c.textMuted,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    cardItem: {
      padding: 16,
      gap: 12,
    },
    cardItemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    goalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 4,
    },
    goalLabel: {
      fontSize: 16,
      color: c.text,
      fontWeight: '500',
    },
    goalInputRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 6,
    },
    goalInput: {
      fontSize: 18,
      fontWeight: '700',
      color: c.text,
      textAlign: 'right',
      minWidth: 64,
      padding: 0,
    },
    goalUnit: {
      fontSize: 13,
      color: c.textMuted,
    },
    goalDescription: {
      fontSize: 14,
      color: c.textSoft,
      lineHeight: 20,
      marginBottom: 10,
    },
    macroRow: {
      gap: 8,
      width: '100%',
    },
    macroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    macroName: {
      fontSize: 14,
      color: c.text,
    },
    macroValueInput: {
      fontSize: 15,
      fontWeight: '600',
      color: c.text,
      textAlign: 'right',
      minWidth: 48,
      padding: 0,
    },
    presetGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    presetCard: {
      flexGrow: 1,
      minWidth: '45%',
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    presetCardSelected: {
      borderColor: c.accent,
      backgroundColor: c.accentSoft,
    },
    presetText: {
      fontSize: 14,
      fontWeight: '600',
      color: c.text,
    },
    settingsBlock: {
      padding: 16,
      gap: 12,
    },
    preferenceRow: {
      marginTop: 4,
      marginBottom: 12,
    },
    label: {
      color: c.text,
      fontSize: 16,
      marginBottom: 6,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    labelWithIcon: {
      fontSize: 14,
      fontWeight: '600',
      color: c.textSoft,
    },
    input: {
      backgroundColor: c.surfaceAlt,
      color: c.text,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      width: '100%',
      borderWidth: 1,
      borderColor: c.border,
    },
    multilineInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    hint: {
      color: c.textFaint,
      fontSize: 12,
      marginBottom: 8,
      lineHeight: 18,
    },
    saveButton: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: '700',
    },
    secondaryButton: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.border,
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '600',
    },
    logoutButton: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: c.dangerButtonBg,
    },
    logoutButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.onDanger,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
  });
