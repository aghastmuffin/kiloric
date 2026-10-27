import { FEATURES } from '@/lib/features'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  NativeDatePicker,
  NativeEnumPicker,
  NativeIntPicker,
} from '@/components/NativePickers'
import { HeightPicker, WeightPicker } from '@/components/onboarding/BodyMetricPickers'
import { ProgressHeader } from '@/components/onboarding/ProgressHeader'
import { SelectionCard } from '@/components/onboarding/SelectionCard'
import { StepTransition } from '@/components/onboarding/StepTransition'
import { makeOnboardingStyles } from '@/components/onboarding/styles'
import {
  createDefaultFormState,
  AUTH_ONBOARDING_STEPS,
  getOnboardingSteps,
  ONBOARDING_STEPS,
  type MacroOverrides,
  type OnboardingFormState,
  type OnboardingStep,
} from '@/components/onboarding/types'
import { UnitToggle } from '@/components/onboarding/UnitToggle'
import {
  HPyloriWarning,
  ResidencyBarNotice,
} from '@/components/onboarding/ResidencyNotices'
import { showApiError } from '@/lib/apiErrors'
import { isEligibleOnboardingAge, MINIMUM_ONBOARDING_AGE } from '@/lib/ageEligibility'
import { isValidEmail, isValidPassword } from '@/lib/authValidation'
import { useAuth } from '@/lib/AuthContext'
import { buildGoalStateFromPlan } from '@/lib/goals'
import { useTheme } from '@/lib/theme/ThemeContext'
import { useOnboardingStyles } from '@/lib/theme/useThemedStyles'
import { COUNTRY_OPTIONS, getCountryName } from '@/lib/countries'
import {
  isAsianCountry,
  isBarredResidency,
  isRaceValue,
  nextAsiaAnswer,
  RACE_OPTIONS,
  RESIDENCY_BAR_MESSAGE,
  showHPyloriWarning,
} from '@/lib/residency'
import {
  ACTIVITY_OPTIONS,
  buildNutritionPlan,
  calculateWeeklyDeficit,
  DIET_OPTIONS,
  estimateWeeklyWeightChangeKg,
  GOAL_OPTIONS,
  goalPaceKgPerWeek,
  isValidBodyFatPct,
  BODY_FAT_PCT_RANGE,
  NUTRITION_FORMULA_VERSION,
  PACE_OPTIONS,
  type NutritionPlan,
  type Sex,
} from '@/lib/nutrition'
import { resolvePlanInputs } from '@/lib/planInputs'
import {
  dateToIso,
  DEFAULT_PROFILE_ROLE,
  formatProfileSaveError,
  getProfile,
  isProfileComplete,
  parseProfileDate,
  saveProfileFields,
} from '@/lib/profile'
import { loadPlanPreferences, planPreferencesFromUser, savePlanPreferences } from '@/lib/planPreferences'
import { loadDemographics, saveDemographics } from '@/lib/demographics'
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
} from '@/lib/units'
import { useNavigation, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function AgeRestrictionScreen({
  hasAccount,
  correcting,
  exiting,
  onCorrect,
  onExit,
}: {
  hasAccount: boolean
  correcting: boolean
  exiting: boolean
  onCorrect: () => void
  onExit: () => void
}) {
  const { onboardingColors } = useTheme()
  const styles = useOnboardingStyles(makeOnboardingStyles)
  const insets = useSafeAreaInsets()
  const opacity = useSharedValue(0)
  const scale = useSharedValue(0.76)
  const translateY = useSharedValue(18)

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
    scale.value = withSpring(1, { damping: 15, stiffness: 150 })
    translateY.value = withTiming(0, { duration: 460, easing: Easing.out(Easing.cubic) })
  }, [opacity, scale, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }))

  return (
    <ScrollView
      style={{ backgroundColor: onboardingColors.background }}
      contentContainerStyle={[
        styles.restrictionScreen,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={[styles.restrictionContent, animatedStyle]}>
        <View style={styles.restrictionIcon}>
          <Ionicons name="shield-checkmark-outline" size={34} color={onboardingColors.accent} />
        </View>
        <Text style={styles.restrictionEyebrow}>Age requirement</Text>
        <Text accessibilityRole="header" style={styles.restrictionTitle}>kiloric is for adults</Text>
        <Text style={styles.restrictionBody}>
          kiloric isn’t available to anyone under {MINIMUM_ONBOARDING_AGE}, including children
          under 13. Its nutrition targets are designed for adults and won’t work correctly for
          younger users.
        </Text>
        <View style={styles.restrictionNote}>
          <Ionicons name="lock-closed-outline" size={16} color={onboardingColors.textMuted} />
          <Text style={styles.restrictionNoteText}>
            Restricted features are locked and no new health information will be saved.
          </Text>
        </View>
      </Animated.View>

      <View style={styles.restrictionActions}>
        <Pressable
          accessibilityRole="button"
          onPress={onCorrect}
          disabled={correcting || exiting}
          style={({ pressed }) => [
            styles.secondaryButton,
            styles.buttonStacked,
            pressed && { opacity: 0.78 },
          ]}
        >
          <Text style={styles.secondaryButtonText}>Correct my date</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onExit}
          disabled={correcting || exiting}
          style={({ pressed }) => [
            styles.primaryButton,
            styles.buttonStacked,
            pressed && { opacity: 0.84 },
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {exiting ? 'Removing account…' : hasAccount ? 'Delete account and exit' : 'Return to sign in'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}


function getEffectiveMacros(plan: NutritionPlan, overrides: MacroOverrides | null): MacroOverrides {
  if (overrides) return overrides
  return {
    targetKcal: plan.targetKcal,
    targetProtein: plan.targetProtein,
    targetCarbs: plan.targetCarbs,
    targetFat: plan.targetFat,
  }
}

export function OnboardingWizard() {
  const { user, loading, deleteAccount, signOut, signUp } = useAuth()
  const router = useRouter()
  const navigation = useNavigation()
  const { onboardingColors } = useTheme()
  const onboardingStyles = useOnboardingStyles(makeOnboardingStyles)
  const insets = useSafeAreaInsets()
  const { width, fontScale } = useWindowDimensions()
  const stackActions = width < 390 || fontScale > 1.25
  const allowLeaveRef = useRef(false)

  const [step, setStep] = useState<OnboardingStep>('eligibility')
  const [stepInitialized, setStepInitialized] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward')
  const [profileComplete, setProfileComplete] = useState(false)
  const [form, setForm] = useState<OnboardingFormState>(() => createDefaultFormState())
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [ageBlocked, setAgeBlocked] = useState(false)
  const [bodyFatText, setBodyFatText] = useState('')

  const visibleSteps = useMemo(
    () => getOnboardingSteps(Boolean(user?.$id)),
    [user?.$id],
  )
  const isRequired = Boolean(user?.$id) && !profileComplete
  // Keep progress numbering stable throughout signup: count the full step list
  // until the profile is complete, even though account-creation steps get skipped
  // once the account exists.
  const numberingSteps = !user?.$id || isRequired ? ONBOARDING_STEPS : visibleSteps
  const headerContext = !user?.$id ? 'create' : isRequired ? 'setup' : 'edit'
  const stepIndex = visibleSteps.indexOf(step)
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === visibleSteps.length - 1
  const residencyBarred = isBarredResidency(form.country)

  const countryOptions = useMemo(() => {
    if (isBarredResidency(form.country)) {
      return [
        { label: `${getCountryName(form.country)} (Unavailable)`, value: form.country },
        ...COUNTRY_OPTIONS,
      ]
    }
    return COUNTRY_OPTIONS
  }, [form.country])

  const plan: NutritionPlan = useMemo(
    () =>
      buildNutritionPlan({
        dateOfBirth: form.dateOfBirth,
        sex: form.sex ?? 'female',
        heightCm: form.height,
        weightKg: form.weight,
        bodyFatPct: form.bodyFatPct,
        activity: form.activity,
        goal: form.goal ?? 'maintain',
        pace: form.pace,
        diet: form.diet,
        targetWeight: form.targetWeight,
        displayUnits: form.displayUnits,
      }),
    [form],
  )

  const macros = getEffectiveMacros(plan, form.macroOverrides)
  const weeklyDeficit = calculateWeeklyDeficit(plan.tdee, macros.targetKcal)
  const weeklyChangeKg = estimateWeeklyWeightChangeKg(weeklyDeficit)

  const updateForm = <K extends keyof OnboardingFormState>(key: K, value: OnboardingFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const updateMacro = <K extends keyof MacroOverrides>(key: K, value: MacroOverrides[K]) => {
    setForm((current) => ({
      ...current,
      macroOverrides: {
        ...(current.macroOverrides ?? {
          targetKcal: plan.targetKcal,
          targetProtein: plan.targetProtein,
          targetCarbs: plan.targetCarbs,
          targetFat: plan.targetFat,
        }),
        [key]: value,
      },
    }))
  }

  useEffect(() => {
    if (loading || stepInitialized) return
    setStep(user?.$id ? 'welcome' : 'eligibility')
    setStepInitialized(true)
  }, [loading, stepInitialized, user?.$id])

  useEffect(() => {
    if (!user?.$id || step === 'welcome' || step === 'body') return
    if (AUTH_ONBOARDING_STEPS.includes(step)) {
      setStep('welcome')
    }
  }, [step, user?.$id])

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: !isRequired,
      headerBackVisible: !isRequired,
    })
  }, [isRequired, navigation])

  useEffect(() => {
    if (!isRequired) return

    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowLeaveRef.current) return
      event.preventDefault()
      Alert.alert(
        'Profile required',
        'Finish setting up your profile before leaving this screen.',
      )
    })

    return unsubscribe
  }, [isRequired, navigation])

  useEffect(() => {
    if (!isRequired || Platform.OS !== 'android') return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => subscription.remove()
  }, [isRequired])

  useEffect(() => {
    if (!user?.$id) {
      setLoadingProfile(false)
      return
    }

    let active = true

    Promise.all([
      getProfile(user.$id),
      loadPlanPreferences(user.$id).catch(() => null),
      loadDemographics(user.$id).catch(() => null),
    ])
      .then(([profile, prefs, demographics]) => {
        if (!active) return

        const complete = isProfileComplete(profile)
        setProfileComplete(complete)

        const defaults = createDefaultFormState(user.email)
        if (!profile) {
          // Account creation happens mid-wizard. Keep the answers already entered.
          setForm((current) => ({
            ...current,
            username: current.username.trim() ? current.username : defaults.username,
          }))
          return
        }

        const country = profile.country ?? defaults.country
        const saved = resolvePlanInputs(profile, prefs)
        const body = normalizeStoredMetricsToMetric(
          country,
          profile.height ?? defaults.height,
          profile.weight ?? defaults.weight,
        )
        const hasSavedMacros =
          profile.target_kcal != null &&
          profile.target_protein != null &&
          profile.target_carbs != null &&
          profile.target_fat != null

        setForm({
          username: profile.username ?? defaults.username,
          dateOfBirth: parseProfileDate(profile.dateOfBirth),
          country,
          race: isRaceValue(profile.race) ? profile.race : demographics?.race ?? '',
          residesInAsia:
            typeof profile.resides_in_asia === 'boolean'
              ? nextAsiaAnswer(profile.resides_in_asia, country, country)
              : demographics?.residesInAsia != null
                ? nextAsiaAnswer(demographics.residesInAsia, country, country)
                : isAsianCountry(country)
                  ? true
                  : null,
          bio: profile.bio ?? '',
          sex: saved.sex,
          height: body.heightCm,
          weight: body.weightKg,
          bodyFatPct: saved.bodyFatPct,
          activity: saved.activity,
          goal: saved.goal,
          pace: saved.pace,
          diet: saved.diet,
          targetWeight: normalizeStoredTargetWeightKg(
            country,
            profile.goal_target_weight_kg ?? profile.target_weight,
            profile.height ?? defaults.height,
          ),
          displayUnits: parseDisplayUnitsPreference(profile.goal_plain, country),
          macroOverrides: hasSavedMacros
            ? {
                targetKcal: profile.target_kcal!,
                targetProtein: profile.target_protein!,
                targetCarbs: profile.target_carbs!,
                targetFat: profile.target_fat!,
              }
            : null,
        })
        setBodyFatText(saved.bodyFatPct != null ? String(saved.bodyFatPct) : '')

        // Central eligibility enforcement: an existing session whose saved date
        // of birth is under the minimum age stays on the restriction screen.
        if (profile.dateOfBirth) {
          const savedDate = parseProfileDate(profile.dateOfBirth)
          if (!isEligibleOnboardingAge(savedDate)) {
            setAgeBlocked(true)
          }
        }
        if (isBarredResidency(country)) {
          setStep('eligibility')
        }
      })
      .finally(() => {
        if (active) setLoadingProfile(false)
      })

    return () => {
      active = false
    }
  }, [user?.$id, user?.email])

  function validateStep(current: OnboardingStep): string | null {
    switch (current) {
      case 'email':
        if (!isValidEmail(authEmail)) return 'Enter a valid email address.'
        return null
      case 'password':
        if (!isValidPassword(authPassword)) return 'Password must be at least 8 characters.'
        return null
      case 'welcome':
        if (!form.username.trim()) return 'Choose a username to continue.'
        if (form.username.trim().length > 64) return 'Username must be 64 characters or fewer.'
        return null
      case 'eligibility':
        if (!form.dateOfBirth || Number.isNaN(form.dateOfBirth.getTime())) {
          return 'Select your date of birth to continue.'
        }
        if (form.dateOfBirth > new Date()) return 'Choose a valid date of birth.'
        return null
      case 'body':
        if (!form.sex) return 'Select your biological sex to continue.'
        if (form.height <= 0 || form.weight <= 0) return 'Enter your height and weight.'
        if (bodyFatText.trim() && form.bodyFatPct == null) {
          return `Body fat must be between ${BODY_FAT_PCT_RANGE.min}% and ${BODY_FAT_PCT_RANGE.max}%, or leave it blank.`
        }
        return null
      case 'lifestyle':
        if (!form.goal) return 'Select your primary goal to continue.'
        return null
      case 'diet':
        return null
      case 'plan':
        if (form.bio.trim().length > 512) return 'Bio must be 512 characters or fewer.'
        return null
      default:
        return null
    }
  }

  async function goNext() {
    if (isBarredResidency(form.country)) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      Alert.alert('kiloric is unavailable', RESIDENCY_BAR_MESSAGE)
      return
    }

    const error = validateStep(step)
    if (error) {
      Alert.alert('Almost there', error)
      return
    }

    if (step === 'eligibility' && !isEligibleOnboardingAge(form.dateOfBirth)) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      setAgeBlocked(true)
      return
    }

    if (step === 'password' && !user?.$id) {
      setSaving(true)
      setAuthError(null)
      try {
        const result = await signUp(authEmail.trim(), authPassword)
        if (result === 'verification_required') {
          Alert.alert(
            'Check your email',
            'Confirm your address, then sign in from the Account tab.',
          )
          router.replace('/(tabs)/account')
          return
        }
        setNavDirection('forward')
        setStep('welcome')
      } catch (err) {
        showApiError(err, 'server')
        setAuthError(err instanceof Error ? err.message : 'Could not create your account.')
      } finally {
        setSaving(false)
      }
      return
    }

    if (isLastStep) {
      void handleSave()
      return
    }

    const nextStep = visibleSteps[stepIndex + 1]
    if (nextStep === 'plan') {
      setForm((current) => ({
        ...current,
        targetWeight: null,
        macroOverrides: null,
      }))
    }
    setNavDirection('forward')
    setStep(nextStep)
  }
  function goBack() {
    if (isFirstStep) {
      if (!isRequired) router.push("/account")
      else if (!user?.$id && step === 'email') router.replace('/(tabs)/account')
      return
    }
    setNavDirection('back')
    setStep(visibleSteps[stepIndex - 1])
  }

  async function confirmLogout() {
    setSigningOut(true)
    try {
      allowLeaveRef.current = true
      await signOut()
      setLogoutDialogVisible(false)
      router.replace('/(tabs)/account')
    } catch (err) {
      showApiError(err, 'server')
    } finally {
      setSigningOut(false)
    }
  }

  async function handleSave() {
    if (!user?.$id || !user.email) {
      Alert.alert('Not signed in', 'Your account needs an email before saving a profile.')
      return
    }

    if (!isEligibleOnboardingAge(form.dateOfBirth)) {
      setAgeBlocked(true)
      return
    }

    if (isBarredResidency(form.country)) {
      Alert.alert('kiloric is unavailable', RESIDENCY_BAR_MESSAGE)
      return
    }

    const finalRace = isRaceValue(form.race) ? form.race : 'prefer_not_to_say'
    const finalAsia = form.residesInAsia === true || isAsianCountry(form.country)
    const finalSex = form.sex ?? 'female'
    const finalGoal = form.goal ?? 'maintain'

    const targetKg = roundMetric(form.targetWeight ?? plan.targetWeight)
    const goalPlain = appendDisplayUnitsToGoalPlain(plan.goalPlain, form.displayUnits)
    const goalState = buildGoalStateFromPlan(plan, {
      goal: finalGoal,
      pace: form.pace,
      startWeightKg: roundMetric(form.weight),
    })

    setSaving(true)
    setSaveError(null)
    try {
      await saveProfileFields(user.$id, {
        username: form.username.trim(),
        email: user.email,
        dateOfBirth: dateToIso(form.dateOfBirth),
        height: roundMetric(form.height),
        weight: roundMetric(form.weight),
        role: DEFAULT_PROFILE_ROLE,
        lastLogin: new Date().toISOString(),
        bio: form.bio.trim() || null,
        country: form.country.trim().toUpperCase() || null,
        race: finalRace,
        resides_in_asia: finalAsia,
        target_kcal: macros.targetKcal,
        target_protein: macros.targetProtein,
        target_carbs: macros.targetCarbs,
        target_fat: macros.targetFat,
        daily_fluid: plan.dailyFluid,
        TDEE: plan.tdee,
        goal_plain: goalPlain,
        target_weight: targetKg,
        weekly_deficit: plan.weeklyDeficit,
        goal_type: goalState.type,
        goal_pace_kg_per_week: goalState.paceKgPerWeek,
        goal_start_weight_kg: goalState.startWeightKg,
        goal_target_weight_kg: goalState.targetWeightKg,
        goal_start_date: goalState.startDate,
        goal_estimated_weeks: goalState.estimatedWeeks,
        sex: finalSex,
        activity_level: form.activity,
        body_fat_pct: form.bodyFatPct,
        diet_style: form.diet,
        goal_pace: form.pace,
        bmr: plan.bmr,
        formula_version: NUTRITION_FORMULA_VERSION,
      })
      await saveDemographics(
        {
          race: finalRace,
          residesInAsia: finalAsia,
        },
        user.$id,
      )
      await savePlanPreferences(
        {
          ...planPreferencesFromUser(user),
          sex: finalSex,
          activity: form.activity,
          goal: finalGoal,
          pace: form.pace,
          diet: form.diet,
          targetWeightKg: targetKg,
          bodyFatPct: form.bodyFatPct,
          displayUnits: form.displayUnits,
          overrides: {
            targetKcal: macros.targetKcal,
            macroGrams: {
              protein: macros.targetProtein,
              carbs: macros.targetCarbs,
              fat: macros.targetFat,
            },
            dailyFluid: plan.dailyFluid,
          },
        },
        user.$id,
      )

      allowLeaveRef.current = true
      setSaveError(null)
      if (isRequired) {
        router.replace('/onboard_success')
      } else {
        router.back()
      }
    } catch (err) {
      const message = formatProfileSaveError(err)
      console.error('[onboarding] save failed:', message)
      showApiError(message, 'server')
      setSaveError(message)
    } finally {
      setSaving(false)
    }
  }

  function renderTargetWeightPicker() {
    const targetKg = form.targetWeight ?? plan.targetWeight

    return (
      <WeightPicker
        valueKg={targetKg}
        displayUnits={form.displayUnits}
        onChange={(value) => updateForm('targetWeight', value)}
        disabled={saving}
        label="Target weight"
      />
    )
  }

  function renderStepContent() {
    switch (step) {
      case 'email':
        return (
          <>
            <Text style={onboardingStyles.stepSubtitle}>
              Start with the email you want to use for your kiloric account.
            </Text>
            {authError ? (
              <View accessibilityRole="alert" style={onboardingStyles.errorBox}>
                <Text style={onboardingStyles.errorTitle}>Something went wrong</Text>
                <Text style={onboardingStyles.errorText}>{authError}</Text>
                <Pressable
                  accessibilityLabel="Dismiss error"
                  accessibilityRole="button"
                  onPress={() => setAuthError(null)}
                  hitSlop={8}
                >
                  <Text style={onboardingStyles.errorDismiss}>Dismiss</Text>
                </Pressable>
              </View>
            ) : null}
            <Text style={onboardingStyles.label}>Email</Text>
            <TextInput
              value={authEmail}
              onChangeText={setAuthEmail}
              placeholder="you@example.com"
              placeholderTextColor={onboardingColors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              maxLength={254}
              autoFocus
              accessibilityLabel="Email address"
              autoComplete="email"
              textContentType="emailAddress"
              style={onboardingStyles.input}
            />
          </>
        )

      case 'password':
        return (
          <>
            <Text style={onboardingStyles.stepSubtitle}>{authEmail.trim()}</Text>
            {authError ? (
              <View accessibilityRole="alert" style={onboardingStyles.errorBox}>
                <Text style={onboardingStyles.errorTitle}>Something went wrong</Text>
                <Text style={onboardingStyles.errorText}>{authError}</Text>
                <Pressable
                  accessibilityLabel="Dismiss error"
                  accessibilityRole="button"
                  onPress={() => setAuthError(null)}
                  hitSlop={8}
                >
                  <Text style={onboardingStyles.errorDismiss}>Dismiss</Text>
                </Pressable>
              </View>
            ) : null}
            <Text style={onboardingStyles.label}>Password</Text>
            <TextInput
              value={authPassword}
              onChangeText={setAuthPassword}
              placeholder="At least 8 characters"
              placeholderTextColor={onboardingColors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              maxLength={128}
              autoFocus
              accessibilityLabel="Password"
              autoComplete="new-password"
              textContentType="newPassword"
              style={onboardingStyles.input}
            />
          </>
        )

      case 'welcome':
        return (
          <>
            <Text style={onboardingStyles.stepSubtitle}>
              A quick setup so kiloric can calculate your baseline calories and macros.
            </Text>
            <View style={onboardingStyles.infoCard}>
              <Text style={onboardingStyles.infoCardTitle}>Automatic calculations</Text>
              <Text style={onboardingStyles.infoCardText}>
                TDEE, macro splits, and weekly pace are calculated from your stats using standard formulas.
              </Text>
            </View>
            <Text style={onboardingStyles.label}>Username</Text>
            <TextInput
              value={form.username}
              onChangeText={(value) => updateForm('username', value)}
              placeholder="johndoe"
              placeholderTextColor={onboardingColors.textMuted}
              autoCapitalize="none"
              maxLength={64}
              accessibilityLabel="Username"
              style={onboardingStyles.input}
            />
          </>
        )

      case 'eligibility':
        return (
          <>
            <Text style={onboardingStyles.stepSubtitle}>
              kiloric creates adult nutrition targets, so you must be {MINIMUM_ONBOARDING_AGE} or
              older to continue.
            </Text>
            <Text style={onboardingStyles.label}>Date of birth</Text>
            <NativeDatePicker
              accessibilityLabel="Date of birth"
              value={form.dateOfBirth}
              onChange={(value) => updateForm('dateOfBirth', value)}
              disabled={saving}
              minimumDate={new Date(1900, 0, 1)}
              maximumDate={new Date()}
            />
            <Text style={onboardingStyles.label}>Country of residence</Text>
            <NativeEnumPicker
              accessibilityLabel="Country of residence"
              value={form.country}
              options={countryOptions}
              onChange={(value) => {
                setForm((current) => ({
                  ...current,
                  country: value,
                  displayUnits: defaultDisplayUnits(value),
                  residesInAsia: nextAsiaAnswer(current.residesInAsia, current.country, value),
                }))
              }}
              disabled={saving}
            />
            <Text style={onboardingStyles.hintInline}>
              Where you live. This is saved on your profile and chooses feet and pounds for the US.
            </Text>
            {prefersImperialDisplay(form.country) ? (
              <Text style={onboardingStyles.hintInline}>
                We show feet and pounds by default. Everything is stored in standard metric units.
              </Text>
            ) : null}
            <Text style={onboardingStyles.sectionLabel}>Demographics (optional)</Text>
            <Text style={onboardingStyles.hintInline}>
              Race and regional background help provide relevant health notices (such as stomach health screenings) and are stored with your profile.
            </Text>
            <Text style={onboardingStyles.label}>Race</Text>
            <NativeEnumPicker
              accessibilityLabel="Race"
              value={form.race}
              options={[{ label: 'Select race (optional)', value: '' }, ...RACE_OPTIONS]}
              onChange={(value) => updateForm('race', isRaceValue(value) ? value : '')}
              disabled={saving}
            />
            <Text style={onboardingStyles.sectionLabel}>Do you reside in any country in Asia? (optional)</Text>
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
                selected={form.residesInAsia === answer}
                onPress={() => updateForm('residesInAsia', answer)}
                disabled={saving}
              />
            ))}
            {isBarredResidency(form.country) ? <ResidencyBarNotice /> : null}
            {showHPyloriWarning(form.country, form.residesInAsia) ? <HPyloriWarning /> : null}
          </>
        )

      case 'body':
        return (
          <>
            <Text style={onboardingStyles.stepSubtitle}>
              Used to calculate your BMR and energy targets.
            </Text>
            <UnitToggle
              value={form.displayUnits}
              onChange={(value) => updateForm('displayUnits', value)}
              disabled={saving}
              country={form.country}
            />
            <Text style={onboardingStyles.sectionLabel}>Biological sex</Text>
            {(['female', 'male'] as Sex[]).map((sex) => (
              <SelectionCard
                key={sex}
                value={sex}
                label={sex === 'female' ? 'Female' : 'Male'}
                description="Used for the Mifflin–St Jeor metabolic rate formula"
                selected={form.sex === sex}
                onPress={(value) => updateForm('sex', value)}
                disabled={saving}
              />
            ))}
            <HeightPicker
              valueCm={form.height}
              displayUnits={form.displayUnits}
              onChange={(value) => updateForm('height', value)}
              disabled={saving}
            />
            <WeightPicker
              valueKg={form.weight}
              displayUnits={form.displayUnits}
              onChange={(value) => updateForm('weight', value)}
              disabled={saving}
            />
            <Text style={onboardingStyles.label}>Body fat % (optional)</Text>
            <TextInput
              value={bodyFatText}
              onChangeText={(value) => {
                setBodyFatText(value)
                const parsed = Number.parseFloat(value.replace(',', '.'))
                updateForm('bodyFatPct', value.trim() && isValidBodyFatPct(parsed) ? parsed : null)
              }}
              placeholder="e.g. 24"
              placeholderTextColor={onboardingColors.textMuted}
              keyboardType="decimal-pad"
              maxLength={4}
              editable={!saving}
              accessibilityLabel="Body fat percentage, optional"
              testID="body-fat-input"
              style={onboardingStyles.input}
            />
            <Text style={onboardingStyles.hintInline}>
              Optional. If measured by DEXA, calipers, or smart scale, kiloric uses Katch–McArdle lean mass instead of Mifflin–St Jeor.
            </Text>
          </>
        )

      case 'lifestyle':
        return (
          <>
            <Text style={onboardingStyles.stepSubtitle}>
              Select your activity level and target pace.
            </Text>
            <Text style={onboardingStyles.sectionLabel}>Activity level</Text>
            {ACTIVITY_OPTIONS.map((option) => (
              <SelectionCard
                key={option.value}
                value={option.value}
                label={option.label}
                description={option.description}
                selected={form.activity === option.value}
                onPress={(value) => updateForm('activity', value)}
                disabled={saving}
              />
            ))}
            <Text style={onboardingStyles.sectionLabel}>Primary goal</Text>
            {GOAL_OPTIONS.map((option) => (
              <SelectionCard
                key={option.value}
                value={option.value}
                label={option.label}
                description={option.description}
                selected={form.goal === option.value}
                onPress={(value) => updateForm('goal', value)}
                disabled={saving}
              />
            ))}
            {form.goal && form.goal !== 'maintain' ? (
              <>
                <Text style={onboardingStyles.sectionLabel}>Preferred pace</Text>
                {PACE_OPTIONS.map((option) => (
                  <SelectionCard
                    key={option.value}
                    value={option.value}
                    label={option.label}
                    description={`${formatPaceRate(
                      form.displayUnits,
                      goalPaceKgPerWeek(form.goal!, option.value, form.weight),
                    )} · ${option.description}`}
                    selected={form.pace === option.value}
                    onPress={(value) => updateForm('pace', value)}
                    disabled={saving}
                  />
                ))}
              </>
            ) : null}
          </>
        )

      case 'diet':
        return (
          <>
            <Text style={onboardingStyles.stepSubtitle}>
              Pick an eating style to set your baseline protein, carb, and fat split.
            </Text>
            {DIET_OPTIONS.map((option) => (
              <SelectionCard
                key={option.value}
                value={option.value}
                label={option.label}
                description={option.description}
                selected={form.diet === option.value}
                onPress={(value) => updateForm('diet', value)}
                disabled={saving}
              />
            ))}
          </>
        )

      case 'plan':
        return (
          <>
            <Text style={onboardingStyles.stepSubtitle}>
              Review your calculated plan. You can adjust any target below before saving.
            </Text>
            <UnitToggle
              value={form.displayUnits}
              onChange={(value) => updateForm('displayUnits', value)}
              disabled={saving}
              country={form.country}
            />
            <View style={onboardingStyles.infoCard}>
              <Text style={onboardingStyles.infoCardTitle}>Your goal</Text>
              <Text style={onboardingStyles.infoCardText}>{plan.goalPlain}</Text>
            </View>

            <View style={onboardingStyles.sectionHeaderRow}>
              <Text style={onboardingStyles.sectionLabel}>Daily targets</Text>
              {form.macroOverrides ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => updateForm('macroOverrides', null)}
                  disabled={saving}
                  hitSlop={8}
                >
                  <Text style={onboardingStyles.linkText}>Reset to suggested</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={onboardingStyles.label}>Calories</Text>
            <NativeIntPicker
              accessibilityLabel="Daily calories"
              value={macros.targetKcal}
              onChange={(value) => updateMacro('targetKcal', value ?? plan.targetKcal)}
              min={800}
              max={6000}
              step={10}
              disabled={saving}
              formatLabel={(value) => `${value} kcal`}
            />

            <Text style={onboardingStyles.label}>Protein</Text>
            <NativeIntPicker
              accessibilityLabel="Daily protein grams"
              value={macros.targetProtein}
              onChange={(value) => updateMacro('targetProtein', value ?? plan.targetProtein)}
              min={0}
              max={500}
              disabled={saving}
              formatLabel={(value) => `${value} g`}
            />

            <Text style={onboardingStyles.label}>Carbs</Text>
            <NativeIntPicker
              accessibilityLabel="Daily carbohydrate grams"
              value={macros.targetCarbs}
              onChange={(value) => updateMacro('targetCarbs', value ?? plan.targetCarbs)}
              min={0}
              max={1000}
              disabled={saving}
              formatLabel={(value) => `${value} g`}
            />

            <Text style={onboardingStyles.label}>Fat</Text>
            <NativeIntPicker
              accessibilityLabel="Daily fat grams"
              value={macros.targetFat}
              onChange={(value) => updateMacro('targetFat', value ?? plan.targetFat)}
              min={0}
              max={500}
              disabled={saving}
              formatLabel={(value) => `${value} g`}
            />

            {FEATURES.water ? (
              <Text style={onboardingStyles.label}>
                Hydration · {formatFluid(form.displayUnits, plan.dailyFluid)}
              </Text>
            ) : null}
            <Text style={onboardingStyles.hintInline}>TDEE (maintenance): {plan.tdee} kcal</Text>

            {renderTargetWeightPicker()}

            <Text style={onboardingStyles.label}>Bio (optional)</Text>
            <TextInput
              value={form.bio}
              onChangeText={(value) => updateForm('bio', value)}
              placeholder="Anything else you'd like to remember"
              placeholderTextColor={onboardingColors.textMuted}
              multiline
              maxLength={512}
              accessibilityLabel="Bio, optional"
              style={[onboardingStyles.input, onboardingStyles.multilineInput]}
            />

            <View style={onboardingStyles.infoCard}>
              <Text style={onboardingStyles.infoCardTitle}>Behind the numbers</Text>
              <Text style={onboardingStyles.infoCardText}>
                {plan.bmrFormula === 'katch_mcardle' ? 'Katch–McArdle' : 'Mifflin–St Jeor'} BMR {plan.bmr} kcal ·{' '}
                {weeklyDeficit > 0
                  ? `Weekly deficit: ${weeklyDeficit.toLocaleString()} kcal`
                  : weeklyDeficit < 0
                  ? `Weekly surplus: ${Math.abs(weeklyDeficit).toLocaleString()} kcal`
                  : 'Weekly balance: 0 kcal'}
                {form.goal && form.goal !== 'maintain'
                  ? ` · ${formatPaceRate(form.displayUnits, weeklyChangeKg)}`
                  : ''}
              </Text>
            </View>
          </>
        )

      default:
        return null
    }
  }

  if (loading || !stepInitialized || (user?.$id && loadingProfile)) {
    return (
      <View style={onboardingStyles.loading}>
        <ActivityIndicator color={onboardingColors.accent} size="large" />
        <Text accessibilityRole="text" style={onboardingStyles.loadingText}>Loading profile…</Text>
      </View>
    )
  }

  if (ageBlocked) {
    return (
      <AgeRestrictionScreen
        hasAccount={Boolean(user?.$id)}
        correcting={false}
        exiting={signingOut}
        onCorrect={() => {
          setAgeBlocked(false)
          setNavDirection('back')
          setStep('eligibility')
        }}
        onExit={() => {
          setSigningOut(true)
          allowLeaveRef.current = true
          void (async () => {
            try {
              if (user?.$id) await deleteAccount()
            } catch {
              // The user is still routed away and restricted features remain locked.
            } finally {
              setSigningOut(false)
              router.replace('/signin')
            }
          })()
        }}
      />
    )
  }

  return (
    <KeyboardAvoidingView
      style={onboardingStyles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ProgressHeader step={step} steps={numberingSteps} context={headerContext} />

      <ScrollView
        contentContainerStyle={[
          onboardingStyles.scrollContent,
          { paddingBottom: stackActions ? insets.bottom + 196 : insets.bottom + 124 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StepTransition stepKey={step} direction={navDirection}>
          {renderStepContent()}
        </StepTransition>

        {saveError ? (
          <View accessibilityRole="alert" style={onboardingStyles.errorBox}>
            <Text style={onboardingStyles.errorTitle}>Couldn&apos;t save your profile</Text>
            <Text style={onboardingStyles.errorText}>{saveError}</Text>
            <Pressable
              accessibilityLabel="Dismiss error"
              accessibilityRole="button"
              onPress={() => setSaveError(null)}
              hitSlop={8}
            >
              <Text style={onboardingStyles.errorDismiss}>Dismiss</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={[onboardingStyles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View
          style={[
            onboardingStyles.footerContent,
            stackActions && onboardingStyles.footerContentStacked,
          ]}
        >
          {isRequired && (step === 'welcome' || isBarredResidency(form.country)) ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setLogoutDialogVisible(true)}
              disabled={saving || signingOut}
              style={({ pressed }) => [
                onboardingStyles.secondaryButton,
                stackActions && onboardingStyles.buttonStacked,
                pressed && { opacity: 0.85 },
                (saving || signingOut) && { opacity: 0.35 },
              ]}
            >
              <Text
                style={[onboardingStyles.secondaryButtonText, { color: onboardingColors.danger }]}
              >
                Log out
              </Text>
            </Pressable>
          ) : !isRequired || !isFirstStep ? (
            <Pressable
              accessibilityRole="button"
              onPress={goBack}
              disabled={saving}
              style={({ pressed }) => [
                onboardingStyles.secondaryButton,
                stackActions && onboardingStyles.buttonStacked,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={onboardingStyles.secondaryButtonText}>
                {isFirstStep && !isRequired ? 'Cancel' : 'Back'}
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: saving || signingOut || residencyBarred, busy: saving }}
            onPress={goNext}
            disabled={saving || signingOut || residencyBarred}
            style={({ pressed }) => [
              onboardingStyles.primaryButton,
              stackActions && onboardingStyles.buttonStacked,
              pressed && { transform: [{ translateY: 2 }] },
              (saving || signingOut || residencyBarred) && onboardingStyles.primaryButtonDisabled,
            ]}
          >
            <View style={onboardingStyles.buttonContent}>
              {saving ? <ActivityIndicator color={onboardingColors.onAccent} size="small" /> : null}
              <Text style={onboardingStyles.primaryButtonText}>
                {residencyBarred
                  ? 'Unavailable'
                  : saving
                  ? isLastStep
                    ? 'Finishing setup…'
                    : step === 'password' && !user?.$id
                    ? 'Creating account…'
                    : 'Saving…'
                  : isLastStep
                    ? 'Finish setup'
                    : step === 'password' && !user?.$id
                      ? 'Create account'
                      : 'Continue'}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      <ConfirmDialog
        visible={logoutDialogVisible}
        title="Log out?"
        message="You'll need to sign in again to finish setting up your profile."
        confirmLabel="Log out"
        cancelLabel="Stay"
        destructive
        loading={signingOut}
        onConfirm={confirmLogout}
        onCancel={() => {
          if (!signingOut) setLogoutDialogVisible(false)
        }}
      />
    </KeyboardAvoidingView>
  )
}
