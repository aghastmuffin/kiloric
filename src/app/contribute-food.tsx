import { showApiError } from '@/lib/apiErrors'
import { useAuth } from '@/lib/AuthContext'
import {
  submitFoodContribution,
  type OffNumberField,
  type OffStringField,
} from '@/lib/foodContributions'
import { useTheme } from '@/lib/theme/ThemeContext'
import { borderRadius, spacing, type ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
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
} from 'react-native'

type PhotoState = {
  uri: string
  mimeType?: string | null
  fileName?: string | null
  fileSize?: number | null
}

const PRIMARY_MACROS: { key: OffNumberField; label: string; placeholder: string }[] = [
  { key: 'energy-kcal_100g', label: 'Calories (kcal / 100g)', placeholder: 'e.g. 250' },
  { key: 'proteins_100g', label: 'Protein (g / 100g)', placeholder: 'e.g. 10' },
  { key: 'carbohydrates_100g', label: 'Carbs (g / 100g)', placeholder: 'e.g. 30' },
  { key: 'fat_100g', label: 'Fat (g / 100g)', placeholder: 'e.g. 8' },
  { key: 'fiber_100g', label: 'Fiber (g / 100g)', placeholder: 'optional' },
  { key: 'sugars_100g', label: 'Sugars (g / 100g)', placeholder: 'optional' },
  { key: 'sodium_100g', label: 'Sodium (g / 100g)', placeholder: 'optional' },
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
  { key: 'serving_quantity', label: 'Serving quantity' },
  { key: 'energy-kj_100g', label: 'Energy (kJ / 100g)' },
  { key: 'added-sugars_100g', label: 'Added sugars' },
  { key: 'polyols_100g', label: 'Polyols' },
  { key: 'saturated-fat_100g', label: 'Saturated fat' },
  { key: 'trans-fat_100g', label: 'Trans fat' },
  { key: 'monounsaturated-fat_100g', label: 'Monounsaturated fat' },
  { key: 'polyunsaturated-fat_100g', label: 'Polyunsaturated fat' },
  { key: 'cholesterol_100g', label: 'Cholesterol' },
  { key: 'vitamin-a_100g', label: 'Vitamin A' },
  { key: 'vitamin-c_100g', label: 'Vitamin C' },
  { key: 'vitamin-d_100g', label: 'Vitamin D' },
  { key: 'vitamin-b12_100g', label: 'Vitamin B12' },
  { key: 'calcium_100g', label: 'Calcium' },
  { key: 'iron_100g', label: 'Iron' },
  { key: 'potassium_100g', label: 'Potassium' },
  { key: 'magnesium_100g', label: 'Magnesium' },
  { key: 'caffeine_100g', label: 'Caffeine' },
  { key: 'taurine_100g', label: 'Taurine' },
  { key: 'carbon-footprint_100g', label: 'Carbon footprint' },
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
  const params = useLocalSearchParams<Record<string, string | string[] | undefined>>()

  const initialCode = useMemo(() => paramString(params.code), [params.code])
  const initialQuery = useMemo(() => paramString(params.query), [params.query])
  const initialName = useMemo(
    () => paramString(params.product_name) || (!/^\d{8,14}$/.test(initialQuery) ? initialQuery : ''),
    [params.product_name, initialQuery],
  )

  const [photo, setPhoto] = useState<PhotoState | null>(null)
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
        'Thanks!',
        'Your contribution was submitted for review. It will not appear in search until approved.',
        [{ text: 'OK', onPress: () => router.back() }],
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          {initialName
            ? 'Some catalog fields are unknown for this product. Snap a clear photo of the nutrition facts panel and the ingredients list — that photo is required; typed nutrition fields are optional extras for review.'
            : 'Help fill catalog gaps. Snap a clear photo of the nutrition facts and ingredients list (required). Typed nutrition details are optional extras for later review / ML.'}
        </Text>

        <Text style={styles.sectionLabel}>Photo of nutrition facts + ingredients (required)</Text>
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
              <Ionicons name="camera-outline" size={36} color={colors.textMuted} />
              <Text style={styles.photoHint}>
                Tap to photograph the nutrition facts and ingredients
              </Text>
            </View>
          )}
        </Pressable>
        {photo ? (
          <Pressable onPress={choosePhotoSource}>
            <Text style={styles.changePhoto}>Change photo</Text>
          </Pressable>
        ) : null}

        <Text style={styles.sectionLabel}>Product name (required)</Text>
        <TextInput
          style={styles.input}
          value={productName}
          onChangeText={setProductName}
          placeholder="e.g. Chobani Plain Greek Yogurt"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="words"
        />

        <Text style={styles.sectionLabel}>Barcode</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={setCode}
          placeholder="Optional — prefilled from scan when available"
          placeholderTextColor={colors.textFaint}
          keyboardType="number-pad"
          autoCapitalize="none"
        />

        <Text style={styles.sectionLabel}>Nutrition per 100g (optional)</Text>
        {PRIMARY_MACROS.map((field) => (
          <View key={field.key} style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>{field.label}</Text>
            <TextInput
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

        <Pressable
          style={styles.moreToggle}
          onPress={() => setShowMore((open) => !open)}
          accessibilityRole="button"
        >
          <Text style={styles.moreToggleText}>
            {showMore ? 'Hide more details' : 'More details (optional)'}
          </Text>
          <Ionicons
            name={showMore ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.accent}
          />
        </Pressable>

        {showMore ? (
          <View style={styles.moreBlock}>
            {MORE_STRINGS.map((field) => (
              <View key={field.key} style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={stringFields[field.key] ?? ''}
                  onChangeText={(text) =>
                    setStringFields((current) => ({ ...current, [field.key]: text }))
                  }
                  placeholderTextColor={colors.textFaint}
                />
              </View>
            ))}
            {MORE_NUMBERS.map((field) => (
              <View key={field.key} style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={numberFields[field.key] ?? ''}
                  onChangeText={(text) =>
                    setNumberFields((current) => ({ ...current, [field.key]: text }))
                  }
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          style={[styles.submit, submitting && styles.submitDisabled]}
          onPress={() => void handleSubmit()}
          disabled={submitting}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.submitText}>Submit contribution</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: 48,
      gap: spacing.sm,
      maxWidth: 620,
      width: '100%',
      alignSelf: 'center',
    },
    lead: {
      ...typography.body,
      color: c.textMuted,
      marginBottom: spacing.sm,
    },
    sectionLabel: {
      ...typography.labelSmall,
      color: c.textMuted,
      textTransform: 'uppercase',
      marginTop: spacing.md,
    },
    photoBox: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: borderRadius.lg,
      backgroundColor: c.surface,
      overflow: 'hidden',
      minHeight: 180,
    },
    photoPreview: {
      width: '100%',
      height: 220,
      resizeMode: 'cover',
    },
    photoPlaceholder: {
      minHeight: 180,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.lg,
    },
    photoHint: {
      ...typography.body,
      color: c.textMuted,
      textAlign: 'center',
    },
    changePhoto: {
      ...typography.label,
      color: c.accent,
      marginTop: 4,
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
    },
    fieldBlock: {
      gap: 4,
    },
    fieldLabel: {
      ...typography.labelSmall,
      color: c.textMuted,
    },
    moreToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      marginTop: spacing.sm,
    },
    moreToggleText: {
      ...typography.label,
      color: c.accent,
    },
    moreBlock: {
      gap: spacing.sm,
    },
    submit: {
      marginTop: spacing.lg,
      backgroundColor: c.accent,
      borderRadius: borderRadius.md,
      paddingVertical: 14,
      alignItems: 'center',
    },
    submitDisabled: {
      opacity: 0.7,
    },
    submitText: {
      ...typography.label,
      color: c.onAccent,
      fontWeight: '700',
    },
  })
