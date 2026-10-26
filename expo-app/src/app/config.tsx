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
import { ThemePreferencePicker } from '@/components/ThemePreferencePicker';
import { NoiseOverlay } from '@/components/ui/NoiseOverlay';
import { showApiError } from '@/lib/apiErrors';
import { isEligibleOnboardingAge, MINIMUM_ONBOARDING_AGE } from '@/lib/ageEligibility';
import { useAuth } from '@/lib/AuthContext';
import { COUNTRY_OPTIONS, getCountryName } from '@/lib/countries';
import {
  HPyloriWarning,
  ResidencyBarNotice,
} from '@/components/onboarding/ResidencyNotices';
import {
  isBarredResidency,
  isRaceValue,
  nextAsiaAnswer,
  RACE_OPTIONS,
  RESIDENCY_BAR_MESSAGE,
  showHPyloriWarning,
} from '@/lib/residency';
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
    goalPaceKgPerWeek,
    type ActivityLevel,
    type DietStyle,
    type FitnessGoal,
    type GoalPace,
    type NutritionPlan,
    type Sex,
    NUTRITION_FORMULA_VERSION,
} from '@/lib/nutrition';
import { planPreferencesFromUser, savePlanPreferences } from '@/lib/planPreferences';
import { loadDemographics, saveDemographics } from '@/lib/demographics';
import {
    dateToIso,
    DEFAULT_DATE_OF_BIRTH,
    DEFAULT_PROFILE_ROLE,
    formatProfileSaveError,
    getProfile,
    isProfileComplete,
    parseProfileDate,
    PROFILE_ROLE_OPTIONS,
    saveProfileFields,
    type ProfileRole,
} from '@/lib/profile';
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
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CONFIG_TABS = ['Profile', 'Body & Goals', 'Targets', 'Preferences'] as const;

export default function ConfigScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const compactLayout = width < 560 || fontScale > 1.2;

  const allowLeaveRef = useRef(false);
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Profile fields
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(DEFAULT_DATE_OF_BIRTH);
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('US');
  const [race, setRace] = useState('');
  const [residesInAsia, setResidesInAsia] = useState<boolean | null>(null);
  const [role, setRole] = useState<ProfileRole>(DEFAULT_PROFILE_ROLE);

  // Body & Goal fields
  const [displayUnits, setDisplayUnits] = useState<DisplayUnits>('metric');
  const [sex, setSex] = useState<Sex>('female');
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(75);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [bodyFatPct, setBodyFatPct] = useState<number | null>(null);
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

  const isRequired = !profileComplete;

  const countryPickerOptions = useMemo(() => {
    if (isBarredResidency(country)) {
      return [
        { label: `${getCountryName(country)} (Unavailable)`, value: country },
        ...COUNTRY_OPTIONS,
      ];
    }
    return COUNTRY_OPTIONS;
  }, [country]);

  // Real-time suggested nutrition plan based on current body & goal selections
  const computedPlan: NutritionPlan = useMemo(() => {
    return buildNutritionPlan({
      dateOfBirth,
      sex,
      heightCm: height,
      weightKg: weight,
      bodyFatPct,
      activity,
      goal,
      pace,
      diet,
      targetWeight,
      displayUnits,
    });
  }, [dateOfBirth, sex, height, weight, bodyFatPct, activity, goal, pace, diet, targetWeight, displayUnits]);

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
    setBodyFatPct(savedPlan.bodyFatPct);
    setGoal(savedPlan.goal);
    setPace(savedPlan.pace);
    setDiet(savedPlan.diet);
    setDisplayUnits(savedPlan.displayUnits);

    Promise.all([getProfile(user.$id), loadDemographics(user.$id).catch(() => null)])
      .then(([profile, demographics]) => {
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
        setRace(isRaceValue(profile.race) ? profile.race : demographics?.race ?? '');
        setResidesInAsia(
          typeof profile.resides_in_asia === 'boolean'
            ? nextAsiaAnswer(profile.resides_in_asia, userCountry, userCountry)
            : nextAsiaAnswer(demographics?.residesInAsia ?? null, 'US', userCountry),
        );
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
          profile.goal_target_weight_kg ?? profile.target_weight,
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

    if (isBarredResidency(country)) {
      Alert.alert('kiloric is unavailable', RESIDENCY_BAR_MESSAGE);
      return;
    }


    // Eligibility is revalidated on every profile change, not just during onboarding.
    if (!isEligibleOnboardingAge(dateOfBirth)) {
      Alert.alert(
        'Age requirement',
        `kiloric is for adults ${MINIMUM_ONBOARDING_AGE} or older. Your profile cannot be saved with this date of birth.`,
      );
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const finalGoalBase = customGoalText.trim()
        ? customGoalText.trim()
        : buildGoalPlainText({
            goal,
            diet,
            targetWeight: roundMetric(targetWeight ?? computedPlan.targetWeight),
            currentWeight: roundMetric(weight),
            estimatedWeeklyChangeKg: currentWeeklyChangeKg,
            units: displayUnits,
          });

      const goalPlainWithUnits = appendDisplayUnitsToGoalPlain(finalGoalBase, displayUnits);
      const finalTargetWeight = roundMetric(targetWeight ?? computedPlan.targetWeight);

      const goalState = buildGoalState({
        goal,
        pace,
        startWeightKg: goalStartWeightKg ?? roundMetric(weight),
        targetWeightKg: finalTargetWeight,
        startDate: goalStartDate ? new Date(goalStartDate) : new Date(),
        paceKgPerWeek: goal === 'maintain' ? 0 : -currentWeeklyChangeKg,
      });

      const finalRace = isRaceValue(race) ? race : 'prefer_not_to_say';
      const finalAsia = residesInAsia === true || showHPyloriWarning(country, false);

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
        race: finalRace,
        resides_in_asia: finalAsia,
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
        sex,
        activity_level: activity,
        body_fat_pct: bodyFatPct,
        diet_style: diet,
        goal_pace: pace,
        bmr: computedPlan.bmr,
        formula_version: NUTRITION_FORMULA_VERSION,
      });
      await saveDemographics(
        {
          race: finalRace,
          residesInAsia: finalAsia,
        },
        user.$id,
      );
      await savePlanPreferences(
        {
          ...planPreferencesFromUser(user),
          sex,
          activity,
          goal,
          pace,
          diet,
          targetWeightKg: finalTargetWeight,
          bodyFatPct,
          displayUnits,
          overrides: {
            targetKcal: activeTargetKcal,
            macroGrams: { protein: activeTargetProtein, carbs: activeTargetCarbs, fat: activeTargetFat },
            dailyFluid: activeDailyFluid,
          },
        },
        user.$id,
      );

      allowLeaveRef.current = true;
      if (isRequired) {
        router.replace('/(tabs)/account');
      } else {
        router.back();
      }
    } catch (err) {
      const message = formatProfileSaveError(err);
      setSaveError(message);
      showApiError(message, 'appwrite');
    } finally {
      setSaving(false);
    }
  }

  if (loading || loadingProfile) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color={colors.brand} size="large" />
        <Text style={styles.loadingText}>Loading configuration…</Text>
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
          {
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom + 32, 56),
          },
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
          <Text accessibilityRole="header" style={styles.heading}>App & Profile Settings</Text>
          <Text style={styles.lede}>
            {isRequired
              ? 'Complete your profile setup to personalize your targets and use the app.'
              : 'Customize your identity, physical stats, nutrition targets, and app preferences.'}
          </Text>
        </MotionView>

        <MotionView
          from={{ opacity: 0, translateY: 6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 40, type: 'spring', damping: 22 }}
          style={styles.tabsWrapper}
        >
          <View accessibilityRole="tablist" style={styles.configTabs}>
            {CONFIG_TABS.map((tab, index) => {
              const selected = selectedTabIndex === index;
              return (
                <Pressable
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected, disabled: saving }}
                  disabled={saving}
                  onPress={() => setSelectedTabIndex(index)}
                  style={({ pressed }) => [
                    styles.configTab,
                    compactLayout && styles.configTabCompact,
                    selected && styles.configTabSelected,
                    pressed && styles.configTabPressed,
                  ]}
                >
                  <Text style={[styles.configTabText, selected && styles.configTabTextSelected]}>
                    {tab}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
              <Text accessibilityRole="header" style={styles.sectionTitle}>Account & Identity</Text>
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
                  accessibilityLabel="Username"
                  style={styles.input}
                />
                <Text style={styles.fieldHint}>Shown only to you — your profile is private.</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.verticalRow}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  value={user.email ?? ''}
                  editable={false}
                  accessibilityLabel="Account email"
                  style={[styles.input, styles.inputDisabled]}
                />
                <Text style={styles.fieldHint}>The email connected to your account.</Text>
              </View>

              <View style={styles.divider} />

              <View style={[styles.row, compactLayout && styles.rowCompact]}>
                <View style={[styles.rowTextCol, compactLayout && styles.rowTextColCompact]}>
                  <Text style={styles.fieldLabel}>Date of birth</Text>
                  <Text style={styles.fieldHint}>Used to calculate age and BMR</Text>
                </View>
                <NativeDatePicker
                  accessibilityLabel="Date of birth"
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                  disabled={saving}
                  minimumDate={new Date(1900, 0, 1)}
                  maximumDate={new Date()}
                />
              </View>

              <View style={styles.divider} />

              <View style={[styles.row, compactLayout && styles.rowCompact]}>
                <View style={[styles.rowTextCol, compactLayout && styles.rowTextColCompact]}>
                  <Text style={styles.fieldLabel}>Country of residence</Text>
                  <Text style={styles.fieldHint}>
                    {getCountryName(country)} ({country})
                  </Text>
                </View>
                <NativeEnumPicker
                  accessibilityLabel="Country of residence"
                  value={country}
                  options={countryPickerOptions}
                  onChange={(val) => {
                    setCountry(val);
                    setResidesInAsia((current) => nextAsiaAnswer(current, country, val));
                    if (!prefersImperialDisplay(val) && displayUnits === 'imperial') {
                      setDisplayUnits(defaultDisplayUnits(val));
                    }
                  }}
                  disabled={saving}
                />
              </View>

              {isBarredResidency(country) ? <ResidencyBarNotice /> : null}

              <View style={styles.divider} />

              <View style={styles.verticalRow}>
                <Text style={styles.fieldLabel}>Race</Text>
                <Text style={styles.fieldHint}>Self-reported. Stored with your profile.</Text>
                <NativeEnumPicker
                  accessibilityLabel="Race"
                  value={race}
                  options={[{ label: 'Select race', value: '' }, ...RACE_OPTIONS]}
                  onChange={(val) => setRace(isRaceValue(val) ? val : '')}
                  disabled={saving}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.verticalRow}>
                <Text style={styles.fieldLabel}>Do you reside in any country in Asia?</Text>
                {([
                  ['yes', true],
                  ['no', false],
                ] as const).map(([value, answer]) => (
                  <SelectionCard
                    key={value}
                    value={value}
                    label={value === 'yes' ? 'Yes' : 'No'}
                    description={
                      value === 'yes'
                        ? 'I reside in at least one country in Asia'
                        : 'I do not reside in a country in Asia'
                    }
                    selected={residesInAsia === answer}
                    onPress={() => setResidesInAsia(answer)}
                    disabled={saving}
                  />
                ))}
                {showHPyloriWarning(country, residesInAsia) ? <HPyloriWarning /> : null}
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
                  accessibilityLabel="Bio"
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
              <Text accessibilityRole="header" style={styles.sectionTitle}>Body Stats & Units</Text>
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
              <Text accessibilityRole="header" style={styles.sectionTitle}>Activity & Goal Strategy</Text>
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
                        description={`${formatPaceRate(displayUnits, goalPaceKgPerWeek(goal, opt.value, weight))} · ${opt.description}`}
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
                  ? ` ${
                      currentWeeklyDeficit > 0
                        ? `Projected weekly deficit: ${currentWeeklyDeficit.toLocaleString()} kcal/week`
                        : currentWeeklyDeficit < 0
                        ? `Projected weekly surplus: ${Math.abs(currentWeeklyDeficit).toLocaleString()} kcal/week`
                        : 'Projected weekly balance: 0 kcal/week'
                    } (${formatPaceRate(displayUnits, currentWeeklyChangeKg)}).`
                  : ''}
              </Text>
              <Text style={styles.fieldHint}>
                Formula v{NUTRITION_FORMULA_VERSION} · {computedPlan.bmrFormula === 'katch_mcardle' ? 'Katch–McArdle' : 'Mifflin–St Jeor'} BMR · activity-factor TDEE · macros account for {targetAudit.macroCalories} kcal/day.
              </Text>
              {targetAudit.warnings.map((warning) => (
                <Text key={warning} accessibilityRole="alert" style={[styles.fieldHint, { color: colors.danger }]}>Warning: {warning}</Text>
              ))}
              <Pressable
                accessibilityRole="button"
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
              <Text accessibilityRole="header" style={styles.sectionTitle}>Daily Targets & Macros</Text>
            </View>

            <View style={styles.card}>
              <View style={[styles.row, compactLayout && styles.rowCompact]}>
                <View style={[styles.rowTextCol, compactLayout && styles.rowTextColCompact]}>
                  <Text style={styles.fieldLabel}>Daily Calories</Text>
                  <Text style={styles.fieldHint}>Recommended: {computedPlan.targetKcal} kcal</Text>
                </View>
                <Text style={styles.fieldValue}>{activeTargetKcal} kcal</Text>
                <NativeIntPicker
                  accessibilityLabel="Daily calories"
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

              <View style={[styles.row, compactLayout && styles.rowCompact]}>
                <View style={[styles.rowTextCol, compactLayout && styles.rowTextColCompact]}>
                  <Text style={styles.fieldLabel}>Protein</Text>
                  <Text style={styles.fieldHint}>Recommended: {computedPlan.targetProtein} g</Text>
                </View>
                <Text style={styles.fieldValue}>{activeTargetProtein} g</Text>
                <NativeIntPicker
                  accessibilityLabel="Daily protein grams"
                  value={activeTargetProtein}
                  onChange={(val) => setTargetProtein(val)}
                  min={0}
                  max={500}
                  disabled={saving}
                  formatLabel={(value) => `${value} g`}
                />
              </View>

              <View style={styles.divider} />

              <View style={[styles.row, compactLayout && styles.rowCompact]}>
                <View style={[styles.rowTextCol, compactLayout && styles.rowTextColCompact]}>
                  <Text style={styles.fieldLabel}>Carbohydrates</Text>
                  <Text style={styles.fieldHint}>Recommended: {computedPlan.targetCarbs} g</Text>
                </View>
                <Text style={styles.fieldValue}>{activeTargetCarbs} g</Text>
                <NativeIntPicker
                  accessibilityLabel="Daily carbohydrate grams"
                  value={activeTargetCarbs}
                  onChange={(val) => setTargetCarbs(val)}
                  min={0}
                  max={1000}
                  disabled={saving}
                  formatLabel={(value) => `${value} g`}
                />
              </View>

              <View style={styles.divider} />

              <View style={[styles.row, compactLayout && styles.rowCompact]}>
                <View style={[styles.rowTextCol, compactLayout && styles.rowTextColCompact]}>
                  <Text style={styles.fieldLabel}>Fat</Text>
                  <Text style={styles.fieldHint}>Recommended: {computedPlan.targetFat} g</Text>
                </View>
                <Text style={styles.fieldValue}>{activeTargetFat} g</Text>
                <NativeIntPicker
                  accessibilityLabel="Daily fat grams"
                  value={activeTargetFat}
                  onChange={(val) => setTargetFat(val)}
                  min={0}
                  max={500}
                  disabled={saving}
                  formatLabel={(value) => `${value} g`}
                />
              </View>

              <View style={styles.divider} />

              <View style={[styles.row, compactLayout && styles.rowCompact]}>
                <View style={[styles.rowTextCol, compactLayout && styles.rowTextColCompact]}>
                  <Text style={styles.fieldLabel}>Daily Hydration</Text>
                  <Text style={styles.fieldHint}>
                    {formatFluid(displayUnits, activeDailyFluid)}
                  </Text>
                </View>
                <Text style={styles.fieldValue}>{activeDailyFluid} ml</Text>
                <NativeIntPicker
                  accessibilityLabel="Daily hydration milliliters"
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
              <Text accessibilityRole="header" style={styles.sectionTitle}>Goal Description</Text>
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
                  accessibilityLabel="Custom goal statement"
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
              <Text accessibilityRole="header" style={styles.sectionTitle}>App Preferences & Style</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.verticalRow}>
                <ThemePreferencePicker />
              </View>

              <View style={styles.divider} />

              <View style={styles.verticalRow}>
                <FontPreferencePicker />
              </View>

              {__DEV__ ? (
                <>
                  <View style={styles.divider} />

                  <View style={styles.verticalRow}>
                    <ApiBackendPreferencePicker />
                  </View>
                </>
              ) : null}
            </View>
          </MotionView>
        )}

        {saveError ? (
          <View accessibilityRole="alert" style={styles.errorBox}>
            <View style={styles.errorHeadingRow}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.errorTitle}>Couldn’t save changes</Text>
            </View>
            <Text style={styles.errorText}>{saveError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSaveError(null)}
              style={({ pressed }) => [styles.errorDismiss, pressed && styles.btnPressed]}
            >
              <Text style={styles.errorDismissText}>Dismiss</Text>
            </Pressable>
          </View>
        ) : null}

        <MotionView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 100, type: 'spring', damping: 22 }}
          style={styles.actions}
        >
          <Pressable
            accessibilityLabel={saving ? 'Saving changes' : 'Save changes'}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving, busy: saving }}
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
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
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
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      backgroundColor: c.background,
    },
    loadingText: {
      ...typography.bodySmall,
      color: c.textMuted,
    },
    content: {
      paddingHorizontal: 20,
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
      ...typography.display,
      color: c.text,
      marginTop: 6,
      marginBottom: 8,
    },
    lede: {
      ...typography.body,
      color: c.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    tabsWrapper: {
      marginVertical: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
    },
    configTabs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    configTab: {
      flex: 1,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    configTabCompact: {
      flex: 0,
      flexBasis: '50%',
    },
    configTabSelected: {
      backgroundColor: c.brandSoft,
      borderBottomColor: c.brand,
    },
    configTabPressed: {
      opacity: 0.72,
    },
    configTabText: {
      ...typography.labelSmall,
      color: c.textMuted,
      textAlign: 'center',
    },
    configTabTextSelected: {
      color: c.brand,
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
      width: 24,
      height: 24,
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
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: 0,
      paddingVertical: 6,
    },
    row: {
      minHeight: 56,
      alignItems: 'stretch',
      gap: 8,
      paddingVertical: 12,
    },
    rowCompact: {
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      paddingVertical: 12,
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowTextCol: {
      width: '100%',
      gap: 2,
    },
    rowTextColCompact: {
      flex: 0,
      flexBasis: '100%',
      marginBottom: 4,
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
      minHeight: 48,
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
      borderLeftWidth: 2,
      borderLeftColor: c.brand,
      paddingLeft: 16,
      paddingVertical: 4,
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
      minHeight: 44,
      justifyContent: 'center',
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
    errorBox: {
      borderLeftWidth: 3,
      borderLeftColor: c.danger,
      backgroundColor: c.dangerSoft,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 6,
    },
    errorHeadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    errorTitle: {
      ...typography.label,
      color: c.danger,
    },
    errorText: {
      ...typography.bodySmall,
      color: c.textMuted,
    },
    errorDismiss: {
      minHeight: 44,
      alignSelf: 'flex-start',
      justifyContent: 'center',
      paddingRight: 16,
    },
    errorDismissText: {
      ...typography.label,
      color: c.danger,
    },
    btn: {
      backgroundColor: c.brand,
      borderRadius: 999,
      minHeight: 52,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
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
      borderRadius: 999,
      minHeight: 48,
      paddingHorizontal: 18,
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
