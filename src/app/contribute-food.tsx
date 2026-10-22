import { CaptureCamera, type CaptureGuide } from '@/components/contribute/CaptureCamera'
import { ThanksBurst } from '@/components/contribute/ThanksBurst'
import { Badge, Card, ErrorNote, Field, IconButton, ScreenScroll, Txt, UButton, WIDE_BREAKPOINT } from '@/components/ds'
import { formatAppwriteError } from '@/lib/apiErrors'
import { useAuth } from '@/lib/AuthContext'
import {
  NUMBER_OFF_FIELDS,
  STRING_OFF_FIELDS,
  addFileId,
  confirmContributor,
  countContributions,
  createContributionRecord,
  discardContributionFiles,
  uploadContributionPhoto,
  type ContributionFileIds,
  type ContributionPhoto,
  type ContributionPhotoKind,
  type FoodContributionResult,
  type OffNumberField,
  type OffStringField,
} from '@/lib/foodContributions'
import { triggerNotificationHaptic } from '@/lib/haptics'
import type { ImageSource } from '@/lib/imageUpload'
import { usePalette } from '@/lib/theme/palette'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo, useRef, useState, type ComponentProps } from 'react'
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'

type PhotoKind = Exclude<ContributionPhotoKind, 'extra'>
type StepKey = PhotoKind | 'details'
type Phase = 'capture' | 'uploading' | 'done'
type UploadStatus = 'waiting' | 'uploading' | 'done' | 'failed'

type PhotoStep = {
  key: PhotoKind
  label: string
  title: string
  body: string
  hint: string
  guide: CaptureGuide
  icon: ComponentProps<typeof Ionicons>['name']
  optional?: boolean
}

const PHOTO_STEPS: PhotoStep[] = [
  {
    key: 'barcode',
    label: 'Barcode',
    title: 'Scan the barcode',
    body: 'Line it up inside the frame. We read the number and snap the photo for you.',
    hint: 'Hold steady, about a hand’s width away',
    guide: 'barcode',
    icon: 'barcode-outline',
  },
  {
    key: 'front',
    label: 'Front',
    title: 'Snap the front',
    body: 'Straight on, the whole pack in view. This becomes the product photo everyone sees.',
    hint: 'Good light, no glare, fill the frame',
    guide: 'portrait',
    icon: 'cube-outline',
  },
  {
    key: 'ingredients',
    label: 'Ingredients',
    title: 'Ingredients list',
    body: 'Get every line in, sharp enough to read. It’s how we spot allergens.',
    hint: 'Move closer until the text is crisp',
    guide: 'landscape',
    icon: 'reader-outline',
  },
  {
    key: 'nutrition',
    label: 'Nutrition',
    title: 'Nutrition label',
    body: 'The facts table with calories and macros. Include the per 100 g or per serving column.',
    hint: 'Keep the whole table inside the frame',
    guide: 'landscape',
    icon: 'stats-chart-outline',
    optional: true,
  },
]

const STEP_KEYS: StepKey[] = [...PHOTO_STEPS.map((step) => step.key), 'details']
const KIND_LABEL: Record<ContributionPhotoKind, string> = {
  barcode: 'Barcode',
  front: 'Front of pack',
  ingredients: 'Ingredients',
  nutrition: 'Nutrition label',
  extra: 'Extra photo',
}

function param(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

function prefilledFields(params: Record<string, string | string[] | undefined>) {
  const fields: Partial<Record<OffStringField | OffNumberField, string>> = {}
  for (const key of [...STRING_OFF_FIELDS, ...NUMBER_OFF_FIELDS]) {
    if (key === 'code' || key === 'product_name') continue
    const value = param(params[key] ?? params[key.replace(/-/g, '_')])
    if (value) fields[key] = value
  }
  return fields
}

export default function ContributeFoodScreen() {
  const c = usePalette()
  const router = useRouter()
  const { user } = useAuth()
  const { width, height } = useWindowDimensions()
  const wide = width >= WIDE_BREAKPOINT
  const params = useLocalSearchParams() as Record<string, string | string[] | undefined>
  const prefill = useMemo(() => prefilledFields(params), [params])
  const query = param(params.query)

  const [stepIndex, setStepIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('capture')
  const [photos, setPhotos] = useState<Partial<Record<ContributionPhotoKind, ContributionPhoto>>>({})
  const [code, setCode] = useState(param(params.code) || (/^\d{8,14}$/.test(query) ? query : ''))
  const [codeVersion, setCodeVersion] = useState(0)
  const [scannedCode, setScannedCode] = useState(false)
  const [name, setName] = useState(param(params.product_name) || (/^\d{8,14}$/.test(query) ? '' : query))
  const [brand, setBrand] = useState(prefill.brands ?? '')
  const [serving, setServing] = useState(prefill.serving_size ?? '')
  const [extraCamera, setExtraCamera] = useState(false)
  const [progress, setProgress] = useState<Partial<Record<ContributionPhotoKind, number>>>({})
  const [status, setStatus] = useState<Partial<Record<ContributionPhotoKind, UploadStatus>>>({})
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FoodContributionResult | null>(null)
  const [contributionCount, setContributionCount] = useState<number | null>(null)
  const typedCode = useRef(false)
  const uploaded = useRef<Partial<Record<ContributionPhotoKind, { uri: string; fileId: string }>>>({})

  const stepKey = STEP_KEYS[stepIndex]
  const photoStep = PHOTO_STEPS.find((step) => step.key === stepKey) ?? null
  const photoKinds = (Object.keys(photos) as ContributionPhotoKind[]).filter((kind) => photos[kind])
  const missingRequired = PHOTO_STEPS.filter(
    (step) => !step.optional && !photos[step.key] && !(step.key === 'barcode' && code),
  )

  const contentWidth = wide ? 1080 : Math.min(width, 560)
  const cameraHeight = wide
    ? Math.min(620, Math.max(420, height - 230))
    : Math.min(Math.round((contentWidth - 40) * 1.2), Math.max(320, height - 360))

  function exit() {
    const pendingFiles = !result ? fileIdsFromUploads() : null
    if (pendingFiles && Object.keys(pendingFiles).length) void discardContributionFiles(pendingFiles)
    if (router.canGoBack()) router.back()
    else router.replace('/logfood')
  }

  function back() {
    if (stepIndex === 0) exit()
    else setStepIndex(stepIndex - 1)
  }

  function next() {
    setExtraCamera(false)
    setStepIndex(Math.min(STEP_KEYS.length - 1, stepIndex + 1))
  }

  function setPhoto(kind: ContributionPhotoKind, photo: ImageSource | null) {
    setPhotos((current) => {
      const nextPhotos = { ...current }
      if (photo) nextPhotos[kind] = { ...photo, kind }
      else delete nextPhotos[kind]
      return nextPhotos
    })
    if (photo) triggerNotificationHaptic('success')
  }

  async function pickFromLibrary(kind: ContributionPhotoKind) {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
    const asset = picked.canceled ? null : picked.assets?.[0]
    if (!asset) return
    setPhoto(kind, {
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
      file: asset.file ?? null,
    })
    if (kind === 'extra') setExtraCamera(false)
  }

  function onBarcode(value: string) {
    if (typedCode.current) return
    setCode(value)
    setScannedCode(true)
    setCodeVersion((version) => version + 1)
  }

  function fileIdsFromUploads(): ContributionFileIds {
    let files: ContributionFileIds = {}
    for (const kind of photoKinds) {
      const entry = uploaded.current[kind]
      if (entry && entry.uri === photos[kind]?.uri) files = addFileId(files, kind, entry.fileId)
    }
    return files
  }

  async function send() {
    if (!user?.$id) {
      setError('Sign in to send product photos.')
      return
    }
    setPhase('uploading')
    setError(null)
    setStatus(Object.fromEntries(photoKinds.map((kind) => [kind, uploaded.current[kind]?.uri === photos[kind]?.uri ? 'done' : 'waiting'])))
    try {
      const owner = await confirmContributor(user.$id)
      for (const kind of photoKinds) {
        const photo = photos[kind]!
        if (uploaded.current[kind]?.uri === photo.uri) continue
        setStatus((current) => ({ ...current, [kind]: 'uploading' }))
        try {
          const fileId = await uploadContributionPhoto(owner, photo, (fraction) =>
            setProgress((current) => ({ ...current, [kind]: fraction })),
          )
          uploaded.current[kind] = { uri: photo.uri, fileId }
          setStatus((current) => ({ ...current, [kind]: 'done' }))
        } catch (uploadError) {
          setStatus((current) => ({ ...current, [kind]: 'failed' }))
          throw uploadError
        }
      }
      const fields: Partial<Record<OffStringField | OffNumberField, string>> = { ...prefill }
      if (brand.trim()) fields.brands = brand.trim()
      else delete fields.brands
      if (serving.trim()) fields.serving_size = serving.trim()
      else delete fields.serving_size
      const record = await createContributionRecord(owner, {
        product_name: name,
        code: code || null,
        source_query: query || code || name,
        fields,
        files: fileIdsFromUploads(),
      })
      setResult(record)
      setContributionCount(await countContributions(owner))
      triggerNotificationHaptic('success')
      setPhase('done')
    } catch (sendError) {
      triggerNotificationHaptic('error')
      setError(formatAppwriteError(sendError))
    }
  }

  function startOver() {
    uploaded.current = {}
    typedCode.current = false
    setPhotos({})
    setProgress({})
    setStatus({})
    setResult(null)
    setError(null)
    setCode('')
    setScannedCode(false)
    setCodeVersion((version) => version + 1)
    setName('')
    setBrand('')
    setServing('')
    setStepIndex(0)
    setPhase('capture')
  }

  if (phase === 'done' && result) {
    return (
      <ScreenScroll maxWidth={560} testID="contribute-thanks">
        <View style={styles.thanks}>
          <ThanksBurst size={wide ? 120 : 104} />
          <Animated.View entering={FadeInDown.delay(260).duration(420)} style={styles.thanksCopy}>
            <Txt variant="display" align="center">
              Thank you!
            </Txt>
            <Txt variant="body" tone="muted" align="center">
              {name.trim() ? `${name.trim()} is` : 'Your food is'} on its way. We check every photo, then add it so
              everyone can find and log it in a tap.
            </Txt>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(420).duration(420)} style={styles.thanksBadges}>
            <Badge label={`${photoKinds.length} photos sent`} icon="images-outline" tone="mint" />
            {contributionCount ? (
              <Badge
                label={contributionCount === 1 ? 'Your first contribution' : `${contributionCount} foods added by you`}
                icon="sparkles-outline"
                tone="peach"
              />
            ) : null}
          </Animated.View>
          <Animated.View entering={FadeIn.delay(560).duration(400)} style={styles.thanksActions}>
            <UButton label="Back to Log food" size="lg" fullWidth onPress={exit} testID="thanks-done" />
            <UButton label="Add another food" tone="chip" fullWidth onPress={startOver} testID="thanks-another" />
          </Animated.View>
        </View>
      </ScreenScroll>
    )
  }

  if (phase === 'uploading') {
    const total = photoKinds.length || 1
    const overall = photoKinds.reduce((sum, kind) => sum + (status[kind] === 'done' ? 1 : progress[kind] ?? 0), 0) / total
    return (
      <ScreenScroll maxWidth={560} testID="contribute-uploading">
        <View style={styles.topRow}>
          <Txt variant="label" tone="muted">
            Add a food
          </Txt>
        </View>
        <Txt variant="title">{error ? 'Something didn’t go through' : 'Sending your photos…'}</Txt>
        <Txt variant="body" tone="muted">
          {error
            ? 'Finished photos are saved, so retrying only sends what’s left.'
            : 'Keep this screen open for a moment. Photos are resized before they’re sent.'}
        </Txt>
        <ProgressTrack fraction={error ? overall : Math.max(0.04, overall)} />
        <Card padded={false} style={styles.uploadList}>
          {photoKinds.map((kind, index) => {
            const state = status[kind] ?? 'waiting'
            const fraction = state === 'done' ? 1 : progress[kind] ?? 0
            return (
              <View key={kind} style={[styles.uploadRow, index > 0 && { borderTopWidth: 1, borderTopColor: c.line }]} testID={`upload-${kind}`}>
                <Image source={{ uri: photos[kind]!.uri }} style={styles.uploadThumb} />
                <View style={styles.flex}>
                  <Txt variant="bodyStrong">{KIND_LABEL[kind]}</Txt>
                  <View style={[styles.miniTrack, { backgroundColor: c.chip }]}>
                    <View
                      style={[
                        styles.miniFill,
                        { width: `${Math.round(fraction * 100)}%`, backgroundColor: state === 'failed' ? c.danger : c.primary },
                      ]}
                    />
                  </View>
                </View>
                <Txt variant="caption" color={state === 'failed' ? c.danger : state === 'done' ? c.primary : c.inkMuted}>
                  {state === 'done' ? 'Sent' : state === 'failed' ? 'Failed' : state === 'uploading' ? `${Math.round(fraction * 100)}%` : 'Waiting'}
                </Txt>
              </View>
            )
          })}
        </Card>
        {error ? (
          <>
            <ErrorNote message={error} />
            <View style={styles.actionsRow}>
              <UButton label="Back to photos" tone="chip" onPress={() => setPhase('capture')} style={styles.flex} fullWidth />
              <UButton label="Try again" onPress={() => void send()} style={styles.flex} fullWidth testID="upload-retry" />
            </View>
          </>
        ) : null}
      </ScreenScroll>
    )
  }

  function stepDone(key: StepKey): boolean {
    if (key === 'details') return false
    return Boolean(photos[key]) || (key === 'barcode' && Boolean(code))
  }

  const canContinue = photoStep ? Boolean(photos[photoStep.key]) || (photoStep.key === 'barcode' && Boolean(code)) : true
  const header = (
    <View style={styles.topRow}>
      <IconButton icon="chevron-back" accessibilityLabel={stepIndex === 0 ? 'Close' : 'Previous step'} onPress={back} testID="contribute-back" />
      <View style={styles.headerCopy}>
        <Txt variant="label" tone="muted">
          Add a food
        </Txt>
        <Txt variant="caption" tone="faint">
          Step {stepIndex + 1} of {STEP_KEYS.length}
        </Txt>
      </View>
      <IconButton icon="close" tone="chip" size={40} accessibilityLabel="Close" onPress={exit} testID="contribute-close" />
    </View>
  )

  const stepper = (
    <View style={styles.stepper} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: STEP_KEYS.length, now: stepIndex + 1 }}>
      {STEP_KEYS.map((key, index) => (
        <View
          key={key}
          style={[styles.stepSegment, { backgroundColor: index === stepIndex ? c.mintStrong : stepDone(key) ? c.primary : c.chip }]}
        />
      ))}
    </View>
  )

  const capture = photoStep ? (
    photos[photoStep.key] ? (
      <Animated.View entering={FadeIn.duration(220)} key={`preview-${photoStep.key}`}>
        <View style={[styles.preview, { height: cameraHeight, backgroundColor: c.inverse }]} testID="photo-preview">
          <Image source={{ uri: photos[photoStep.key]!.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
          <View style={styles.previewBadge}>
            <Badge label={photoStep.key === 'barcode' && scannedCode ? `Read ${code}` : 'Looks good'} icon="checkmark-circle" tone="mint" />
          </View>
        </View>
      </Animated.View>
    ) : (
      <CaptureCamera
        key={`camera-${photoStep.key}`}
        guide={photoStep.guide}
        hint={photoStep.hint}
        height={cameraHeight}
        fileName={`${photoStep.key}.jpg`}
        scanBarcodes={photoStep.key === 'barcode'}
        onBarcode={onBarcode}
        onCapture={(photo) => setPhoto(photoStep.key, photo)}
      />
    )
  ) : null

  const stepCopy = photoStep ? (
    <View style={styles.copy}>
      <View style={styles.titleRow}>
        <Txt variant="title">{photoStep.title}</Txt>
        {photoStep.optional ? <Badge label="Optional" tone="card" /> : null}
      </View>
      <Txt variant="body" tone="muted">
        {photoStep.body}
      </Txt>
    </View>
  ) : (
    <View style={styles.copy}>
      <Txt variant="title">Anything else?</Txt>
      <Txt variant="body" tone="muted">
        All optional. A name and serving size help us publish it faster.
      </Txt>
    </View>
  )

  const photoActions = photoStep ? (
    <View style={styles.actions}>
      {photos[photoStep.key] ? (
        <View style={styles.actionsRow}>
          <UButton label="Retake" tone="chip" onPress={() => setPhoto(photoStep.key, null)} style={styles.flex} fullWidth testID="retake" />
          <UButton label="Use photo" onPress={next} style={styles.flex} fullWidth testID="use-photo" />
        </View>
      ) : (
        <>
          <UButton
            label={wide ? 'Upload a photo instead' : 'Choose from library'}
            tone="card"
            fullWidth
            onPress={() => void pickFromLibrary(photoStep.key)}
            testID="pick-photo"
          />
          {canContinue || photoStep.optional ? (
            <UButton
              label={photoStep.key === 'barcode' ? 'Continue with the number' : 'Skip, there’s no label'}
              tone="ghost"
              fullWidth
              onPress={next}
              testID="skip-step"
            />
          ) : null}
        </>
      )}
    </View>
  ) : null

  const barcodeField =
    stepKey === 'barcode' ? (
      <Field
        key={`code-${codeVersion}`}
        label={scannedCode ? 'Barcode number (read from the scan)' : 'Barcode number'}
        defaultValue={code}
        placeholder="Scan it, or type the digits under the bars"
        keyboardType="number-pad"
        maxLength={14}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, '')
          typedCode.current = digits.length > 0
          setCode(digits)
          setScannedCode(false)
        }}
        testID="contribute-code"
      />
    ) : null

  const details =
    stepKey === 'details' ? (
      <View style={styles.details}>
        <Card style={styles.detailCard}>
          <Field label="Product name" defaultValue={name} placeholder="e.g. Greek yogurt, plain" onChangeText={setName} maxLength={256} testID="contribute-name" />
          <View style={[styles.fieldRow, !wide && styles.fieldColumn]}>
            <Field label="Brand" defaultValue={brand} placeholder="e.g. Fage" onChangeText={setBrand} maxLength={256} testID="contribute-brand" />
            <Field label="Serving size" defaultValue={serving} placeholder="e.g. 170 g" onChangeText={setServing} maxLength={64} testID="contribute-serving" />
          </View>
        </Card>
        <Card style={styles.detailCard}>
          <View style={styles.titleRow}>
            <Txt variant="subheading">Extra photo</Txt>
            <Badge label="Optional" tone="peach" />
          </View>
          <Txt variant="caption" tone="muted">
            Allergen panel, back of pack, or anything else that looks useful.
          </Txt>
          {photos.extra ? (
            <View style={styles.extraRow}>
              <Image source={{ uri: photos.extra.uri }} style={styles.extraThumb} />
              <UButton label="Remove" tone="chip" size="sm" onPress={() => setPhoto('extra', null)} />
            </View>
          ) : extraCamera ? (
            <CaptureCamera
              guide="landscape"
              hint="Anything that helps describe the product"
              height={wide ? 360 : 300}
              fileName="extra.jpg"
              onCapture={(photo) => {
                setPhoto('extra', photo)
                setExtraCamera(false)
              }}
            />
          ) : null}
          {!photos.extra ? (
            <View style={styles.actionsRow}>
              {!extraCamera ? <UButton label="Take photo" tone="mint" size="sm" onPress={() => setExtraCamera(true)} testID="extra-camera" /> : null}
              <UButton label="Choose photo" tone="chip" size="sm" onPress={() => void pickFromLibrary('extra')} testID="extra-pick" />
            </View>
          ) : null}
        </Card>
        {missingRequired.length ? (
          <ErrorNote message={`Still needed: ${missingRequired.map((step) => step.label.toLowerCase()).join(', ')}.`} />
        ) : null}
        <UButton
          label="Send to Kiloric"
          trailing={`${photoKinds.length} photo${photoKinds.length === 1 ? '' : 's'}`}
          size="lg"
          fullWidth
          disabled={missingRequired.length > 0}
          onPress={() => void send()}
          testID="contribute-send"
        />
      </View>
    ) : null

  const thumbs = (
    <View style={[styles.thumbs, wide && styles.thumbsWide]}>
      {[...PHOTO_STEPS, null].map((step, index) => {
        const key: StepKey = step?.key ?? 'details'
        const photo = step ? photos[step.key] : null
        const active = key === stepKey
        const done = stepDone(key)
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`${step?.label ?? 'Details'}${done ? ', done' : ''}`}
            onPress={() => {
              setExtraCamera(false)
              setStepIndex(index)
            }}
            style={[styles.thumb, wide && styles.thumbWide, { backgroundColor: active ? c.mint : c.card, borderColor: active ? c.primary : c.line }]}
            testID={`thumb-${key}`}
          >
            <View style={[styles.thumbImage, { backgroundColor: c.chip }]}>
              {photo ? (
                <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} />
              ) : (
                <Ionicons name={step?.icon ?? 'create-outline'} size={20} color={done ? c.primary : c.inkMuted} />
              )}
              {done ? (
                <View style={[styles.thumbCheck, { backgroundColor: c.primary }]}>
                  <Ionicons name="checkmark" size={11} color={c.onPrimary} />
                </View>
              ) : null}
            </View>
            {wide ? (
              <View style={styles.flex}>
                <Txt variant="bodyStrong">{step?.label ?? 'Details'}</Txt>
                <Txt variant="caption" tone="muted">
                  {step ? (photo ? 'Photo added' : step.optional ? 'Optional' : step.key === 'barcode' && code ? `Number ${code}` : 'Needed') : 'Name, brand, extras'}
                </Txt>
              </View>
            ) : (
              <Txt variant="caption" tone={active ? 'ink' : 'muted'} numberOfLines={1}>
                {step?.label ?? 'Details'}
              </Txt>
            )}
          </Pressable>
        )
      })}
    </View>
  )

  if (wide) {
    return (
      <ScreenScroll maxWidth={contentWidth} testID="contribute-food">
        {header}
        {stepper}
        <View style={styles.wideRow}>
          <View style={styles.wideMain}>
            {stepKey === 'details' ? (
              <>
                {stepCopy}
                {details}
              </>
            ) : (
              capture
            )}
          </View>
          <View style={styles.wideSide}>
            {photoStep ? stepCopy : null}
            {barcodeField}
            {photoActions}
            <Card padded={false} style={styles.sideCard}>
              {thumbs}
            </Card>
            <Txt variant="caption" tone="faint">
              Photos are private to you and our reviewers until the product is published.
            </Txt>
          </View>
        </View>
      </ScreenScroll>
    )
  }

  return (
    <ScreenScroll maxWidth={560} testID="contribute-food">
      {header}
      {stepper}
      {thumbs}
      {stepCopy}
      {capture}
      {barcodeField}
      {photoActions}
      {details}
    </ScreenScroll>
  )
}

function ProgressTrack({ fraction }: { fraction: number }) {
  const c = usePalette()
  return (
    <View
      style={[styles.track, { backgroundColor: c.chip }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
      testID="upload-progress"
    >
      <View style={[styles.trackFill, { width: `${Math.round(fraction * 100)}%`, backgroundColor: c.primary }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerCopy: { flex: 1, alignItems: 'center' },
  stepper: { flexDirection: 'row', gap: 6 },
  stepSegment: { flex: 1, height: 6, borderRadius: 3 },
  copy: { gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  preview: { width: '100%', borderRadius: 28, overflow: 'hidden' },
  previewBadge: { position: 'absolute', top: 16, left: 16 },
  actions: { gap: 10 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  details: { gap: 16 },
  detailCard: { gap: 14 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldColumn: { flexDirection: 'column' },
  extraRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  extraThumb: { width: 72, height: 72, borderRadius: 16 },
  thumbs: { flexDirection: 'row', gap: 8 },
  thumbsWide: { flexDirection: 'column', gap: 0 },
  thumb: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 2, borderRadius: 18, borderWidth: 1 },
  thumbWide: { flexDirection: 'row', gap: 14, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 0, borderWidth: 0 },
  thumbImage: { width: 44, height: 44, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumbCheck: { position: 'absolute', right: 2, bottom: 2, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  wideRow: { flexDirection: 'row', gap: 32, alignItems: 'flex-start' },
  wideMain: { flex: 1.35, gap: 16 },
  wideSide: { flex: 1, gap: 16 },
  sideCard: { overflow: 'hidden', paddingVertical: 6 },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 5 },
  uploadList: { paddingHorizontal: 16 },
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  uploadThumb: { width: 48, height: 48, borderRadius: 12 },
  miniTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  miniFill: { height: '100%', borderRadius: 3 },
  thanks: { alignItems: 'center', gap: 18, paddingTop: 24 },
  thanksCopy: { gap: 10, alignItems: 'center', maxWidth: 440 },
  thanksBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  thanksActions: { width: '100%', gap: 10, marginTop: 8 },
})
