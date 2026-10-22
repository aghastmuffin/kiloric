# Food contributions

Standalone user-submitted food data for products missing from the catalog (or incomplete). Photos land in a moderation bucket; rows are pending until reviewed / later ML processing / Oracle import.

## Resources

| Resource | ID / env |
| --- | --- |
| Database | `foods` (`6a4577f00008c718d204`) → `EXPO_PUBLIC_APPWRITE_FOODS_DATABASE_ID` |
| Table | `food_contributions` → `EXPO_PUBLIC_APPWRITE_FOOD_CONTRIBUTIONS_COLLECTION_ID` |
| Bucket | `images_to_check` (`6a32e0dd000f9dee7b98`) → `EXPO_PUBLIC_APPWRITE_FOOD_IMAGES_BUCKET_ID` |

Defined in [`appwrite.config.json`](../../appwrite.config.json).

## Why standalone

The client module [`src/lib/foodContributions.ts`](../../src/lib/foodContributions.ts) exposes a transport-agnostic API:

```ts
confirmContributor(userId) → owner                     // rejects if the session user differs
uploadContributionPhoto(owner, { kind, uri, mimeType?, fileName?, fileSize?, file? }, onProgress?) → fileId
createContributionRecord(owner, {
  files: { barcode?, front?, ingredients?, nutrition?, extra?: string[] },
  product_name: string,   // blank → "Unnamed product (barcode …)"
  code?: string,          // barcode, optional
  source_query?: string,  // what the user searched/scanned
  fields?: { /* OFF keys, all optional */ }
}) → { id, status, files, storedInColumns }
discardContributionFiles(files)   // best-effort cleanup when the user leaves mid-flow
countContributions(owner) → number | null
```

Photos upload one at a time so the screen can show per-photo progress and retry only the ones that failed. [`src/lib/imageUpload.ts`](../../src/lib/imageUpload.ts) sends a multipart `XMLHttpRequest` with the same session cookies and project headers as the SDK. It does this because `storage.createFile` in `react-native-appwrite` 0.32 can't send a browser `Blob` and only reports progress for chunked (>5 MB) uploads. On web, photos are re-encoded to a JPEG of at most 1600 px before upload. On native they're sent as captured, and files over 5 MB go through the SDK's chunked upload.

Public field names match Open Food Facts (including hyphens like `energy-kcal_100g`). The module maps them to Appwrite snake_case columns (`energy_kcal_100g`). When this moves to Oracle, replace only the upload + insert internals; keep the same input shape.

UI screens must **not** import the Appwrite SDK — only this module.

## Required vs optional

| Field | Required |
| --- | --- |
| Photos (jpg/png, ≤10 MB each) | front + ingredients; barcode photo or number; nutrition label and one extra photo optional |
| `product_name` | stored always; the app fills a placeholder when the user leaves it blank |
| `code` (barcode) | no (prefilled from scan when available) |
| All other OFF identity / `*_100g` nutrients | no |

Status defaults to `pending`.

## Schema (Appwrite columns)

Identity / metadata:

- `owner`, `status`, `photo_file_id`, `source_query`
- `code`, `product_name`, `brands`, `categories`, `quantity`, `serving_size`, `serving_quantity`
- `allergens`, `traces_tags`, `image_url`, `nova_group`, `nutriscore_grade`, `ecoscore_grade`
- `carbon_footprint_100g` ← OFF `carbon-footprint_100g`
- `additives_n`

`photo_file_id` is the front-of-pack photo (or the first photo when there isn't one).

Labelled photo columns (in `appwrite.config.json`; create them with
`APPWRITE_API_KEY=… npm run appwrite:setup-features`):

- `front_file_id`, `barcode_file_id`, `ingredients_file_id`, `nutrition_file_id` (string 64)
- `extra_file_ids` (string 64, array)
- `submitted_from` (string 16: `ios` / `android` / `web`)

Until those columns exist, Appwrite rejects them as unknown attributes. The app then retries once without them and packs the
labelled IDs into `image_url`, for example `appwrite-files://barcode=…;front=…;ingredients=…;nutrition=…;extra=…,…`. It
remembers that for the session. `decodeContributionFiles()` reads this format and the older unlabelled
`appwrite-files://id,id` list, so moderation and account deletion can treat the set as one submission.

Nutrients (all doubles, `_100g`):

`energy_kcal`, `energy_kj`, `proteins`, `carbohydrates`, `fat`, `fiber`, `sugars`, `added_sugars`, `polyols`, `saturated_fat`, `trans_fat`, `monounsaturated_fat`, `polyunsaturated_fat`, `sodium`, `cholesterol`, `vitamin_a`, `vitamin_c`, `vitamin_d`, `vitamin_b12`, `calcium`, `iron`, `potassium`, `magnesium`, `caffeine`, `taurine`

## Permissions

**Table**

- Row security (`rowSecurity` / documentSecurity) enabled
- Table-level: **Users → Create** only
- Each create sets read/update/delete for `Role.user(owner)`

**Bucket `images_to_check`**

- File security enabled; jpg/png; max 10 MB
- Bucket-level: **Users → Create** (plus existing team roles for moderators)
- Each upload sets read/update/delete for `Role.user(owner)`

## Deploy

```bash
# Prefer CLI push from appwrite.config.json
npm run appwrite:push-tables

# Or legacy REST helper (needs APPWRITE_API_KEY)
APPWRITE_API_KEY=… node scripts/setup-food-contributions.mjs
```

Also ensure the `images_to_check` bucket allows `create("users")` (already in `appwrite.config.json`).

## App integration

- Module: [`src/lib/foodContributions.ts`](../../src/lib/foodContributions.ts)
- Screen: [`src/app/contribute-food.tsx`](../../src/app/contribute-food.tsx). It's a five-step capture flow: barcode (auto-read and auto-snapped with `CameraView` barcode scanning, which also works on web), front, ingredients, nutrition label (optional), then details (name, brand, serving and one extra photo, all optional). Each photo step uses the in-app camera ([`CaptureCamera`](../../src/components/contribute/CaptureCamera.tsx)) with a framing guide and retake, and falls back to the library or file picker. Next comes an upload screen with per-photo progress and retry, then a thank-you screen with a confetti burst ([`ThanksBurst`](../../src/components/contribute/ThanksBurst.tsx), skipped when Reduce Motion is on).
- Entry points: "Can't find it? Add a food" on Log food (also the action on an empty search), the barcode-not-found state in `review-log`, and `Additions` / `LogFoodMultiView`, which prefill OFF fields through route params.

Contributions are **not** read back into meal logging or ORDS search. They are a write-only queue until a later pipeline promotes them.
