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
  DEFAULT_DATE_OF_BIRTH,
  AUTH_ONBOARDING_STEPS,
  getOnboardingSteps,
  type MacroOverrides,
  type OnboardingFormState,
  type OnboardingStep,
} from '@/components/onboarding/types'
import { UnitToggle } from '@/components/onboarding/UnitToggle'
import { showApiError } from '@/lib/apiErrors'
import { isValidEmail, isValidPassword } from '@/lib/authValidation'
import { useAuth } from '@/lib/AuthContext'
import { useTheme } from '@/lib/theme/ThemeContext'
import { useOnboardingStyles } from '@/lib/theme/useThemedStyles'
import { COUNTRY_OPTIONS } from '@/lib/countries'
import {
  ACTIVITY_OPTIONS,
  buildNutritionPlan,
  calculateWeeklyDeficit,
  DIET_OPTIONS,
  estimateWeeklyWeightChangeKg,
  GOAL_OPTIONS,
  PACE_OPTIONS,
  type NutritionPlan,
  type Sex,
} from '@/lib/nutrition'
import {
  dateToIso,
  DEFAULT_PROFILE_ROLE,
  formatProfileSaveError,
  getProfile,
  isProfileComplete,
  saveProfileFields,
} from '@/lib/profile'
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
  View,
} from 'react-native'

function parseProfileDate(value?: string): Date {
  if (!value) return DEFAULT_DATE_OF_BIRTH
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? DEFAULT_DATE_OF_BIRTH : parsed
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
  const { user, loading, signOut, signUp } = useAuth()
  const router = useRouter()
  const navigation = useNavigation()
  const { onboardingColors } = useTheme()
  const onboardingStyles = useOnboardingStyles(makeOnboardingStyles)
  const allowLeaveRef = useRef(false)

  const [step, setStep] = useState<OnboardingStep>('email')
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

  const visibleSteps = useMemo(
    () => getOnboardingSteps(Boolean(user?.$id)),
    [user?.$id],
  )
  const isRequired = Boolean(user?.$id) && !profileComplete
  const stepIndex = visibleSteps.indexOf(step)
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === visibleSteps.length - 1

  const plan: NutritionPlan = useMemo(
    () =>
      buildNutritionPlan({
        dateOfBirth: form.dateOfBirth,
        sex: form.sex,
        heightCm: form.height,
        weightKg: form.weight,
        activity: form.activity,
        goal: form.goal,
        pace: form.pace,
        diet: form.diet,
        targetWeight: form.targetWeight,
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
    setStep(user?.$id ? 'welcome' : 'email')
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

    getProfile(user.$id)
      .then((profile) => {
        if (!active) return

        const complete = isProfileComplete(profile)
        setProfileComplete(complete)

        const defaults = createDefaultFormState(user.email)
        if (!profile) {
          setForm(defaults)
          return
        }

        const country = profile.country ?? defaults.country
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
          bio: profile.bio ?? '',
          sex: defaults.sex,
          height: body.heightCm,
          weight: body.weightKg,
          activity: defaults.activity,
          goal: defaults.goal,
          pace: defaults.pace,
          diet: defaults.diet,
          targetWeight: normalizeStoredTargetWeightKg(
            country,
            profile.target_weight,
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
      case 'body':
        if (form.height <= 0 || form.weight <= 0) return 'Enter your height and weight.'
        return null
      case 'lifestyle':
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
    const error = validateStep(step)
    if (error) {
      Alert.alert('Almost there', error)
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
        showApiError(err, 'appwrite')
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
      if (!isRequired) router.back()
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
      showApiError(err, 'appwrite')
    } finally {
      setSigningOut(false)
    }
  }

  async function handleSave() {
    if (!user?.$id || !user.email) {
      Alert.alert('Not signed in', 'Your account needs an email before saving a profile.')
      return
    }

    const targetKg = roundMetric(form.targetWeight ?? plan.targetWeight)
    const goalPlain = appendDisplayUnitsToGoalPlain(plan.goalPlain, form.displayUnits)
    const weeklyDeficitToSave = calculateWeeklyDeficit(plan.tdee, macros.targetKcal)

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
        target_kcal: macros.targetKcal,
        target_protein: macros.targetProtein,
        target_carbs: macros.targetCarbs,
        target_fat: macros.targetFat,
        daily_fluid: plan.dailyFluid,
        TDEE: plan.tdee,
        goal_plain: goalPlain,
        target_weight: targetKg,
        weekly_deficit: weeklyDeficitToSave,
      })

      allowLeaveRef.current = true
      setSaveError(null)
      if (isRequired) {
        router.replace('/onboard_success')
      } else {
        router.back()
      }
    } catch (err) {
      const message = formatProfileSaveError(err)
      console.error('[onboarding] save failed:', message, err)
      showApiError(message, 'appwrite')
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
              Start with the email you want to use for your CalCount account.
            </Text>
            {authError ? (
              <View style={onboardingStyles.errorBox}>
                <Text style={onboardingStyles.errorTitle}>Something went wrong</Text>
                <Text style={onboardingStyles.errorText}>{authError}</Text>
                <Pressable onPress={() => setAuthError(null)} hitSlop={8}>
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
              autoFocus
              style={onboardingStyles.input}
            />
          </>
        )

      case 'password':
        return (
          <>
            <Text style={onboardingStyles.stepSubtitle}>{authEmail.trim()}</Text>
            {authError ? (
              <View style={onboardingStyles.errorBox}>
                <Text style={onboardingStyles.errorTitle}>Something went wrong</Text>
                <Text style={onboardingStyles.errorText}>{authError}</Text>
                <Pressable onPress={() => setAuthError(null)} hitSlop={8}>
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
              autoFocus
              style={onboardingStyles.input}
            />
          </>
        )

      case 'welcome':
        return (
          <>
            <Text style={onboardingStyles.stepSubtitle}>
              A quick setup so CalCount can personalize calories, macros, and hydration for you.
            </Text>
            <View style={onboardingStyles.infoCard}>
              <Text style={onboardingStyles.infoCardTitle}>We&apos;ll handle the math</Text>
              <Text style={onboardingStyles.infoCardText}>
                TDEE, macro targets, weekly pace, and hydration are calculated automatically from
                your body stats and goals.
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
              style={onboardingStyles.input}
            />
            <Text style={onboardingStyles.label}>Date of birth</Text>
            <NativeDatePicker
              value={form.dateOfBirth}
              onChange={(value) => updateForm('dateOfBirth', value)}
              disabled={saving}
              minimumDate={new Date(1900, 0, 1)}
              maximumDate={new Date()}
            />
            <Text style={onboardingStyles.label}>Country</Text>
            <NativeEnumPicker
              value={form.country}
              options={COUNTRY_OPTIONS}
              onChange={(value) => {
                setForm((current) => ({
                  ...current,
                  country: value,
                  displayUnits: defaultDisplayUnits(value),
                }))
              }}
              disabled={saving}
            />
            {prefersImperialDisplay(form.country) ? (
              <Text style={onboardingStyles.hintInline}>
                We&apos;ll show feet and pounds by default — everything is saved in standard metric.
              </Text>
            ) : null}
          </>
        )

      case 'body':
        return (
          <>
            <Text style={onboardingStyles.stepSubtitle}>
              These details power your calorie and macro recommendations.
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
          </>
        )

      case 'lifestyle':
        return (
          <>
            <Text style={onboardingStyles.stepSubtitle}>
              Tell us how active you are and what you want to achieve.
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
            {form.goal !== 'maintain' ? (
              <>
                <Text style={onboardingStyles.sectionLabel}>Preferred pace</Text>
                {PACE_OPTIONS.map((option) => (
                  <SelectionCard
                    key={option.value}
                    value={option.value}
                    label={option.label}
                    description={formatPaceRate(form.displayUnits, {
                      gentle: 0.25,
                      moderate: 0.5,
                      aggressive: 0.75,
                    }[option.value])}
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
              Pick an eating style — we&apos;ll tune your macro split to match.
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
              Here&apos;s your personalized plan. Tweak anything below before you finish.
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
                <Pressable onPress={() => updateForm('macroOverrides', null)} disabled={saving}>
                  <Text style={onboardingStyles.linkText}>Reset to suggested</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={onboardingStyles.label}>Calories</Text>
            <NativeIntPicker
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
              value={macros.targetProtein}
              onChange={(value) => updateMacro('targetProtein', value ?? plan.targetProtein)}
              min={0}
              max={500}
              disabled={saving}
              formatLabel={(value) => `${value} g`}
            />

            <Text style={onboardingStyles.label}>Carbs</Text>
            <NativeIntPicker
              value={macros.targetCarbs}
              onChange={(value) => updateMacro('targetCarbs', value ?? plan.targetCarbs)}
              min={0}
              max={1000}
              disabled={saving}
              formatLabel={(value) => `${value} g`}
            />

            <Text style={onboardingStyles.label}>Fat</Text>
            <NativeIntPicker
              value={macros.targetFat}
              onChange={(value) => updateMacro('targetFat', value ?? plan.targetFat)}
              min={0}
              max={500}
              disabled={saving}
              formatLabel={(value) => `${value} g`}
            />

            <Text style={onboardingStyles.label}>
              Hydration · {formatFluid(form.displayUnits, plan.dailyFluid)}
            </Text>
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
              style={[onboardingStyles.input, onboardingStyles.multilineInput]}
            />

            <View style={onboardingStyles.infoCard}>
              <Text style={onboardingStyles.infoCardTitle}>Behind the numbers</Text>
              <Text style={onboardingStyles.infoCardText}>
                BMR {plan.bmr} kcal · Weekly energy balance {weeklyDeficit > 0 ? '+' : ''}
                {weeklyDeficit} kcal
                {form.goal !== 'maintain'
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
        <Text style={{ color: onboardingColors.textMuted, marginTop: 12 }}>Loading profile…</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={onboardingStyles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ProgressHeader step={step} steps={visibleSteps} isRequired={isRequired} />

      <ScrollView contentContainerStyle={onboardingStyles.scrollContent} keyboardShouldPersistTaps="handled">
        <StepTransition stepKey={step} direction={navDirection}>
          {renderStepContent()}
        </StepTransition>

        {saveError ? (
          <View style={onboardingStyles.errorBox}>
            <Text style={onboardingStyles.errorTitle}>Couldn&apos;t save your profile</Text>
            <Text style={onboardingStyles.errorText}>{saveError}</Text>
            <Pressable onPress={() => setSaveError(null)} hitSlop={8}>
              <Text style={onboardingStyles.errorDismiss}>Dismiss</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={onboardingStyles.footer}>
        {isRequired && step === 'welcome' ? (
          <Pressable
            onPress={() => setLogoutDialogVisible(true)}
            disabled={saving || signingOut}
            style={({ pressed }) => [
              onboardingStyles.secondaryButton,
              pressed && { opacity: 0.85 },
              (saving || signingOut) && { opacity: 0.35 },
            ]}
          >
            <Text style={[onboardingStyles.secondaryButtonText, { color: onboardingColors.danger }]}>
              Log out
            </Text>
          </Pressable>
        ) : !isRequired || !isFirstStep ? (
          <Pressable
            onPress={goBack}
            disabled={saving}
            style={({ pressed }) => [
              onboardingStyles.secondaryButton,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={onboardingStyles.secondaryButtonText}>
              {isFirstStep && !isRequired ? 'Cancel' : 'Back'}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={goNext}
          disabled={saving || signingOut}
          style={({ pressed }) => [
            onboardingStyles.primaryButton,
            pressed && { transform: [{ translateY: 2 }] },
            (saving || signingOut) && onboardingStyles.primaryButtonDisabled,
          ]}
        >
          <Text style={onboardingStyles.primaryButtonText}>
            {saving
              ? step === 'password' && !user?.$id
                ? 'Creating account…'
                : 'Saving…'
              : isLastStep
                ? 'Finish setup'
                : step === 'password' && !user?.$id
                  ? 'Create account'
                  : 'Continue'}
          </Text>
        </Pressable>
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
