import { showApiError } from '@/lib/apiErrors';
import { MotionView } from '@/components/MotionView';
import { useAuth } from '@/lib/AuthContext';
import {
    submitFoodContribution,
    type OffNumberField,
    type OffStringField,
} from '@/lib/foodContributions';
import { useTheme } from '@/lib/theme/ThemeContext';
import { useAppLayout } from '@/lib/theme/layout';
import { borderRadius, spacing, type ThemeColors } from '@/lib/theme/tokens';
import { typography } from '@/lib/theme/typography';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type PhotoState = {
  uri: string
  mimeType?: string | null
  fileName?: string | null
  fileSize?: number | null
}

const PRIMARY_MACROS: { key: OffNumberField; label: string; placeholder: string }[] = [
  { key: 'energy-kcal_100g', label: 'Energy (kcal)', placeholder: 'e.g. 250' },
  { key: 'proteins_100g', label: 'Protein (g)', placeholder: 'e.g. 10' },
  { key: 'carbohydrates_100g', label: 'Carbohydrate (g)', placeholder: 'e.g. 30' },
  { key: 'fat_100g', label: 'Fat (g)', placeholder: 'e.g. 8' },
  { key: 'fiber_100g', label: 'Fiber (g)', placeholder: 'Optional' },
  { key: 'sugars_100g', label: 'Sugars (g)', placeholder: 'Optional' },
  { key: 'sodium_100g', label: 'Sodium (g)', placeholder: 'Optional' },
]

const MORE_STRINGS: { key: OffStringField; label: string }[] = [
  { key: 'brands', label: 'Brand' },
  { key: 'categories', label: 'Categories' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'serving_size', label: 'Serving size' },
  { key: 'allergens', label: 'Allergens' },
  { key: 'traces_tags', label: 'Traces' },
  { key: 'nutriscore_grade', label: 'Nutri-Score' },
  { key: 'ecoscore_grade', label: 'Eco-Score' },
]

const MORE_NUMBERS: { key: OffNumberField; label: string }[] = [
  { key: 'serving_quantity', label: 'Serving quantity (g)' },
  { key: 'energy-kj_100g', label: 'Energy (kJ)' },
  { key: 'added-sugars_100g', label: 'Added sugars (g)' },
  { key: 'polyols_100g', label: 'Polyols (g)' },
  { key: 'saturated-fat_100g', label: 'Saturated fat (g)' },
  { key: 'trans-fat_100g', label: 'Trans fat (g)' },
  { key: 'monounsaturated-fat_100g', label: 'Monounsaturated fat (g)' },
  { key: 'polyunsaturated-fat_100g', label: 'Polyunsaturated fat (g)' },
  { key: 'cholesterol_100g', label: 'Cholesterol (g)' },
  { key: 'vitamin-a_100g', label: 'Vitamin A (g)' },
  { key: 'vitamin-c_100g', label: 'Vitamin C (g)' },
  { key: 'vitamin-d_100g', label: 'Vitamin D (g)' },
  { key: 'vitamin-b12_100g', label: 'Vitamin B12 (g)' },
  { key: 'calcium_100g', label: 'Calcium (g)' },
  { key: 'iron_100g', label: 'Iron (g)' },
  { key: 'potassium_100g', label: 'Potassium (g)' },
  { key: 'magnesium_100g', label: 'Magnesium (g)' },
  { key: 'caffeine_100g', label: 'Caffeine (g)' },
  { key: 'taurine_100g', label: 'Taurine (g)' },
  { key: 'carbon-footprint_100g', label: 'Carbon footprint (g CO₂e)' },
  { key: 'nova_group', label: 'NOVA group' },
  { key: 'additives_n', label: 'Additives count' },
]

/** Route params use snake_case Appwrite column names; map back to OFF keys. */
const PARAM_TO_OFF_STRING: Record<string, OffStringField> = {
  brands: 'brands',
  categories: 'categories',
  quantity: 'quantity',
  serving_size: 'serving_size',
  allergens: 'allergens',
  traces_tags: 'traces_tags',
  nutriscore_grade: 'nutriscore_grade',
  ecoscore_grade: 'ecoscore_grade',
}

const PARAM_TO_OFF_NUMBER: Record<string, OffNumberField> = {
  serving_quantity: 'serving_quantity',
  energy_kcal_100g: 'energy-kcal_100g',
  energy_kj_100g: 'energy-kj_100g',
  proteins_100g: 'proteins_100g',
  carbohydrates_100g: 'carbohydrates_100g',
  fat_100g: 'fat_100g',
  fiber_100g: 'fiber_100g',
  sugars_100g: 'sugars_100g',
  added_sugars_100g: 'added-sugars_100g',
  polyols_100g: 'polyols_100g',
  saturated_fat_100g: 'saturated-fat_100g',
  trans_fat_100g: 'trans-fat_100g',
  monounsaturated_fat_100g: 'monounsaturated-fat_100g',
  polyunsaturated_fat_100g: 'polyunsaturated-fat_100g',
  sodium_100g: 'sodium_100g',
  cholesterol_100g: 'cholesterol_100g',
  vitamin_a_100g: 'vitamin-a_100g',
  vitamin_c_100g: 'vitamin-c_100g',
  vitamin_d_100g: 'vitamin-d_100g',
  vitamin_b12_100g: 'vitamin-b12_100g',
  calcium_100g: 'calcium_100g',
  iron_100g: 'iron_100g',
  potassium_100g: 'potassium_100g',
  magnesium_100g: 'magnesium_100g',
  caffeine_100g: 'caffeine_100g',
  taurine_100g: 'taurine_100g',
  carbon_footprint_100g: 'carbon-footprint_100g',
  nova_group: 'nova_group',
  additives_n: 'additives_n',
}

function paramString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default function ContributeFoodScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const { compact, gutter } = useAppLayout()
  const params = useLocalSearchParams() as Record<string, string | string[] | undefined>

  const initialCode = useMemo(() => paramString(params.code), [params.code])
  const initialQuery = useMemo(() => paramString(params.query), [params.query])
  const initialName = useMemo(
    () => paramString(params.product_name) || (!/^\d{8,14}$/.test(initialQuery) ? initialQuery : ''),
    [params.product_name, initialQuery],
  )

  // Detect whether we arrived from a search result with prefilled data
  const hasPrefill = useMemo(
    () =>
      Boolean(initialName) ||
      Object.keys(PARAM_TO_OFF_STRING).some((key) => Boolean(paramString(params[key]))) ||
      Object.keys(PARAM_TO_OFF_NUMBER).some((key) => Boolean(paramString(params[key]))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [photo, setPhoto] = useState<PhotoState | null>(null)
  const [actionBarHeight, setActionBarHeight] = useState(156)
  const [productName, setProductName] = useState(initialName)
  const [code, setCode] = useState(initialCode)
  const [stringFields, setStringFields] = useState<Partial<Record<OffStringField, string>>>(() => {
    const next: Partial<Record<OffStringField, string>> = {}
    for (const [paramKey, offKey] of Object.entries(PARAM_TO_OFF_STRING)) {
      const value = paramString(params[paramKey])
      if (value) next[offKey] = value
    }
    return next
  })
  const [numberFields, setNumberFields] = useState<Partial<Record<OffNumberField, string>>>(() => {
    const next: Partial<Record<OffNumberField, string>> = {}
    for (const [paramKey, offKey] of Object.entries(PARAM_TO_OFF_NUMBER)) {
      const value = paramString(params[paramKey])
      if (value) next[offKey] = value
    }
    return next
  })
  const [showMore, setShowMore] = useState(
    () =>
      Object.keys(PARAM_TO_OFF_STRING).some((key) => Boolean(paramString(params[key]))) ||
      Object.keys(PARAM_TO_OFF_NUMBER).some(
        (key) =>
          !['energy_kcal_100g', 'proteins_100g', 'carbohydrates_100g', 'fat_100g'].includes(key) &&
          Boolean(paramString(params[key])),
      ),
  )
  const [submitting, setSubmitting] = useState(false)
  const essentialsComplete = Boolean(photo && productName.trim())

  async function ensureLibraryPermission(): Promise<boolean> {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync()
    if (current.granted) return true
    const asked = await ImagePicker.requestMediaLibraryPermissionsAsync()
    return asked.granted
  }

  async function ensureCameraPermission(): Promise<boolean> {
    const current = await ImagePicker.getCameraPermissionsAsync()
    if (current.granted) return true
    const asked = await ImagePicker.requestCameraPermissionsAsync()
    return asked.granted
  }

  async function pickFromLibrary() {
    if (!(await ensureLibraryPermission())) {
      Alert.alert('Permission needed', 'Allow photo library access to attach a food photo.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    setPhoto({
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
    })
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }

  async function takePhoto() {
    if (!(await ensureCameraPermission())) {
      Alert.alert('Permission needed', 'Allow camera access to photograph the food label.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
    })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    setPhoto({
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
    })
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }

  function choosePhotoSource() {
    Alert.alert('Add photo', 'Take a clear photo of the nutrition label or packaging.', [
      { text: 'Camera', onPress: () => void takePhoto() },
      { text: 'Photo library', onPress: () => void pickFromLibrary() },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  async function handleSubmit() {
    if (!user?.$id) {
      Alert.alert('Sign in required', 'Sign in to submit a food contribution.')
      return
    }
    if (!photo) {
      Alert.alert(
        'Photo required',
        'Snap a clear photo of the nutrition facts and ingredients list before submitting.',
      )
      return
    }
    if (!productName.trim()) {
      Alert.alert('Name required', 'Enter the product name.')
      return
    }

    setSubmitting(true)
    try {
      const fields: Partial<Record<OffStringField | OffNumberField, string | number>> = {
        ...stringFields,
      }
      for (const [key, raw] of Object.entries(numberFields)) {
        const trimmed = raw?.trim()
        if (!trimmed) continue
        fields[key as OffNumberField] = trimmed
      }

      await submitFoodContribution(user.$id, {
        photo,
        product_name: productName,
        code: code.trim() || null,
        source_query: initialQuery || code.trim() || productName.trim(),
        fields,
      })

      Alert.alert(
        'Contribution sent',
        `"${productName.trim()}" has been submitted for review. It will appear in search results once approved.`,
        [{ text: 'Back to Log Food', onPress: () => router.back() }],
      )
    } catch (error) {
      console.error('Could not submit food contribution', error)
      showApiError(error, 'appwrite')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Kept until the parent stack header is consolidated. */}
      <View style={[styles.navBar, { paddingTop: insets.top + 6, paddingHorizontal: gutter }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [styles.navBack, pressed && styles.pressed]}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
          <Text numberOfLines={1} style={styles.navBackText}>Log food</Text>
        </Pressable>
        <Text numberOfLines={1} style={styles.navTitle}>Food contribution</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: gutter, paddingBottom: actionBarHeight + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.orientation}>
          <View style={styles.overlineRow}>
            <Text style={styles.overline}>COMMUNITY FOOD DATA</Text>
            <View style={styles.overlineRule} />
          </View>
          <Text accessibilityRole="header" style={styles.pageTitle}>Complete the product record.</Text>
          <Text style={styles.pageDescription}>
            A clear label photo and product name are required. Add only the details you can verify.
          </Text>
        </View>

        <MotionView
          from={{ opacity: 0, translateY: 8 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 200 }}
          style={styles.completionCard}
        >
          <View style={[styles.completionStep, photo && styles.completionStepDone]}>
            <Ionicons name={photo ? 'checkmark' : 'camera-outline'} size={16} color={photo ? colors.onBrand : colors.textMuted} />
            <Text style={[styles.completionText, photo && styles.completionTextDone]}>Photo</Text>
          </View>
          <View style={styles.completionLine} />
          <View style={[styles.completionStep, productName.trim() && styles.completionStepDone]}>
            <Ionicons name={productName.trim() ? 'checkmark' : 'text-outline'} size={16} color={productName.trim() ? colors.onBrand : colors.textMuted} />
            <Text style={[styles.completionText, productName.trim() && styles.completionTextDone]}>Name</Text>
          </View>
          <Text style={styles.completionHint}>{essentialsComplete ? 'Ready to submit' : 'Complete the two essentials'}</Text>
        </MotionView>

        {/* Context banner — shown when prefilled from a search result */}
        {hasPrefill ? (
          <View style={styles.contextBanner}>
            <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
            <View style={styles.contextBannerCopy}>
              <Text style={styles.contextBannerTitle}>Existing details carried forward</Text>
              <Text style={styles.contextBannerText}>
                We filled in everything already available. Add a clear photo showing the nutrition
                panel and ingredients so the missing details can be reviewed.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.welcomeCopy}>
            <Text style={styles.welcomeTitle}>Start with the label</Text>
            <Text style={styles.lead}>
              Add a clear photo showing the nutrition panel and ingredients, then tell us the
              product name. Everything else is optional and can be filled in if it is easy to read.
            </Text>
          </View>
        )}

        {/* Required evidence */}
        <MotionView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 40, type: 'timing', duration: 220 }} style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="camera-outline" size={16} color={colors.accent} />
            <Text style={styles.cardTitle}>Nutrition facts photo</Text>
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText}>Required</Text>
            </View>
          </View>
          <Pressable
            style={styles.photoBox}
            onPress={choosePhotoSource}
            accessibilityRole="button"
            accessibilityLabel="Photograph nutrition facts and ingredients"
          >
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <View style={styles.photoIconWrap}>
                  <Ionicons name="camera" size={32} color={colors.accent} />
                </View>
                <Text style={styles.photoHint}>Add a nutrition facts and ingredients photo</Text>
                <Text style={styles.photoSubHint}>Camera or photo library</Text>
              </View>
            )}
          </Pressable>
          {photo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change attached photo"
              onPress={choosePhotoSource}
              style={({ pressed }) => [styles.changePhotoRow, pressed && styles.pressed]}
            >
              <Ionicons name="refresh-outline" size={14} color={colors.accent} />
              <Text style={styles.changePhoto}>Change photo</Text>
            </Pressable>
          ) : null}
        </MotionView>

        {/* Product info card */}
        <MotionView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 80, type: 'timing', duration: 220 }} style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="pricetag-outline" size={16} color={colors.accent} />
            <Text style={styles.cardTitle}>Product info</Text>
          </View>

          <View style={[styles.fieldGrid, compact && styles.fieldGridCompact]}>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>
                Product name <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                accessibilityLabel="Product name, required"
                style={styles.input}
                value={productName}
                onChangeText={setProductName}
                placeholder="e.g. Plain Greek yogurt"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Barcode</Text>
              <TextInput
                accessibilityLabel="Barcode, optional"
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="Optional"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                autoCapitalize="none"
              />
            </View>
          </View>
        </MotionView>

        {/* Macros card */}
        <MotionView from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 120, type: 'timing', duration: 220 }} style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="nutrition-outline" size={16} color={colors.accent} />
            <Text style={styles.cardTitle}>Nutrition per 100 g</Text>
            <View style={styles.optionalBadge}>
              <Text style={styles.optionalBadgeText}>Optional</Text>
            </View>
          </View>
          <Text style={styles.measurementNote}>Enter the value printed for 100 g of product.</Text>
          <View style={[styles.fieldGrid, compact && styles.fieldGridCompact]}>
            {PRIMARY_MACROS.map((field) => (
              <View key={field.key} style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  accessibilityLabel={`${field.label} per 100 grams, optional`}
                  style={styles.input}
                  value={numberFields[field.key] ?? ''}
                  onChangeText={(text) =>
                    setNumberFields((current) => ({ ...current, [field.key]: text }))
                  }
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>
        </MotionView>

        {/* More details toggle */}
        <Pressable
          style={styles.moreToggle}
          onPress={() => setShowMore((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showMore }}
        >
          <Text style={styles.moreToggleText}>
            {showMore ? 'Hide additional details' : 'More details (optional)'}
          </Text>
          <Ionicons
            name={showMore ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.accent}
          />
        </Pressable>

        {showMore ? (
          <MotionView
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 180 }}
            style={[styles.card, styles.moreBlock]}
          >
            <View style={styles.cardHeader}>
              <Ionicons name="list-outline" size={16} color={colors.accent} />
              <Text style={styles.cardTitle}>Additional fields</Text>
            </View>
            <View style={[styles.fieldGrid, compact && styles.fieldGridCompact]}>
              {MORE_STRINGS.map((field) => (
                <View key={field.key} style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    accessibilityLabel={`${field.label}, optional`}
                    style={styles.input}
                    value={stringFields[field.key] ?? ''}
                    onChangeText={(text) =>
                      setStringFields((current) => ({ ...current, [field.key]: text }))
                    }
                    placeholder="Optional"
                    placeholderTextColor={colors.textFaint}
                  />
                </View>
              ))}
              {MORE_NUMBERS.map((field) => (
                <View key={field.key} style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <TextInput
                    accessibilityLabel={`${field.label}, optional`}
                    style={styles.input}
                    value={numberFields[field.key] ?? ''}
                    onChangeText={(text) =>
                      setNumberFields((current) => ({ ...current, [field.key]: text }))
                    }
                    placeholder="Optional"
                    placeholderTextColor={colors.textFaint}
                    keyboardType="decimal-pad"
                  />
                </View>
              ))}
            </View>
          </MotionView>
        ) : null}
      </ScrollView>

      <View
        onLayout={(event) => setActionBarHeight(event.nativeEvent.layout.height)}
        style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, spacing.md), paddingHorizontal: gutter }]}
      >
        <View style={styles.actionBarInner}>
          <Text style={styles.disclaimer}>
            {essentialsComplete
              ? 'Ready to send. Review is required before general search.'
              : 'Add a photo and product name. Submissions are reviewed before general search.'}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.submit,
              (!essentialsComplete || submitting) && styles.submitDisabled,
              pressed && styles.pressed,
            ]}
            onPress={() => void handleSubmit()}
            disabled={!essentialsComplete || submitting}
            accessibilityRole="button"
            accessibilityState={{ disabled: !essentialsComplete || submitting }}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.onBrand} />
                <Text style={styles.submitText}>Submit for review</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    navBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      backgroundColor: c.background,
    },
    navBack: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      flex: 1,
      minWidth: 0,
      minHeight: 44,
    },
    navBackText: {
      ...typography.label,
      color: c.accent,
      flexShrink: 1,
    },
    navTitle: {
      ...typography.label,
      color: c.text,
      fontWeight: '700',
      flexShrink: 1,
      textAlign: 'center',
    },
    navSpacer: {
      flex: 1,
    },
    pressed: {
      opacity: 0.75,
    },
    content: {
      paddingTop: spacing.lg,
      gap: spacing.lg,
      maxWidth: 620,
      width: '100%',
      alignSelf: 'center',
    },
    orientation: {
      gap: 5,
      paddingBottom: spacing.xs,
    },
    overlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      maxWidth: 240,
    },
    overline: {
      ...typography.overline,
      color: c.brand,
    },
    overlineRule: {
      height: StyleSheet.hairlineWidth,
      flex: 1,
      backgroundColor: c.brand,
      opacity: 0.45,
    },
    pageTitle: {
      ...typography.headlineLarge,
      color: c.text,
    },
    pageDescription: {
      ...typography.body,
      color: c.textMuted,
      maxWidth: 540,
      marginTop: 2,
    },
    completionCard: {
      minHeight: 52,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderStrong,
      paddingVertical: spacing.sm,
    },
    completionStep: {
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: borderRadius.pill,
      paddingHorizontal: 10,
      backgroundColor: c.surfaceAlt,
    },
    completionStepDone: { backgroundColor: c.brand },
    completionText: { ...typography.labelSmall, color: c.textMuted },
    completionTextDone: { color: c.onBrand },
    completionLine: { width: 12, height: 1, backgroundColor: c.borderStrong },
    completionHint: { ...typography.labelSmall, color: c.textMuted, flexGrow: 1, flexBasis: 120, textAlign: 'right' },
    lead: {
      ...typography.body,
      color: c.textMuted,
    },
    welcomeCopy: { gap: spacing.xs },
    welcomeTitle: { ...typography.headline, color: c.text },
    contextBanner: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'flex-start',
      backgroundColor: c.brandSoft,
      borderLeftWidth: 2,
      borderLeftColor: c.brand,
      padding: spacing.md,
    },
    contextBannerText: {
      ...typography.body,
      color: c.text,
      lineHeight: 20,
    },
    contextBannerCopy: { flex: 1, gap: 3 },
    contextBannerTitle: { ...typography.label, color: c.brand, fontWeight: '700' },
    card: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderStrong,
      paddingTop: spacing.md,
      gap: spacing.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    cardTitle: {
      ...typography.headline,
      color: c.text,
      flex: 1,
    },
    requiredBadge: {
      backgroundColor: c.brand,
      borderRadius: borderRadius.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    requiredBadgeText: {
      ...typography.labelSmall,
      color: c.onBrand,
      fontWeight: '700',
    },
    optionalBadge: {
      backgroundColor: c.surfaceAlt,
      borderRadius: borderRadius.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: c.border,
    },
    optionalBadgeText: {
      ...typography.labelSmall,
      color: c.textMuted,
    },
    photoBox: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: c.borderStrong,
      borderRadius: borderRadius.md,
      backgroundColor: c.surfaceAlt,
      overflow: 'hidden',
      minHeight: 160,
    },
    photoPreview: {
      width: '100%',
      height: 220,
      resizeMode: 'cover',
    },
    photoPlaceholder: {
      minHeight: 160,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.lg,
    },
    photoIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoHint: {
      ...typography.body,
      color: c.text,
      textAlign: 'center',
      fontWeight: '600',
    },
    photoSubHint: {
      ...typography.labelSmall,
      color: c.textMuted,
      textAlign: 'center',
    },
    changePhotoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      minHeight: 44,
    },
    changePhoto: {
      ...typography.label,
      color: c.brand,
    },
    fieldGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    fieldGridCompact: {
      gap: spacing.sm,
    },
    fieldBlock: {
      gap: 6,
      flexGrow: 1,
      flexBasis: '46%',
      minWidth: 240,
    },
    fieldLabel: {
      ...typography.labelSmall,
      color: c.textMuted,
    },
    requiredStar: {
      color: c.accent,
    },
    input: {
      ...typography.body,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: borderRadius.md,
      color: c.text,
      paddingHorizontal: spacing.md,
      paddingVertical: Platform.OS === 'ios' ? 12 : 10,
      minHeight: 48,
    },
    measurementNote: {
      ...typography.bodySmall,
      color: c.textMuted,
      marginTop: -spacing.xs,
    },
    moreToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
      paddingVertical: spacing.sm,
    },
    moreToggleText: {
      ...typography.label,
      color: c.accent,
    },
    moreBlock: {
      gap: spacing.md,
    },
    actionBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: spacing.sm,
      backgroundColor: c.surfaceMuted,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderStrong,
    },
    actionBarInner: {
      width: '100%',
      maxWidth: 620,
      alignSelf: 'center',
      gap: spacing.sm,
    },
    submit: {
      minHeight: 50,
      backgroundColor: c.brand,
      borderRadius: borderRadius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: 13,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    submitDisabled: {
      opacity: 0.7,
    },
    submitText: {
      ...typography.label,
      color: c.onBrand,
      fontWeight: '700',
      fontSize: 16,
    },
    disclaimer: {
      ...typography.labelSmall,
      color: c.textMuted,
      textAlign: 'center',
    },
  })
