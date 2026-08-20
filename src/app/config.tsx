import { ApiBackendPreferencePicker } from '@/components/ApiBackendPreferencePicker';
import { FontPreferencePicker } from '@/components/FontPreferencePicker';
import { MotionView } from '@/components/MotionView';
import {
    NativeDatePicker,
    NativeEnumPicker,
    NativeIntPicker,
} from '@/components/NativePickers';
import { HeightPicker, WeightPicker } from '@/components/onboarding/BodyMetricPickers';
import { SelectionCard } from '@/components/onboarding/SelectionCard';
import { UnitToggle } from '@/components/onboarding/UnitToggle';
import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl';
import { ThemePreferencePicker } from '@/components/ThemePreferencePicker';
import { NoiseOverlay } from '@/components/ui/NoiseOverlay';
import { showApiError } from '@/lib/apiErrors';
import { useAuth } from '@/lib/AuthContext';
import { COUNTRY_OPTIONS, getCountryName } from '@/lib/countries';
import { buildGoalState } from '@/lib/goals';
import {
    ACTIVITY_OPTIONS,
    auditNutritionTargets,
    buildGoalPlainText,
    buildNutritionPlan,
    calculateWeeklyDeficit,
    DIET_OPTIONS,
    estimateWeeklyWeightChangeKg,
    GOAL_OPTIONS,
    PACE_OPTIONS,
    type ActivityLevel,
    type DietStyle,
    type FitnessGoal,
    type GoalPace,
    type NutritionPlan,
    type Sex,
    NUTRITION_FORMULA_VERSION,
} from '@/lib/nutrition';
import { planPreferencesFromUser, savePlanPreferences } from '@/lib/planPreferences';
import {
    dateToIso,
    DEFAULT_PROFILE_ROLE,
    formatProfileSaveError,
    getProfile,
    isProfileComplete,
    PROFILE_ROLE_OPTIONS,
    saveProfileFields,
    type ProfileRole,
} from '@/lib/profile';
import type { DefaultSearchMode } from '@/lib/searchPreferences';
import { useSearchPreferences } from '@/lib/SearchPreferencesContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import {
    appendDisplayUnitsToGoalPlain,
    defaultDisplayUnits,
    formatFluid,
    formatPaceRate,
    normalizeStoredMetricsToMetric,
    normalizeStoredTargetWeightKg,
    parseDisplayUnitsPreference,
    prefersImperialDisplay,
    roundMetric,
    type DisplayUnits,
} from '@/lib/units';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_DATE_OF_BIRTH = new Date(1990, 0, 15);

const CONFIG_TABS = ['Profile', 'Body & Goals', 'Targets', 'Preferences'] as const;

function parseProfileDate(value?: string): Date {
  if (!value) return DEFAULT_DATE_OF_BIRTH;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? DEFAULT_DATE_OF_BIRTH : parsed;
}

export default function ConfigScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { defaultSearchMode, setDefaultSearchMode } = useSearchPreferences();

  const allowLeaveRef = useRef(false);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(DEFAULT_DATE_OF_BIRTH);
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('US');
  const [role, setRole] = useState<ProfileRole>(DEFAULT_PROFILE_ROLE);

  // Body & Goal fields
  const [displayUnits, setDisplayUnits] = useState<DisplayUnits>('metric');
  const [sex, setSex] = useState<Sex>('female');
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(75);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<FitnessGoal>('maintain');
  const [pace, setPace] = useState<GoalPace>('moderate');
  const [diet, setDiet] = useState<DietStyle>('balanced');

  // Machine-readable goal state (preserved across saves)
  const [goalStartWeightKg, setGoalStartWeightKg] = useState<number | null>(null);
  const [goalStartDate, setGoalStartDate] = useState<string | null>(null);

  // Daily target overrides
  const [targetKcal, setTargetKcal] = useState<number | null>(null);
  const [targetProtein, setTargetProtein] = useState<number | null>(null);
  const [targetCarbs, setTargetCarbs] = useState<number | null>(null);
  const [targetFat, setTargetFat] = useState<number | null>(null);
  const [dailyFluid, setDailyFluid] = useState<number | null>(null);
  const [customGoalText, setCustomGoalText] = useState('');

  // Preference fields
  const [savingSearchPref, setSavingSearchPref] = useState(false);

  const isRequired = !profileComplete;

  // Real-time suggested nutrition plan based on current body & goal selections
  const computedPlan: NutritionPlan = useMemo(() => {
    return buildNutritionPlan({
      dateOfBirth,
      sex,
      heightCm: height,
      weightKg: weight,
      activity,
      goal,
      pace,
      diet,
      targetWeight,
    });
  }, [dateOfBirth, sex, height, weight, activity, goal, pace, diet, targetWeight]);

  const activeTargetKcal = targetKcal ?? computedPlan.targetKcal;
  const activeTargetProtein = targetProtein ?? computedPlan.targetProtein;
  const activeTargetCarbs = targetCarbs ?? computedPlan.targetCarbs;
  const activeTargetFat = targetFat ?? computedPlan.targetFat;
  const activeDailyFluid = dailyFluid ?? computedPlan.dailyFluid;

  const currentWeeklyDeficit = calculateWeeklyDeficit(computedPlan.tdee, activeTargetKcal);
  const currentWeeklyChangeKg = estimateWeeklyWeightChangeKg(currentWeeklyDeficit);
  const targetAudit = auditNutritionTargets({
    targetKcal: activeTargetKcal,
    protein: activeTargetProtein,
    carbs: activeTargetCarbs,
    fat: activeTargetFat,
    tdee: computedPlan.tdee,
    sex,
  });

  useEffect(() => {
    if (!user && !loading) {
      router.push('/(tabs)/account');
    }
  }, [user, loading, router]);

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: !isRequired,
      headerBackVisible: !isRequired,
      headerTitle: 'Configuration',
    });
  }, [isRequired, navigation]);

  useEffect(() => {
    if (!isRequired) return;

    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowLeaveRef.current) return;
      event.preventDefault();
      Alert.alert(
        'Profile required',
        'Finish setting up your profile before leaving this screen.',
      );
    });

    return unsubscribe;
  }, [isRequired, navigation]);

  useEffect(() => {
    if (!isRequired || Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [isRequired]);

  useEffect(() => {
    if (!user?.$id) {
      setLoadingProfile(false);
      return;
    }

    let active = true;
    const savedPlan = planPreferencesFromUser(user);
    setSex(savedPlan.sex);
    setActivity(savedPlan.activity);
    setGoal(savedPlan.goal);
    setPace(savedPlan.pace);
    setDiet(savedPlan.diet);
    setDisplayUnits(savedPlan.displayUnits);

    getProfile(user.$id)
      .then((profile) => {
        if (!active) return;

        const complete = isProfileComplete(profile);
        setProfileComplete(complete);

        if (!profile) return;

        const userCountry = profile.country ?? 'US';
        const parsedUnits = parseDisplayUnitsPreference(profile.goal_plain, userCountry);
        const body = normalizeStoredMetricsToMetric(
          userCountry,
          profile.height ?? 170,
          profile.weight ?? 75,
        );

        setUsername(profile.username ?? '');
        setDateOfBirth(parseProfileDate(profile.dateOfBirth));
        setBio(profile.bio ?? '');
        setCountry(userCountry);
        setDisplayUnits(parsedUnits);
        setHeight(body.heightCm);
        setWeight(body.weightKg);

        if (profile.role && PROFILE_ROLE_OPTIONS.includes(profile.role)) {
          setRole(profile.role);
        }

        setTargetKcal(profile.target_kcal ?? null);
        setTargetProtein(profile.target_protein ?? null);
        setTargetCarbs(profile.target_carbs ?? null);
        setTargetFat(profile.target_fat ?? null);
        setDailyFluid(profile.daily_fluid ?? null);

        setGoalStartWeightKg(profile.goal_start_weight_kg ?? null);
        setGoalStartDate(profile.goal_start_date ?? null);

        const cleanGoalText = profile.goal_plain
          ? profile.goal_plain.replace(/ · units:(metric|imperial)$/, '').trim()
          : '';
        setCustomGoalText(cleanGoalText);

        const parsedTargetWeight = normalizeStoredTargetWeightKg(
          userCountry,
          profile.target_weight,
          profile.height ?? 170,
        );
        setTargetWeight(parsedTargetWeight);
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  function handleResetTargetsToSuggested() {
    setTargetKcal(null);
    setTargetProtein(null);
    setTargetCarbs(null);
    setTargetFat(null);
    setDailyFluid(null);
    Alert.alert(
      'Reset to Recommended',
      'Daily calories, macros, and hydration have been refreshed to match your body and goals.',
    );
  }

  async function handleSearchModeChange(mode: DefaultSearchMode) {
    if (mode === defaultSearchMode || savingSearchPref) return;
    setSavingSearchPref(true);
    try {
      await setDefaultSearchMode(mode);
    } finally {
      setSavingSearchPref(false);
    }
  }
  async function handleSave() {
    if (!user?.$id || !user.email) {
      Alert.alert('Not signed in', 'Your account needs an email before saving a profile.');
      return;
    }

    if (!username.trim()) {
      Alert.alert('Missing details', 'Enter a username.');
      return;
    }

    if (username.trim().length > 64) {
      Alert.alert('Invalid username', 'Username must be 64 characters or fewer.');
      return;
    }

    if (bio.trim().length > 512) {
      Alert.alert('Invalid bio', 'Bio must be 512 characters or fewer.');
      return;
    }

    if (country.trim().length > 2) {
      Alert.alert('Invalid country', 'Use a 2-letter country code (e.g. US).');
      return;
    }

    setSaving(true);
    try {
      const finalGoalBase = customGoalText.trim()
        ? customGoalText.trim()
        : buildGoalPlainText({
            goal,
            diet,
            targetWeight: roundMetric(targetWeight ?? computedPlan.targetWeight),
            currentWeight: roundMetric(weight),
            estimatedWeeklyChangeKg: currentWeeklyChangeKg,
          });

      const goalPlainWithUnits = appendDisplayUnitsToGoalPlain(finalGoalBase, displayUnits);
      const finalTargetWeight = roundMetric(targetWeight ?? computedPlan.targetWeight);

      const goalState = buildGoalState({
        goal,
        pace,
        startWeightKg: goalStartWeightKg ?? roundMetric(weight),
        targetWeightKg: finalTargetWeight,
        startDate: goalStartDate ? new Date(goalStartDate) : new Date(),
      });

      await saveProfileFields(user.$id, {
        username: username.trim(),
        email: user.email,
        dateOfBirth: dateToIso(dateOfBirth),
        height: roundMetric(height),
        weight: roundMetric(weight),
        role,
        lastLogin: new Date().toISOString(),
        bio: bio.trim() || null,
        country: country.trim().toUpperCase() || null,
        target_kcal: activeTargetKcal,
        target_protein: activeTargetProtein,
        target_carbs: activeTargetCarbs,
        target_fat: activeTargetFat,
        daily_fluid: activeDailyFluid,
        TDEE: computedPlan.tdee,
        goal_plain: goalPlainWithUnits,
        target_weight: finalTargetWeight,
        weekly_deficit: currentWeeklyDeficit,
        goal_type: goalState.type,
        goal_pace_kg_per_week: goalState.paceKgPerWeek,
        goal_start_weight_kg: goalState.startWeightKg,
        goal_target_weight_kg: goalState.targetWeightKg,
        goal_start_date: goalState.startDate,
        goal_estimated_weeks: goalState.estimatedWeeks,
      });
      await savePlanPreferences({
        ...planPreferencesFromUser(user),
        sex,
        activity,
        goal,
        pace,
        diet,
        targetWeightKg: finalTargetWeight,
        displayUnits,
        overrides: {
          targetKcal: activeTargetKcal,
          macroGrams: { protein: activeTargetProtein, carbs: activeTargetCarbs, fat: activeTargetFat },
          dailyFluid: activeDailyFluid,
        },
      });

      allowLeaveRef.current = true;
      if (isRequired) {
        router.replace('/(tabs)/account');
      } else {
        router.back();
      }
    } catch (err) {
      showApiError(formatProfileSaveError(err), 'appwrite');
    } finally {
      setSaving(false);
    }
  }

  if (loading || loadingProfile) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator color={colors.accent} style={{ flex: 1 }} />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  const activeTab = CONFIG_TABS[selectedTabIndex];

  return (
    <View style={styles.screen}>
      <NoiseOverlay />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 16) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <MotionView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 0, type: 'spring', damping: 22 }}
          style={styles.header}
        >
          <View style={styles.eyebrowRow}>
            <View style={styles.badge}>
              <Ionicons name="settings-sharp" size={12} color={colors.accent} />
              <Text style={styles.badgeText}>CONFIGURATION</Text>
            </View>
            <Text style={styles.emailSubhead}>{user.email}</Text>
          </View>
          <Text style={styles.heading}>App & Profile Settings</Text>
          <Text style={styles.lede}>
            {isRequired
              ? 'Complete your profile setup to personalize your targets and use the app.'
              : 'Customize your identity, physical stats, nutrition targets, and app preferences.'}
          </Text>
        </MotionView>

        {/* Tabs Control */}
        <MotionView
          from={{ opacity: 0, translateY: 6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 40, type: 'spring', damping: 22 }}
          style={styles.tabsWrapper}
        >
          <ThemedSegmentedControl
            values={CONFIG_TABS as unknown as string[]}
            selectedIndex={selectedTabIndex}
            onChange={(idx) => setSelectedTabIndex(idx)}
            enabled={!saving}
          />
        </MotionView>

        {/* Tab 0: Profile / Account */}
        {activeTab === 'Profile' && (
          <MotionView
            key="profile-tab"
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 60, type: 'spring', damping: 22 }}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderIcon}>
                <Ionicons name="person-circle-outline" size={18} color={colors.accent} />
              </View>
              <Text style={styles.sectionTitle}>Account & Identity</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.verticalRow}>
                <Text style={styles.fieldLabel}>Username</Text>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="johndoe"
                  placeholderTextColor={colors.textFaint}
                  autoCapitalize="none"
                  maxLength={64}
                  style={styles.input}
                />
                <Text style={styles.fieldHint}>Used for your vitality card and public profile.</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.verticalRow}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  value={user.email ?? ''}
                  editable={false}
                  style={[styles.input, styles.inputDisabled]}
                />
                <Text style={styles.fieldHint}>Connected Appwrite auth account.</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <View style={styles.rowTextCol}>
                  <Text style={styles.fieldLabel}>Date of birth</Text>
                  <Text style={styles.fieldHint}>Used to calculate age and BMR</Text>
                </View>
                <NativeDatePicker
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                  disabled={saving}
                  minimumDate={new Date(1900, 0, 1)}
                  maximumDate={new Date()}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <View style={styles.rowTextCol}>
                  <Text style={styles.fieldLabel}>Country</Text>
                  <Text style={styles.fieldHint}>
                    {getCountryName(country)} ({country})
                  </Text>
                </View>
                <NativeEnumPicker
                  value={country}
                  options={COUNTRY_OPTIONS}
                  onChange={(val) => {
                    setCountry(val);
                    if (!prefersImperialDisplay(val) && displayUnits === 'imperial') {
                      setDisplayUnits(defaultDisplayUnits(val));
                    }
                  }}
                  disabled={saving}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <View style={styles.rowTextCol}>
                  <Text style={styles.fieldLabel}>Account Role</Text>
                  <Text style={styles.fieldHint}>Permissions tier</Text>
                </View>
                <Text style={styles.fieldValueBadge}>{role.toUpperCase()}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.verticalRow}>
                <View style={styles.rowBetween}>
                  <Text style={styles.fieldLabel}>Bio</Text>
                  <Text style={styles.charCount}>{bio.length}/512</Text>
                </View>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell us a little bit about your wellness journey…"
                  placeholderTextColor={colors.textFaint}
                  multiline
                  maxLength={512}
                  style={[styles.input, styles.multilineInput]}
                />
              </View>
            </View>
          </MotionView>
        )}

        {/* Tab 1: Body & Goals */}
        {activeTab === 'Body & Goals' && (
          <MotionView
            key="body-tab"
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 60, type: 'spring', damping: 22 }}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderIcon}>
                <Ionicons name="body-outline" size={18} color={colors.accent} />
              </View>
              <Text style={styles.sectionTitle}>Body Stats & Units</Text>
            </View>

            <View style={styles.card}>
              <UnitToggle
                value={displayUnits}
                onChange={setDisplayUnits}
                disabled={saving}
                country={getCountryName(country)}
              />

              <View style={styles.divider} />

              <View style={styles.verticalRow}>
                <Text style={styles.fieldLabel}>Biological sex</Text>
                <Text style={styles.fieldHint}>
                  Used for the Mifflin–St Jeor metabolic rate formula.
                </Text>
                <View style={styles.selectionGrid}>
                  {(['female', 'male'] as Sex[]).map((s) => (
                    <SelectionCard
                      key={s}
                      value={s}
                      label={s === 'female' ? 'Female' : 'Male'}
                      description={s === 'female' ? 'Standard baseline formula' : 'Standard baseline formula'}
                      selected={sex === s}
                      onPress={(val) => setSex(val)}
                      disabled={saving}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.verticalRow}>
                <HeightPicker
                  valueCm={height}
                  displayUnits={displayUnits}
                  onChange={setHeight}
                  disabled={saving}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.verticalRow}>
                <WeightPicker
                  valueKg={weight}
                  displayUnits={displayUnits}
                  onChange={setWeight}
                  disabled={saving}
                  label="Current weight"
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.verticalRow}>
                <WeightPicker
                  valueKg={targetWeight ?? computedPlan.targetWeight}
                  displayUnits={displayUnits}
                  onChange={(val) => setTargetWeight(val)}
                  disabled={saving}
                  label="Target weight"
                />
              </View>
            </View>

            <View style={[styles.sectionHeader, { marginTop: 16 }]}>
              <View style={styles.sectionHeaderIcon}>
                <Ionicons name="fitness-outline" size={18} color={colors.accent} />
              </View>
              <Text style={styles.sectionTitle}>Activity & Goal Strategy</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.verticalRow}>
                <Text style={styles.fieldLabel}>Activity level</Text>
                {ACTIVITY_OPTIONS.map((opt) => (
                  <SelectionCard
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={activity === opt.value}
                    onPress={(val) => setActivity(val)}
                    disabled={saving}
                  />
                ))}
              </View>

              <View style={styles.divider} />

              <View style={styles.verticalRow}>
                <Text style={styles.fieldLabel}>Primary goal</Text>
                {GOAL_OPTIONS.map((opt) => (
                  <SelectionCard
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={goal === opt.value}
                    onPress={(val) => setGoal(val)}
                    disabled={saving}
                  />
                ))}
              </View>

              {goal !== 'maintain' && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.verticalRow}>
                    <Text style={styles.fieldLabel}>Preferred pace</Text>
                    {PACE_OPTIONS.map((opt) => (
                      <SelectionCard
                        key={opt.value}
                        value={opt.value}
                        label={opt.label}
                        description={formatPaceRate(displayUnits, {
                          gentle: 0.25,
                          moderate: 0.5,
                          aggressive: 0.75,
                        }[opt.value])}
                        selected={pace === opt.value}
                        onPress={(val) => setPace(val)}
                        disabled={saving}
                      />
                    ))}
                  </View>
                </>
              )}

              <View style={styles.divider} />

              <View style={styles.verticalRow}>
                <Text style={styles.fieldLabel}>Dietary preference</Text>
                {DIET_OPTIONS.map((opt) => (
                  <SelectionCard
                    key={opt.value}
                    value={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={diet === opt.value}
                    onPress={(val) => setDiet(val)}
                    disabled={saving}
                  />
                ))}
              </View>
            </View>
          </MotionView>
        )}

        {/* Tab 2: Targets */}
        {activeTab === 'Targets' && (
          <MotionView
            key="targets-tab"
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 60, type: 'spring', damping: 22 }}
            style={styles.section}
          >
            {/* Live Science Card */}
            <View style={styles.infoBanner}>
              <View style={styles.infoBannerHeader}>
                <Ionicons name="sparkles" size={16} color={colors.accent} />
                <Text style={styles.infoBannerTitle}>Calculated Nutrition Plan</Text>
              </View>
              <Text style={styles.infoBannerText}>
                Based on your stats: BMR is {computedPlan.bmr} kcal/day · TDEE (maintenance) is {computedPlan.tdee} kcal/day.
                {goal !== 'maintain'
                  ? ` Projected energy balance: ${currentWeeklyDeficit > 0 ? '+' : ''}${currentWeeklyDeficit} kcal/week (${formatPaceRate(displayUnits, currentWeeklyChangeKg)}).`
                  : ''}
              </Text>
              <Text style={styles.fieldHint}>
                Formula v{NUTRITION_FORMULA_VERSION} · Mifflin–St Jeor BMR · activity-factor TDEE · macros account for {targetAudit.macroCalories} kcal/day.
              </Text>
              {targetAudit.warnings.map((warning) => (
                <Text key={warning} style={[styles.fieldHint, { color: colors.danger }]}>⚠ {warning}</Text>
              ))}
              <Pressable
                onPress={handleResetTargetsToSuggested}
                disabled={saving}
                style={({ pressed }) => [
                  styles.resetPill,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Ionicons name="refresh" size={14} color={colors.accent} />
                <Text style={styles.resetPillText}>Sync with body & goals</Text>
              </Pressable>
            </View>

            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderIcon}>
                <Ionicons name="flame-outline" size={18} color={colors.accent} />
              </View>
              <Text style={styles.sectionTitle}>Daily Targets & Macros</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.rowTextCol}>
                  <Text style={styles.fieldLabel}>Daily Calories</Text>
                  <Text style={styles.fieldHint}>Recommended: {computedPlan.targetKcal} kcal</Text>
                </View>
                <Text style={styles.fieldValue}>{activeTargetKcal} kcal</Text>
                <NativeIntPicker
                  value={activeTargetKcal}
                  onChange={(val) => setTargetKcal(val)}
                  min={800}
                  max={6000}
                  step={10}
                  disabled={saving}
                  formatLabel={(value) => `${value} kcal`}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <View style={styles.rowTextCol}>
                  <Text style={styles.fieldLabel}>Protein</Text>
                  <Text style={styles.fieldHint}>Recommended: {computedPlan.targetProtein} g</Text>
                </View>
                <Text style={styles.fieldValue}>{activeTargetProtein} g</Text>
                <NativeIntPicker
                  value={activeTargetProtein}
                  onChange={(val) => setTargetProtein(val)}
                  min={0}
                  max={500}
                  disabled={saving}
                  formatLabel={(value) => `${value} g`}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <View style={styles.rowTextCol}>
                  <Text style={styles.fieldLabel}>Carbohydrates</Text>
                  <Text style={styles.fieldHint}>Recommended: {computedPlan.targetCarbs} g</Text>
                </View>
                <Text style={styles.fieldValue}>{activeTargetCarbs} g</Text>
                <NativeIntPicker
                  value={activeTargetCarbs}
                  onChange={(val) => setTargetCarbs(val)}
                  min={0}
                  max={1000}
                  disabled={saving}
                  formatLabel={(value) => `${value} g`}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <View style={styles.rowTextCol}>
                  <Text style={styles.fieldLabel}>Fat</Text>
                  <Text style={styles.fieldHint}>Recommended: {computedPlan.targetFat} g</Text>
                </View>
                <Text style={styles.fieldValue}>{activeTargetFat} g</Text>
                <NativeIntPicker
                  value={activeTargetFat}
                  onChange={(val) => setTargetFat(val)}
                  min={0}
                  max={500}
                  disabled={saving}
                  formatLabel={(value) => `${value} g`}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <View style={styles.rowTextCol}>
                  <Text style={styles.fieldLabel}>Daily Hydration</Text>
                  <Text style={styles.fieldHint}>
                    {formatFluid(displayUnits, activeDailyFluid)}
                  </Text>
                </View>
                <Text style={styles.fieldValue}>{activeDailyFluid} ml</Text>
                <NativeIntPicker
                  value={activeDailyFluid}
                  onChange={(val) => setDailyFluid(val)}
                  min={500}
                  max={10000}
                  step={50}
                  disabled={saving}
                  formatLabel={(value) => `${value} ml`}
                />
              </View>
            </View>

            <View style={[styles.sectionHeader, { marginTop: 16 }]}>
              <View style={styles.sectionHeaderIcon}>
                <Ionicons name="flag-outline" size={18} color={colors.accent} />
              </View>
              <Text style={styles.sectionTitle}>Goal Description</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.verticalRow}>
                <Text style={styles.fieldLabel}>Custom Goal Statement</Text>
                <TextInput
                  value={customGoalText}
                  onChangeText={setCustomGoalText}
                  placeholder={computedPlan.goalPlain}
                  placeholderTextColor={colors.textFaint}
                  multiline
                  style={[styles.input, styles.multilineInput]}
                />
                <Text style={styles.fieldHint}>
                  Leave blank to auto-generate from your goal pace and target weight.
                </Text>
              </View>
            </View>
          </MotionView>
        )}

        {/* Tab 3: Preferences */}
        {activeTab === 'Preferences' && (
          <MotionView
            key="preferences-tab"
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 60, type: 'spring', damping: 22 }}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderIcon}>
                <Ionicons name="options-outline" size={18} color={colors.accent} />
              </View>
              <Text style={styles.sectionTitle}>App Preferences & Style</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.verticalRow}>
                <Text style={styles.fieldLabel}>Default Food Log Search Mode</Text>
                <Text style={styles.fieldHint}>
                  Choose your starting screen when logging new meals.
                </Text>
                <ThemedSegmentedControl
                  values={['Camera Scanner', 'Text Search']}
                  selectedIndex={defaultSearchMode === 'scan' ? 0 : 1}
                  enabled={!savingSearchPref}
                  onChange={(index) =>
                    handleSearchModeChange(index === 0 ? 'scan' : 'text_query')
                  }
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.verticalRow}>
                <ThemePreferencePicker />
              </View>

              <View style={styles.divider} />

              <View style={styles.verticalRow}>
                <FontPreferencePicker />
              </View>

              <View style={styles.divider} />

              <View style={styles.verticalRow}>
                <ApiBackendPreferencePicker />
              </View>
            </View>
          </MotionView>
        )}

        {/* Action Buttons */}
        <MotionView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 100, type: 'spring', damping: 22 }}
          style={styles.actions}
        >
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.btn,
              pressed && styles.btnPressed,
              saving && styles.btnDisabled,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={colors.onBrand} size="small" />
            ) : (
              <View style={styles.btnContent}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.onBrand} />
                <Text style={styles.btnText}>Save Changes</Text>
              </View>
            )}
          </Pressable>

          {!isRequired && (
            <Pressable
              onPress={() => router.back()}
              disabled={saving}
              style={({ pressed }) => [
                styles.discardBtn,
                pressed && styles.discardBtnPressed,
              ]}
            >
              <Text style={styles.discardBtnText}>Discard & Return</Text>
            </Pressable>
          )}
        </MotionView>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: 130,
      gap: 22,
      alignSelf: 'center',
      width: '100%',
      maxWidth: 720,
    },
    header: {
      marginBottom: 4,
    },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: c.brandSoft,
    },
    badgeText: {
      ...typography.labelSmall,
      color: c.brand,
      fontSize: 11,
      fontWeight: '700',
    },
    emailSubhead: {
      ...typography.labelSmall,
      color: c.textFaint,
    },
    heading: {
      ...typography.headlineLarge,
      color: c.text,
      marginTop: 2,
      marginBottom: 4,
    },
    lede: {
      ...typography.body,
      color: c.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    tabsWrapper: {
      marginVertical: 4,
    },
    section: {
      gap: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
      marginBottom: 2,
    },
    sectionHeaderIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.brandSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      ...typography.headline,
      fontSize: 16,
      fontWeight: '600',
      color: c.text,
    },
    card: {
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 18,
      paddingVertical: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },
    row: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 8,
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowTextCol: {
      flex: 1,
      gap: 2,
    },
    verticalRow: {
      paddingVertical: 12,
      gap: 8,
    },
    selectionGrid: {
      marginTop: 4,
    },
    divider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    fieldLabel: {
      ...typography.body,
      fontWeight: '600',
      color: c.text,
    },
    fieldHint: {
      ...typography.labelSmall,
      fontSize: 12,
      color: c.textFaint,
    },
    fieldValue: {
      ...typography.body,
      fontWeight: '500',
      color: c.textMuted,
    },
    fieldValueBadge: {
      ...typography.labelSmall,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: c.accentSoft,
      color: c.accent,
      fontWeight: '600',
    },
    charCount: {
      ...typography.labelSmall,
      fontSize: 11,
      color: c.textFaint,
    },
    input: {
      ...typography.body,
      color: c.text,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    inputDisabled: {
      opacity: 0.65,
    },
    multilineInput: {
      minHeight: 84,
      textAlignVertical: 'top',
    },
    infoBanner: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderStrong,
      borderRadius: 8,
      borderLeftWidth: 2,
      borderLeftColor: c.brand,
      padding: 16,
      gap: 8,
    },
    infoBannerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    infoBannerTitle: {
      ...typography.label,
      fontWeight: '700',
      color: c.text,
    },
    infoBannerText: {
      ...typography.body,
      fontSize: 13,
      lineHeight: 18,
      color: c.textMuted,
    },
    resetPill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.accentSoft,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginTop: 4,
    },
    resetPillText: {
      ...typography.labelSmall,
      fontSize: 12,
      fontWeight: '600',
      color: c.accent,
    },
    actions: {
      gap: 10,
      marginTop: 12,
    },
    btn: {
      backgroundColor: c.brand,
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.brand,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 10,
      elevation: 3,
    },
    btnContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    btnPressed: {
      opacity: 0.85,
    },
    btnDisabled: {
      opacity: 0.5,
    },
    btnText: {
      ...typography.body,
      fontWeight: '700',
      color: c.onBrand,
    },
    discardBtn: {
      backgroundColor: c.dangerButtonBg,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    discardBtnPressed: {
      opacity: 0.85,
    },
    discardBtnText: {
      ...typography.body,
      fontWeight: '600',
      color: c.danger,
    },
  });
