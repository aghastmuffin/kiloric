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
submitFoodContribution(userId, {
  photo: { uri, mimeType?, fileName?, fileSize? },
  product_name: string,   // required
  code?: string,          // barcode, optional
  source_query?: string,  // what the user searched/scanned
  fields?: { /* OFF keys, all optional */ }
}) → { id, photoFileId, status }
```

Public field names match Open Food Facts (including hyphens like `energy-kcal_100g`). The module maps them to Appwrite snake_case columns (`energy_kcal_100g`). When this moves to Oracle, replace only the upload + insert internals; keep the same input shape.

UI screens must **not** import the Appwrite SDK — only this module.

## Required vs optional

| Field | Required |
| --- | --- |
| Photo (jpg/png, ≤10 MB) | yes (new food) |
| `product_name` | yes |
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
- Screen: [`src/app/contribute-food.tsx`](../../src/app/contribute-food.tsx)
- Entry points: empty search on Log tab, multiresponse “no products found”, barcode detail error

Contributions are **not** read back into meal logging or ORDS search. They are a write-only queue until a later pipeline promotes them.
