import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  Image,
  ActivityIndicator,
  Switch,
} from 'react-native'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FontFamilies, Radius, Spacing } from '../../constants/theme'
import {
  ThemePreference,
  type AccentId,
  type FontScale,
  type RadiusId,
  type ThemeColors,
  type ThemeId,
} from '@/src/lib/theme/tokens'
import { useSettings } from '@/context/SettingsContext'
import { useAuth } from '@/context/AuthContext'
import { useDialog } from '@/context/DialogContext'
import { useBackHandler } from '@/hooks/useBackHandler'
import { useOrientation } from '@/hooks/useOrientation'
import { useBreakpoints } from '@/hooks/useBreakpoints'
import { get, post, put } from '@/lib/api'
import { type User, type Target, type Meal } from '@/lib/types'
import { weightLabel, heightLabel, formatWeight, formatHeight } from '@/lib/units'
import { ThemedTextInput } from '@/components/ThemedTextInput'
import { ThemedSegmentedControl } from '@/components/ThemedSegmentedControl'
import { ThemedDropdown } from '@/components/ThemedDropdown'
import { SignInFlow } from '@/components/auth/AccountSignInFlow'
import {
  Toast,
  showError,
  showSuccess,
  showValidationError,
  showWarning,
} from '@/lib/toast'
import { webScreen } from '@/lib/webScreen'
import { validatePassword } from '@/lib/validation'
import {
  exportData,
  importData,
  clearAccountData,
  type ExportData,
} from '@/lib/dataManagement'
import {
  hasAICredentials,
  getAIModels,
  saveAICredentials,
  clearAICredentials,
  maskApiKey,
  type AIProvider,
} from '@/lib/ai'
import * as ImagePicker from 'expo-image-picker'
import { calculateNutritionGoals } from '@/lib/nutritionCalculations'
import { getUserFacingError } from '@/lib/apiErrors'
import { useScrollToTopOnFocus } from '@/hooks/useScrollToTopOnFocus'
import { announce } from '@/lib/announce'
import { DataState } from '@/components/ds/DataState'
import { Screen } from '@/components/ds/Screen'
import { Heading, Label, MutedText, SectionHeading } from '@/components/ds/Typography'
import { LoadingButton, Segmented, UButton } from '@/components/ds'
import { useTheme } from '@/src/lib/theme/context'
import { Slider, Swatches, ToggleRow } from '@/components/ds/FormControls'

// ─── Types ────────────────────────────────────────────────────────────────────

type SettingsTab = 'profile' | 'preferences' | 'appearance' | 'ai' | 'data' | 'account'

interface UserData extends User {
  target?: Target
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  colors,
}: {
  title: string
  children: React.ReactNode
  colors: ThemeColors
}) {
  return (
    <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
      {children}
    </View>
  )
}

function LabeledInput({
  label,
  colors,
  ...props
}: {
  label: string
  colors: ThemeColors
} & React.ComponentProps<typeof ThemedTextInput>) {
  return (
    <View style={s.field}>
      <Text style={[s.label, { color: colors.textSecondary }]}>{label}</Text>
      <ThemedTextInput
        variant="flat"
        backgroundColor={colors.surfaceRaised}
        borderColor={colors.border}
        style={s.input}
        {...props}
      />
    </View>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={s.row}>{children}</View>
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ConfigScreen() {
  const { colors, isDark, setColorMode, setTheme, setAccent, setRadius, setFontScale, setSystemBarsStyle } = useTheme()
  const { theme } = useUnistyles()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { token, isLoading: authLoading, signIn, signOut } = useAuth()
  const { preferences, updatePreference } = useSettings()
  const { confirmDestructive } = useDialog()
  const isLandscape = useOrientation()
  const { isDesktop } = useBreakpoints()
  const isWide = isLandscape || isDesktop
  const scrollRef = useRef<ScrollView>(null)

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [])

  useBackHandler(scrollToTop)
  useScrollToTopOnFocus(scrollRef, scrollToTop)

  const [tab, setTab] = useState<SettingsTab>('profile')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Profile
  const [user, setUser] = useState<UserData | null>(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState<'male' | 'female'>('male')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [avatarUri, setAvatarUri] = useState<string | null>(null)

  // Targets
  const [targetCalories, setTargetCalories] = useState('')
  const [targetProtein, setTargetProtein] = useState('')
  const [targetCarbs, setTargetCarbs] = useState('')
  const [targetFat, setTargetFat] = useState('')

  // Account
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  // AI
  const [aiProvider, setAiProvider] = useState<AIProvider>('openai')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiModel, setAiModel] = useState('gpt-4o-mini')
  const [hasAiKey, setHasAiKey] = useState(false)
  const [aiModels, setAiModels] = useState<{ id: string; name: string }[]>([])
  const [aiModelsLoading, setAiModelsLoading] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiSaving, setAiSaving] = useState(false)

  // Data
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [clearing, setClearing] = useState(false)

  const units = preferences.units
  const isMetric = units === 'metric'

  const applyUserData = useCallback((data: UserData) => {
    setUser(data)
    setUsername(data.username ?? '')
    setDisplayName(data.display_name ?? data.name ?? '')
    setBio(data.bio ?? '')
    setAge(data.age != null ? String(data.age) : '')
    setSex(data.sex ?? 'male')
    const userHeight = data.height ?? 0
    const userWeight = data.weight ?? 0
    setHeight(userHeight > 0 ? String(userHeight) : '')
    setWeight(userWeight > 0 ? String(userWeight) : '')
    setAvatarUri(data.avatar_url ?? data.avatar ?? null)
    if (data.target) {
      const t = data.target
      setTargetCalories(t.target_calories != null ? String(t.target_calories) : '')
      setTargetProtein(t.target_protein != null ? String(t.target_protein) : '')
      setTargetCarbs(t.target_carbs != null ? String(t.target_carbs) : '')
      setTargetFat(t.target_fat != null ? String(t.target_fat) : '')
    } else {
      setTargetCalories('')
      setTargetProtein('')
      setTargetCarbs('')
      setTargetFat('')
    }
  }, [])

  const loadUser = useCallback(async () => {
    setError(null)
    if (!token) return
    try {
      const data = await get<UserData>('/users/me', token)
      applyUserData(data)
    } catch (e) {
      setError(getUserFacingError(e, { action: 'load' }))
    }
  }, [token, applyUserData])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  // Check AI credentials
  useEffect(() => {
    if (!token) return
    hasAICredentials(token).then(setHasAiKey)
  }, [token])

  // Load AI models
  useEffect(() => {
    if (!token || !hasAiKey) return
    setAiModelsLoading(true)
    getAIModels(token)
      .then(models => setAiModels(models))
      .catch(e => showError(e, 'load'))
      .finally(() => setAiModelsLoading(false))
  }, [token, hasAiKey])

  // ─── Avatar ──────────────────────────────────────────────────────────────
  const pickAvatar = async () => {
    if (!token) return
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      showWarning('Photo library access is required to choose an avatar.')
      return
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      })
      if (result.canceled || !result.assets[0]) return
      const asset = result.assets[0]
      const avatarData = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri
      await put('/users/me', { avatar_url: avatarData }, token)
      setAvatarUri(avatarData)
      showSuccess('Avatar updated')
    } catch (e) {
      showError(e, 'save')
    }
  }

  const changeTab = (next: SettingsTab) => {
    setTab(next)
    scrollToTop()
  }

  // ─── Save Profile ────────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!token) return
    const ageNum = parseInt(age, 10)
    const heightNum = parseFloat(height)
    const weightNum = parseFloat(weight)
    if (age && (isNaN(ageNum) || ageNum < 1 || ageNum > 150)) {
      showValidationError('Please enter a valid age (1–150).')
      return
    }
    if (height && (isNaN(heightNum) || heightNum <= 0)) {
      showValidationError('Please enter a valid height.')
      return
    }
    if (weight && (isNaN(weightNum) || weightNum <= 0)) {
      showValidationError('Please enter a valid weight.')
      return
    }
    setSaving(true)
    try {
      await put('/users/me', {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        age: age ? ageNum : null,
        sex,
        height: height ? heightNum : null,
        weight: weight ? weightNum : null,
      }, token)
      showSuccess('Profile saved')
    } catch (e) {
      showError(e, 'save')
    } finally {
      setSaving(false)
    }
  }

  // ─── Save Targets ────────────────────────────────────────────────────────
  const saveTargets = async () => {
    if (!token) return
    const cal = parseFloat(targetCalories)
    if (targetCalories && (isNaN(cal) || cal <= 0 || cal > 20000)) {
      showValidationError('Please enter a valid calorie target (1–20,000).')
      return
    }
    const pro = targetProtein ? parseFloat(targetProtein) : null
    const carb = targetCarbs ? parseFloat(targetCarbs) : null
    const fat = targetFat ? parseFloat(targetFat) : null
    for (const [label, val] of [['Protein', pro], ['Carbs', carb], ['Fat', fat]] as const) {
      if (val != null && (isNaN(val) || val < 0 || val > 2000)) {
        showValidationError(`Please enter a valid ${label} target (0–2,000 g).`)
        return
      }
    }
    setSaving(true)
    try {
      const goals = calculateNutritionGoals({
        weight_kg: weightNum(),
        height_cm: heightNum(),
        age: parseInt(age, 10) || 30,
        sex,
        activity_level: preferences.activityLevel ?? 'moderate',
        goal: 'maintain',
      })
      await put('/targets', {
        target_calories: targetCalories ? cal : goals.calories,
        target_protein: pro ?? goals.protein,
        target_carbs: carb ?? goals.carbs,
        target_fat: fat ?? goals.fat,
      }, token)
      showSuccess('Targets saved')
    } catch (e) {
      showError(e, 'save')
    } finally {
      setSaving(false)
    }
  }

  function weightNum() { return parseFloat(weight) || 70 }
  function heightNum() { return parseFloat(height) || 170 }

  // ─── Change Password ─────────────────────────────────────────────────────
  const changePassword = async () => {
    if (!token) return
    if (!currentPassword) { showValidationError('Enter your current password.'); return }
    const pwError = validatePassword(newPassword)
    if (pwError) { showValidationError(pwError); return }
    if (newPassword !== confirmPassword) { showValidationError('New passwords do not match.'); return }
    setPasswordSaving(true)
    try {
      await put('/users/me/password', {
        current_password: currentPassword,
        new_password: newPassword,
      }, token)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showSuccess('Password changed')
    } catch (e) {
      showError(e, 'save')
    } finally {
      setPasswordSaving(false)
    }
  }

  // ─── AI ──────────────────────────────────────────────────────────────────
  const saveAI = async () => {
    if (!token) return
    if (!aiApiKey.trim()) { showValidationError('Enter an API key.'); return }
    setAiSaving(true)
    try {
      await saveAICredentials(token, aiProvider, aiApiKey.trim(), aiModel)
      setHasAiKey(true)
      setAiApiKey('')
      showSuccess('AI credentials saved')
    } catch (e) {
      showError(e, 'save')
    } finally {
      setAiSaving(false)
    }
  }

  const removeAI = async () => {
    if (!token) return
    const ok = await confirmDestructive({
      title: 'Remove AI credentials?',
      message: 'Your stored API key will be deleted.',
      confirmLabel: 'Remove',
    })
    if (!ok) return
    try {
      await clearAICredentials(token)
      setHasAiKey(false)
      setAiModels([])
      showSuccess('AI credentials removed')
    } catch (e) {
      showError(e, 'delete')
    }
  }

  // ─── Data Export / Import / Clear ────────────────────────────────────────
  const handleExport = async () => {
    if (!token) return
    setExporting(true)
    try {
      await exportData(token)
      showSuccess('Data exported')
    } catch (e) {
      showError(e, 'save')
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async () => {
    if (!token) return
    setImporting(true)
    try {
      await importData(token)
      showSuccess('Data imported')
      await loadUser()
    } catch (e) {
      showError(e, 'save')
    } finally {
      setImporting(false)
    }
  }

  const handleClearData = async () => {
    if (!token) return
    const ok = await confirmDestructive({
      title: 'Clear all data?',
      message: 'This will permanently delete all your meals, plans, and progress. This cannot be undone.',
      confirmLabel: 'Clear everything',
    })
    if (!ok) return
    setClearing(true)
    try {
      await clearAccountData(token)
      showSuccess('All data cleared')
    } catch (e) {
      showError(e, 'delete')
    } finally {
      setClearing(false)
    }
  }

  // ─── Sign Out ────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    try {
      await signOut()
      router.replace('/(tabs)')
    } catch (e) {
      showError(e, 'delete')
    }
  }

  // ─── Theme Handlers ──────────────────────────────────────────────────────
  const themeOptions: { value: ThemeId; label: string }[] = [
    { value: 'kiloric', label: 'Kiloric' },
    { value: 'paper', label: 'Paper' },
    { value: 'slate', label: 'Slate' },
    { value: 'amoled', label: 'AMOLED' },
    { value: 'forest', label: 'Forest' },
    { value: 'sakura', label: 'Sakura' },
    { value: 'mono', label: 'Mono' },
  ]

  const accentOptions: { value: AccentId; label: string; color: string }[] = [
    { value: 'sage', label: 'Sage', color: '#7FB69E' },
    { value: 'blue', label: 'Blue', color: '#5B8DEF' },
    { value: 'violet', label: 'Violet', color: '#9B7EDE' },
    { value: 'amber', label: 'Amber', color: '#D9A441' },
    { value: 'coral', label: 'Coral', color: '#E07856' },
  ]

  const radiusOptions: { value: RadiusId; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'sm', label: 'Small' },
    { value: 'md', label: 'Medium' },
    { value: 'lg', label: 'Large' },
    { value: 'xl', label: 'XL' },
    { value: 'full', label: 'Full' },
  ]

  const fontScaleOptions: { value: FontScale; label: string }[] = [
    { value: 'xs', label: 'XS' },
    { value: 'sm', label: 'S' },
    { value: 'md', label: 'M' },
    { value: 'lg', label: 'L' },
    { value: 'xl', label: 'XL' },
  ]

  const activityOptions = [
    { value: 'sedentary', label: 'Sedentary' },
    { value: 'light', label: 'Light' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'active', label: 'Active' },
    { value: 'very_active', label: 'Very Active' },
  ]

  const unitOptions = [
    { value: 'metric', label: 'Metric (kg, cm)' },
    { value: 'imperial', label: 'Imperial (lb, in)' },
  ]

  const weekStartOptions = [
    { value: 'sunday', label: 'Sunday' },
    { value: 'monday', label: 'Monday' },
  ]

  // ─── Tab Config ──────────────────────────────────────────────────────────
  const tabs: { key: SettingsTab; label: string; icon: string }[] = [
    { key: 'profile', label: 'Profile', icon: '👤' },
    { key: 'preferences', label: 'Preferences', icon: '⚙️' },
    { key: 'appearance', label: 'Appearance', icon: '🎨' },
    { key: 'ai', label: 'AI', icon: '🤖' },
    { key: 'data', label: 'Data', icon: '📦' },
    { key: 'account', label: 'Account', icon: '🔑' },
  ]

  // ─── Auth Gate ───────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    )
  }

  if (!token) {
    return (
      <Screen scroll contentStyle={s.authWrap}>
        <SignInFlow
          colors={colors}
          onSignIn={async (email, password) => {
            await signIn(email, password)
          }}
        />
      </Screen>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <Screen scroll scrollRef={scrollRef} contentStyle={s.content}>
      {/* Header */}
      <View style={s.header}>
        <Heading>Settings</Heading>
      </View>

      {error && (
        <DataState
          state="error"
          title="Could not load settings"
          description={error}
          actionLabel="Retry"
          onAction={() => void loadUser()}
          compact
        />
      )}

      {/* Tab Bar */}
      <View style={s.tabBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabBar}
        >
          {tabs.map(t => {
            const selected = tab === t.key
            return (
              <Pressable
                key={t.key}
                onPress={() => changeTab(t.key)}
                disabled={saving}
                accessibilityRole="tab"
                accessibilityState={{ selected, disabled: saving }}
                aria-selected={selected}
                style={[
                  s.tabBtn,
                  {
                    backgroundColor: selected ? colors.accent : colors.surface,
                    borderColor: selected ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text style={s.tabIcon}>{t.icon}</Text>
                <Text
                  style={[
                    s.tabLabel,
                    { color: selected ? colors.accentText : colors.textSecondary },
                  ]}
                >
                  {t.label}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      {/* ── Profile Tab ── */}
      {tab === 'profile' && (
        <View style={s.tabContent}>
          {/* Avatar */}
          <View style={s.avatarSection}>
            <Pressable onPress={pickAvatar} style={s.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.avatar} />
              ) : (
                <LinearGradient
                  colors={[colors.accent, colors.accentSoft]}
                  style={s.avatar}
                >
                  <Text style={[s.avatarInitial, { color: colors.accentText }]}>
                    {(displayName || username || '?')[0].toUpperCase()}
                  </Text>
                </LinearGradient>
              )}
              <View style={[s.avatarEdit, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ fontSize: 12 }}>✏️</Text>
              </View>
            </Pressable>
            <View>
              <Text style={[s.avatarName, { color: colors.text }]}>
                {displayName || username || 'Your Profile'}
              </Text>
              <Text style={[s.avatarSub, { color: colors.textSecondary }]}>
                @{username || 'user'}
              </Text>
            </View>
          </View>

          <SectionCard title="Personal Info" colors={colors}>
            <LabeledInput
              label="Display Name"
              colors={colors}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
            />
            <LabeledInput
              label="Bio"
              colors={colors}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              multiline
              numberOfLines={3}
              style={[s.input, s.textArea]}
            />
            <Row>
              <View style={s.flex1}>
                <LabeledInput
                  label="Age"
                  colors={colors}
                  value={age}
                  onChangeText={setAge}
                  placeholder="30"
                  keyboardType="numeric"
                />
              </View>
              <View style={s.flex1}>
                <Text style={[s.label, { color: colors.textSecondary }]}>Sex</Text>
                <ThemedSegmentedControl
                  values={['Male', 'Female']}
                  selectedIndex={sex === 'male' ? 0 : 1}
                  onChange={i => setSex(i === 0 ? 'male' : 'female')}
                  colors={colors}
                />
              </View>
            </Row>
            <Row>
              <View style={s.flex1}>
                <LabeledInput
                  label={`Height (${heightLabel(units)})`}
                  colors={colors}
                  value={height}
                  onChangeText={setHeight}
                  placeholder={isMetric ? '170' : '67'}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={s.flex1}>
                <LabeledInput
                  label={`Weight (${weightLabel(units)})`}
                  colors={colors}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder={isMetric ? '70' : '154'}
                  keyboardType="decimal-pad"
                />
              </View>
            </Row>
            <UButton
              title="Save Profile"
              onPress={saveProfile}
              loading={saving}
              style={s.saveBtn}
            />
          </SectionCard>

          <SectionCard title="Nutrition Targets" colors={colors}>
            <LabeledInput
              label="Daily Calories"
              colors={colors}
              value={targetCalories}
              onChangeText={setTargetCalories}
              placeholder="2000"
              keyboardType="numeric"
            />
            <Row>
              <View style={s.flex1}>
                <LabeledInput
                  label="Protein (g)"
                  colors={colors}
                  value={targetProtein}
                  onChangeText={setTargetProtein}
                  placeholder="150"
                  keyboardType="numeric"
                />
              </View>
              <View style={s.flex1}>
                <LabeledInput
                  label="Carbs (g)"
                  colors={colors}
                  value={targetCarbs}
                  onChangeText={setTargetCarbs}
                  placeholder="250"
                  keyboardType="numeric"
                />
              </View>
              <View style={s.flex1}>
                <LabeledInput
                  label="Fat (g)"
                  colors={colors}
                  value={targetFat}
                  onChangeText={setTargetFat}
                  placeholder="65"
                  keyboardType="numeric"
                />
              </View>
            </Row>
            <UButton
              title="Save Targets"
              onPress={saveTargets}
              loading={saving}
              style={s.saveBtn}
            />
          </SectionCard>
        </View>
      )}

      {/* ── Preferences Tab ── */}
      {tab === 'preferences' && (
        <View style={s.tabContent}>
          <SectionCard title="Units & Locale" colors={colors}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Units</Text>
            <ThemedSegmentedControl
              values={unitOptions.map(o => o.label)}
              selectedIndex={units === 'metric' ? 0 : 1}
              onChange={i => updatePreference('units', i === 0 ? 'metric' : 'imperial')}
              colors={colors}
            />

            <Text style={[s.label, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
              Week Starts On
            </Text>
            <ThemedSegmentedControl
              values={weekStartOptions.map(o => o.label)}
              selectedIndex={preferences.weekStart === 'monday' ? 1 : 0}
              onChange={i => updatePreference('weekStart', i === 1 ? 'monday' : 'sunday')}
              colors={colors}
            />
          </SectionCard>

          <SectionCard title="Activity Level" colors={colors}>
            <Text style={[s.label, { color: colors.textSecondary }]}>
              Used for calorie goal calculations
            </Text>
            <ThemedDropdown
              options={activityOptions}
              value={preferences.activityLevel ?? 'moderate'}
              onSelect={v => updatePreference('activityLevel', v as any)}
              colors={colors}
            />
          </SectionCard>

          <SectionCard title="Notifications" colors={colors}>
            <View style={s.toggleRow}>
              <View style={s.flex1}>
                <Text style={[s.toggleLabel, { color: colors.text }]}>Meal Reminders</Text>
                <Text style={[s.toggleDesc, { color: colors.textSecondary }]}>
                  Get reminded to log your meals
                </Text>
              </View>
              <Switch
                value={preferences.mealReminders ?? false}
                onValueChange={v => updatePreference('mealReminders', v)}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.surface}
              />
            </View>
            <View style={s.toggleRow}>
              <View style={s.flex1}>
                <Text style={[s.toggleLabel, { color: colors.text }]}>Weekly Report</Text>
                <Text style={[s.toggleDesc, { color: colors.textSecondary }]}>
                  Summary of your weekly progress
                </Text>
              </View>
              <Switch
                value={preferences.weeklyReport ?? false}
                onValueChange={v => updatePreference('weeklyReport', v)}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.surface}
              />
            </View>
          </SectionCard>
        </View>
      )}

      {/* ── Appearance Tab ── */}
      {tab === 'appearance' && (
        <View style={s.tabContent}>
          <SectionCard title="Color Mode" colors={colors}>
            <ThemedSegmentedControl
              values={['Light', 'Dark', 'System']}
              selectedIndex={
                ThemePreference.colorMode === 'dark' ? 1 :
                ThemePreference.colorMode === 'system' ? 2 : 0
              }
              onChange={i => {
                const mode = i === 1 ? 'dark' : i === 2 ? 'system' : 'light'
                setColorMode(mode)
              }}
              colors={colors}
            />
          </SectionCard>

          <SectionCard title="Theme" colors={colors}>
            <View style={s.themeGrid}>
              {themeOptions.map(opt => {
                const active = ThemePreference.theme === opt.value
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setTheme(opt.value)}
                    style={[
                      s.themeOption,
                      {
                        backgroundColor: active ? colors.accentSoft : colors.surfaceRaised,
                        borderColor: active ? colors.accent : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.themeLabel,
                        { color: active ? colors.accent : colors.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </SectionCard>

          <SectionCard title="Accent Color" colors={colors}>
            <View style={s.accentRow}>
              {accentOptions.map(opt => {
                const active = ThemePreference.accent === opt.value
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setAccent(opt.value)}
                    style={[
                      s.accentOption,
                      {
                        backgroundColor: opt.color,
                        borderColor: active ? colors.text : 'transparent',
                        borderWidth: active ? 2.5 : 0,
                      },
                    ]}
                    accessibilityLabel={opt.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  />
                )
              })}
            </View>
          </SectionCard>

          <SectionCard title="Corner Radius" colors={colors}>
            <ThemedSegmentedControl
              values={radiusOptions.map(o => o.label)}
              selectedIndex={radiusOptions.findIndex(o => o.value === ThemePreference.radius)}
              onChange={i => setRadius(radiusOptions[i].value)}
              colors={colors}
            />
          </SectionCard>

          <SectionCard title="Font Size" colors={colors}>
            <ThemedSegmentedControl
              values={fontScaleOptions.map(o => o.label)}
              selectedIndex={fontScaleOptions.findIndex(o => o.value === ThemePreference.fontScale)}
              onChange={i => setFontScale(fontScaleOptions[i].value)}
              colors={colors}
            />
          </SectionCard>

          {Platform.OS !== 'web' && (
            <SectionCard title="System Bars" colors={colors}>
              <View style={s.toggleRow}>
                <View style={s.flex1}>
                  <Text style={[s.toggleLabel, { color: colors.text }]}>Match Theme</Text>
                  <Text style={[s.toggleDesc, { color: colors.textSecondary }]}>
                    Automatically style status bar and navigation bar
                  </Text>
                </View>
                <Switch
                  value={ThemePreference.systemBarsStyle}
                  onValueChange={v => setSystemBarsStyle(v)}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={colors.surface}
                />
              </View>
            </SectionCard>
          )}
        </View>
      )}

      {/* ── AI Tab ── */}
      {tab === 'ai' && (
        <View style={s.tabContent}>
          <SectionCard title="AI Assistant" colors={colors}>
            <Text style={[s.description, { color: colors.textSecondary }]}>
              Connect an AI provider to enable smart food suggestions, meal analysis, and nutrition insights.
            </Text>

            <Text style={[s.label, { color: colors.textSecondary }]}>Provider</Text>
            <ThemedSegmentedControl
              values={['OpenAI', 'Anthropic', 'Google', 'Custom']}
              selectedIndex={
                aiProvider === 'openai' ? 0 :
                aiProvider === 'anthropic' ? 1 :
                aiProvider === 'google' ? 2 : 3
              }
              onChange={i => {
                const providers: AIProvider[] = ['openai', 'anthropic', 'google', 'custom']
                setAiProvider(providers[i])
              }}
              colors={colors}
            />

            {hasAiKey ? (
              <View style={{ marginTop: Spacing.lg }}>
                <View style={[s.aiKeyDisplay, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
                  <Text style={[s.aiKeyText, { color: colors.textSecondary }]}>
                    🔑 API key configured
                  </Text>
                  <Text style={[s.aiKeyMask, { color: colors.textMuted }]}>
                    {maskApiKey('configured')}
                  </Text>
                </View>
                {aiModelsLoading ? (
                  <ActivityIndicator color={colors.accent} style={{ marginTop: Spacing.md }} />
                ) : aiModels.length > 0 ? (
                  <>
                    <Text style={[s.label, { color: colors.textSecondary, marginTop: Spacing.md }]}>
                      Model
                    </Text>
                    <ThemedDropdown
                      options={aiModels.map(m => ({ value: m.id, label: m.name }))}
                      value={aiModel}
                      onSelect={setAiModel}
                      colors={colors}
                    />
                  </>
                ) : null}
                <UButton
                  title="Remove API Key"
                  onPress={removeAI}
                  variant="danger"
                  style={s.saveBtn}
                />
              </View>
            ) : (
              <View style={{ marginTop: Spacing.lg }}>
                <LabeledInput
                  label="API Key"
                  colors={colors}
                  value={aiApiKey}
                  onChangeText={setAiApiKey}
                  placeholder="sk-..."
                  secureTextEntry
                  autoCapitalize="none"
                />
                <LabeledInput
                  label="Model"
                  colors={colors}
                  value={aiModel}
                  onChangeText={setAiModel}
                  placeholder="gpt-4o-mini"
                  autoCapitalize="none"
                />
                <UButton
                  title="Save AI Credentials"
                  onPress={saveAI}
                  loading={aiSaving}
                  style={s.saveBtn}
                />
              </View>
            )}
          </SectionCard>

          <SectionCard title="AI Features" colors={colors}>
            <View style={s.toggleRow}>
              <View style={s.flex1}>
                <Text style={[s.toggleLabel, { color: colors.text }]}>Smart Suggestions</Text>
                <Text style={[s.toggleDesc, { color: colors.textSecondary }]}>
                  AI-powered food and meal recommendations
                </Text>
              </View>
              <Switch
                value={aiEnabled}
                onValueChange={setAiEnabled}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.surface}
                disabled={!hasAiKey}
              />
            </View>
          </SectionCard>
        </View>
      )}

      {/* ── Data Tab ── */}
      {tab === 'data' && (
        <View style={s.tabContent}>
          <SectionCard title="Export Data" colors={colors}>
            <Text style={[s.description, { color: colors.textSecondary }]}>
              Download all your meals, plans, progress, and settings as a JSON file.
            </Text>
            <UButton
              title="Export All Data"
              onPress={handleExport}
              loading={exporting}
              variant="secondary"
              style={s.saveBtn}
            />
          </SectionCard>

          <SectionCard title="Import Data" colors={colors}>
            <Text style={[s.description, { color: colors.textSecondary }]}>
              Restore data from a previously exported Kiloric backup file.
            </Text>
            <UButton
              title="Import Backup"
              onPress={handleImport}
              loading={importing}
              variant="secondary"
              style={s.saveBtn}
            />
          </SectionCard>

          <SectionCard title="Danger Zone" colors={colors}>
            <Text style={[s.description, { color: colors.textSecondary }]}>
              Permanently delete all your meals, plans, and progress data. Your account will remain active.
            </Text>
            <UButton
              title="Clear All Data"
              onPress={handleClearData}
              loading={clearing}
              variant="danger"
              style={s.saveBtn}
            />
          </SectionCard>
        </View>
      )}

      {/* ── Account Tab ── */}
      {tab === 'account' && (
        <View style={s.tabContent}>
          <SectionCard title="Change Password" colors={colors}>
            <LabeledInput
              label="Current Password"
              colors={colors}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              secureTextEntry
            />
            <LabeledInput
              label="New Password"
              colors={colors}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              secureTextEntry
            />
            <LabeledInput
              label="Confirm New Password"
              colors={colors}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry
            />
            <UButton
              title="Change Password"
              onPress={changePassword}
              loading={passwordSaving}
              style={s.saveBtn}
            />
          </SectionCard>

          <SectionCard title="Session" colors={colors}>
            <Text style={[s.description, { color: colors.textSecondary }]}>
              Signed in as @{username}
            </Text>
            <UButton
              title="Sign Out"
              onPress={handleSignOut}
              variant="danger"
              style={s.saveBtn}
            />
          </SectionCard>
        </View>
      )}

      {/* Bottom padding */}
      <View style={{ height: Spacing['5xl'] + insets.bottom }} />
    </Screen>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create(theme => ({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['3xl'],
  },
  content: {
    paddingHorizontal: Spacing.lg,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.lg,
  },
  tabBarWrap: {
    marginBottom: Spacing.xl,
  },
  tabBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  tabIcon: {
    fontSize: 14,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: FontFamilies.medium,
    fontWeight: '500',
  },
  tabContent: {
    gap: Spacing.xl,
  },
  section: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: FontFamilies.semiBold,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 13,
    fontFamily: FontFamilies.medium,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  input: {
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  flex1: {
    flex: 1,
  },
  saveBtn: {
    marginTop: Spacing.sm,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 28,
    fontFamily: FontFamilies.bold,
    fontWeight: '700',
  },
  avatarEdit: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarName: {
    fontSize: 20,
    fontFamily: FontFamilies.bold,
    fontWeight: '700',
  },
  avatarSub: {
    fontSize: 14,
    fontFamily: FontFamilies.regular,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: FontFamilies.medium,
    fontWeight: '500',
  },
  toggleDesc: {
    fontSize: 13,
    fontFamily: FontFamilies.regular,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    fontFamily: FontFamilies.regular,
    lineHeight: 20,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  themeOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minWidth: 90,
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 14,
    fontFamily: FontFamilies.medium,
    fontWeight: '500',
  },
  accentRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  accentOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  aiKeyDisplay: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  aiKeyText: {
    fontSize: 14,
    fontFamily: FontFamilies.medium,
    fontWeight: '500',
  },
  aiKeyMask: {
    fontSize: 13,
    fontFamily: FontFamilies.mono,
  },
}))
