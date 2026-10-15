import { MotionView } from '@/components/MotionView'
import { showApiError } from '@/lib/apiErrors'
import { useAuth } from '@/lib/AuthContext'
import { submitFoodContribution, type OffNumberField } from '@/lib/foodContributions'
import { useAppLayout } from '@/lib/theme/layout'
import { useTheme } from '@/lib/theme/ThemeContext'
import { borderRadius, spacing, type ThemeColors } from '@/lib/theme/tokens'
import { typography } from '@/lib/theme/typography'
import { useThemedStyles } from '@/lib/theme/useThemedStyles'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Photo = { uri: string; mimeType?: string | null; fileName?: string | null; fileSize?: number | null }
type PhotoKind = 'ingredients' | 'barcode' | 'front'
const STEPS: { key: PhotoKind; title: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'ingredients', title: 'Ingredients list', description: 'Fill the frame and keep every line readable.', icon: 'reader-outline' },
  { key: 'barcode', title: 'Barcode', description: 'Hold steady so the whole code is sharp.', icon: 'barcode-outline' },
  { key: 'front', title: 'Front of product', description: 'Show the full package, straight on, in good light.', icon: 'cube-outline' },
]
const FIELDS: { key: OffNumberField; label: string }[] = [
  { key: 'energy-kcal_100g', label: 'Energy (kcal)' }, { key: 'proteins_100g', label: 'Protein (g)' },
  { key: 'carbohydrates_100g', label: 'Carbohydrate (g)' }, { key: 'fat_100g', label: 'Fat (g)' },
  { key: 'fiber_100g', label: 'Fiber (g)' }, { key: 'sugars_100g', label: 'Sugars (g)' },
  { key: 'sodium_100g', label: 'Sodium (g)' },
]
const PARAM_FIELDS: Record<string, OffNumberField> = {
  energy_kcal_100g: 'energy-kcal_100g', proteins_100g: 'proteins_100g', carbohydrates_100g: 'carbohydrates_100g',
  fat_100g: 'fat_100g', fiber_100g: 'fiber_100g', sugars_100g: 'sugars_100g', sodium_100g: 'sodium_100g',
}
function param(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? '' : value ?? '' }

export default function ContributeFoodScreen() {
  const { user } = useAuth(); const router = useRouter(); const styles = useThemedStyles(makeStyles)
  const { colors } = useTheme(); const { gutter, compact } = useAppLayout(); const insets = useSafeAreaInsets()
  const params = useLocalSearchParams() as Record<string, string | string[] | undefined>
  const initialQuery = useMemo(() => param(params.query), [params.query])
  const initialCode = useMemo(() => param(params.code), [params.code])
  const initialName = useMemo(() => param(params.product_name) || (!/^\d{8,14}$/.test(initialQuery) ? initialQuery : ''), [initialQuery, params.product_name])
  const [photos, setPhotos] = useState<Partial<Record<PhotoKind, Photo>>>({})
  const [manual, setManual] = useState(false); const [productName, setProductName] = useState(initialName); const [code, setCode] = useState(initialCode)
  const [numbers, setNumbers] = useState<Partial<Record<OffNumberField, string>>>(() => Object.fromEntries(Object.entries(PARAM_FIELDS).map(([key, field]) => [field, param(params[key])]).filter(([, value]) => value)))
  const [submitting, setSubmitting] = useState(false); const [submitted, setSubmitted] = useState(false)
  const complete = STEPS.filter(({ key }) => photos[key]).length; const photosComplete = complete === 3
  const ready = photosComplete && Boolean(productName.trim())

  async function choosePhoto(kind: PhotoKind, source: 'camera' | 'library') {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) return Alert.alert('Camera access needed', 'Allow camera access to photograph this product.')
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 })
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    setPhotos((current) => ({ ...current, [kind]: { uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName, fileSize: asset.fileSize } }))
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }
  function promptPhoto(kind: PhotoKind) {
    const title = STEPS.find((step) => step.key === kind)?.title ?? 'Product photo'
    Alert.alert(title, 'Take a new photo or choose one you already have.', [
      { text: 'Take photo', onPress: () => void choosePhoto(kind, 'camera') },
      { text: 'Choose from library', onPress: () => void choosePhoto(kind, 'library') }, { text: 'Cancel', style: 'cancel' },
    ])
  }
  async function submit() {
    if (!user?.$id) return Alert.alert('Sign in required', 'Sign in to submit product details.')
    if (!photosComplete) return Alert.alert('Three photos needed', 'Add each requested product view first.')
    if (!productName.trim()) { setManual(true); return Alert.alert('Product name needed', 'Enter the product name under manual details.') }
    setSubmitting(true)
    try {
      const fields: Partial<Record<OffNumberField, string | number>> = {}
      for (const [key, value] of Object.entries(numbers)) if (value?.trim()) fields[key as OffNumberField] = value.trim()
      await submitFoodContribution(user.$id, { photo: photos.ingredients!, additionalPhotos: [photos.barcode!, photos.front!], product_name: productName, code: code.trim() || null, source_query: initialQuery || code.trim() || productName.trim(), fields })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setSubmitted(true)
    } catch (error) { console.error('Could not submit food contribution', error); showApiError(error, 'appwrite') } finally { setSubmitting(false) }
  }

  if (submitted) return <View style={[styles.successScreen, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: gutter }]}>
    <MotionView from={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', damping: 18 }} style={styles.successCard}>
      <View style={styles.successIcon}><Ionicons name="checkmark" size={30} color={colors.onBrand} /></View>
      <Text accessibilityRole="header" style={styles.successTitle}>Thank you.</Text>
      <Text style={styles.successCopy}>Your photos are ready for review. They’ll help make this product easier to find and log.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>Back to food log</Text></Pressable>
    </MotionView>
  </View>

  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={[styles.nav, { paddingTop: insets.top + 4, paddingHorizontal: gutter }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to food log" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><Ionicons name="chevron-back" size={22} color={colors.accent} /><Text style={styles.backText}>Log food</Text></Pressable>
      <Text numberOfLines={1} style={styles.navTitle}>Help complete this food</Text><View style={styles.navSide} />
    </View>
    <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: gutter, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.intro}><Text accessibilityRole="header" style={styles.title}>Three quick photos, then you’re done.</Text><Text style={styles.description}>We’ll use the package to fill in what’s missing. For now, just make each view clear and readable.</Text></View>
      <View
        accessible={true}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 3, now: complete }}
        accessibilityLabel={`Photo contribution progress: ${complete} of 3 photos added`}
        style={styles.progressBlock}
      >
        <View style={styles.progressLabels}><Text style={styles.progressCount}>{complete} of 3 photos</Text><Text style={styles.progressStatus}>{photosComplete ? 'Ready to send' : 'A little more to go'}</Text></View>
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.round((complete / 3) * 100)}%` }]} /></View>
      </View>
      <View style={styles.photoList}>{STEPS.map((step, index) => {
        const photo = photos[step.key]
        return <MotionView key={step.key} from={{ opacity: 0, translateY: 8 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 220, delay: index * 45 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${photo ? 'Retake' : 'Add'} ${step.title} photo`} accessibilityHint={step.description} onPress={() => promptPhoto(step.key)} style={({ pressed }) => [styles.photoRow, photo && styles.photoRowDone, pressed && styles.pressed]}>
            {photo ? <Image source={{ uri: photo.uri }} style={styles.thumbnail} /> : <View style={styles.photoIcon}><Ionicons name={step.icon} size={23} color={colors.accent} /></View>}
            <View style={styles.photoCopy}><Text style={styles.photoTitle}>{step.title}</Text><Text style={styles.photoDescription}>{photo ? 'Photo added · tap to retake' : step.description}</Text></View>
            <View style={[styles.stepMark, photo && styles.stepMarkDone]}><Ionicons name={photo ? 'checkmark' : 'camera-outline'} size={18} color={photo ? colors.onBrand : colors.accent} /></View>
          </Pressable>
        </MotionView>
      })}</View>
      {!initialName ? <View style={styles.nameNote}><Ionicons name="information-circle-outline" size={19} color={colors.accent} /><Text style={styles.nameNoteText}>We still need the product name. You can add it under manual details.</Text></View> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: manual }} onPress={() => setManual((value) => !value)} style={({ pressed }) => [styles.manualToggle, pressed && styles.pressed]}><Ionicons name="create-outline" size={19} color={colors.accent} /><Text style={styles.manualToggleText}>Manually enter details</Text><Ionicons name={manual ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} /></Pressable>
      {manual ? <MotionView from={{ opacity: 0, translateY: -6 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 180 }} style={styles.manualPanel}>
        <Text style={styles.manualTitle}>Product details</Text><Text style={styles.manualHint}>Add only what you can verify on the package.</Text>
        <View style={[styles.fieldGrid, compact && styles.fieldGridCompact]}>
          <Field label="Product name" value={productName} onChangeText={setProductName} placeholder="Required" styles={styles} colors={colors} />
          <Field label="Barcode" value={code} onChangeText={setCode} placeholder="Optional" keyboardType="number-pad" styles={styles} colors={colors} />
          {FIELDS.map((field) => <Field key={field.key} label={`${field.label} per 100 g`} value={numbers[field.key] ?? ''} onChangeText={(value) => setNumbers((current) => ({ ...current, [field.key]: value }))} placeholder="Optional" keyboardType="decimal-pad" styles={styles} colors={colors} />)}
        </View>
      </MotionView> : null}
      <View style={styles.submitBlock}><Text style={styles.reviewNote}>{ready ? 'Photos are reviewed before the product appears in search.' : `${3 - complete} photo${3 - complete === 1 ? '' : 's'} remaining.`}</Text>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready || submitting }} disabled={!ready || submitting} onPress={() => void submit()} style={({ pressed }) => [styles.primaryButton, (!ready || submitting) && styles.primaryButtonDisabled, pressed && styles.pressed]}>{submitting ? <ActivityIndicator color={colors.onBrand} /> : <><Ionicons name="paper-plane-outline" size={19} color={colors.onBrand} /><Text style={styles.primaryButtonText}>Send photos</Text></>}</Pressable>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>
}

function Field({ label, value, onChangeText, placeholder, keyboardType, styles, colors }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'number-pad' | 'decimal-pad'; styles: ReturnType<typeof makeStyles>; colors: ThemeColors }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textFaint} keyboardType={keyboardType} style={styles.input} /></View>
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background }, nav: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  back: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', marginLeft: -8 }, backText: { ...typography.label, color: c.accent }, navTitle: { ...typography.label, color: c.text, fontWeight: '700', textAlign: 'center', flexShrink: 1 }, navSide: { flex: 1 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingTop: spacing.xl, gap: spacing.lg }, intro: { gap: spacing.sm }, title: { ...typography.headlineLarge, color: c.text }, description: { ...typography.bodyLarge, color: c.textMuted, maxWidth: 540 },
  progressBlock: { gap: spacing.sm, paddingVertical: spacing.sm }, progressLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }, progressCount: { ...typography.label, color: c.text }, progressStatus: { ...typography.labelSmall, color: c.textMuted }, track: { height: 8, borderRadius: borderRadius.pill, backgroundColor: c.surfaceAlt, overflow: 'hidden' }, fill: { height: '100%', borderRadius: borderRadius.pill, backgroundColor: c.brand },
  photoList: { gap: spacing.sm }, photoRow: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: borderRadius.md }, photoRowDone: { backgroundColor: c.brandSoft, borderColor: c.brand }, photoIcon: { width: 52, height: 52, borderRadius: borderRadius.md, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }, thumbnail: { width: 52, height: 52, borderRadius: borderRadius.md, resizeMode: 'cover' }, photoCopy: { flex: 1, gap: 3 }, photoTitle: { ...typography.body, color: c.text, fontWeight: '600' }, photoDescription: { ...typography.bodySmall, color: c.textMuted }, stepMark: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: c.accent, alignItems: 'center', justifyContent: 'center' }, stepMarkDone: { backgroundColor: c.brand, borderColor: c.brand },
  nameNote: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', padding: spacing.md, backgroundColor: c.accentSoft, borderRadius: borderRadius.sm }, nameNoteText: { ...typography.bodySmall, color: c.text, flex: 1 }, manualToggle: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.borderStrong }, manualToggleText: { ...typography.label, color: c.accent, flex: 1 },
  manualPanel: { gap: spacing.md, paddingBottom: spacing.sm }, manualTitle: { ...typography.headline, color: c.text }, manualHint: { ...typography.bodySmall, color: c.textMuted, marginTop: -spacing.sm }, fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, fieldGridCompact: { gap: spacing.sm }, field: { gap: 6, flexGrow: 1, flexBasis: '46%', minWidth: 240 }, fieldLabel: { ...typography.labelSmall, color: c.textMuted }, input: { ...typography.body, minHeight: 48, color: c.text, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
  submitBlock: { gap: spacing.sm, paddingTop: spacing.sm }, reviewNote: { ...typography.labelSmall, color: c.textMuted, textAlign: 'center' }, primaryButton: { minHeight: 50, borderRadius: borderRadius.pill, backgroundColor: c.brand, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg }, primaryButtonDisabled: { opacity: 0.48 }, primaryButtonText: { ...typography.label, color: c.onBrand, fontSize: 16 }, pressed: { opacity: 0.76 },
  successScreen: { flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }, successCard: { width: '100%', maxWidth: 480, alignItems: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: c.surface, borderRadius: borderRadius.lg }, successIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.brand, alignItems: 'center', justifyContent: 'center' }, successTitle: { ...typography.headlineLarge, color: c.text }, successCopy: { ...typography.bodyLarge, color: c.textMuted, textAlign: 'center', marginBottom: spacing.sm },
})
