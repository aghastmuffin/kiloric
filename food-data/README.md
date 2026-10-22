# food-data

Python pipeline that builds Kiloric's food catalog as a SQL database from:

| Source | What it contributes | Licence |
| --- | --- | --- |
| [USDA FoodData Central](https://fdc.nal.usda.gov/download-datasets) (Foundation, SR Legacy, FNDDS survey, Branded) | Lab-analysed generic foods and US manufacturer label data | Public domain (CC0) |
| [Health Canada Canadian Nutrient File](https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/nutrient-data/canadian-nutrient-file-2015-download-files.html) (CNF 2015) | Canadian generic foods | Open Government Licence – Canada |
| [Open Food Facts](https://world.openfoodfacts.org/data) | Packaged products sold in the **US and/or Canada** only | ODbL 1.0 |

> Open Food Facts data is ODbL: a public database built from it must credit Open Food Facts and be shared under ODbL. `data_sources` on every row records where its data came from.

The output matches the columns the app already reads from the Oracle ORDS `friendly-food` / `code` endpoints
(`src/lib/ordsNormalize.ts`, `src/lib/data/foodItem.ts`), so it can be loaded behind those endpoints without app changes.

Only the Python standard library is needed (Python 3.10+).

## Usage

```bash
cd food-data
python3 -m fooddb build                         # download (cached in .cache/) + build output/kiloric_foods.sqlite
python3 -m fooddb build --sql output/foods.sql  # also write a .sql script (default dialect: sqlite)
python3 -m fooddb build --sql output/foods_oracle.sql --dialect oracle   # or postgres
python3 -m fooddb dump --sql output/foods_pg.sql --dialect postgres      # convert an existing build
python3 -m fooddb download                      # only fetch the source files
```

Useful flags:

| Flag | Purpose |
| --- | --- |
| `--sources usda,cnf,off` | Pick sources (default: all) |
| `--usda-datasets foundation,sr_legacy,survey,branded` | Pick FoodData Central datasets (default: all) |
| `--countries us,ca` | Markets to keep for Open Food Facts and USDA Branded (default: both) |
| `--limit N` | Max records per source, for a quick test build |
| `--off-file`, `--cnf-file`, `--usda-branded-file`, … | Use local copies instead of downloading |
| `--refresh` | Re-download even if cached |

The newest FoodData Central release is discovered from the USDA download page; downloads resume if interrupted.
A full build downloads about 1.7 GB (mostly the Open Food Facts export and USDA Branded), peaks at about 900 MB of RAM and takes around 6 minutes once downloaded. It condenses roughly 1.58 M source records into 1.2 M foods (about 1 GB of SQLite, plus about 870 MB for the optional `.sql` script) with 3.7 M barcode/ID aliases.

Tests (no network, synthetic fixtures in each upstream format):

```bash
cd food-data && python3 -m unittest discover -s tests -t .
```

## Output

`output/kiloric_foods.sqlite` contains:

- `foods` — one row per food (schema below)
- `food_codes` — `alias → code` for every barcode spelling and source ID that was condensed into a row
  (e.g. `016000275287`, `00016000275287`, USDA FDC ID `2042000` → `0016000275287`; CNF `cnf-1543` → `173944`)
- `build_info` — input file names, record counts and build time
- `foods_fts` — SQLite FTS5 index over `product_name`, `brands`, `categories` (SQLite file only)

The `.sql` script contains `foods`, `food_codes` and `build_info` as `CREATE TABLE` + `INSERT` statements.

### `foods` columns

| Column | Notes |
| --- | --- |
| `code` | Barcode as Open Food Facts stores it (EAN-8 stays 8 digits, UPC-A/EAN-13 become 13). Generic foods without a barcode use the USDA FDC ID (as the current ORDS data does) or `cnf-<FoodID>`. |
| `product_name` | Never empty. ALL-CAPS names are title-cased. Products with no name get `Unnamed product (barcode …)`, the same placeholder the app uses. |
| `brands`, `categories`, `quantity`, `serving_size`, `ingredients_text` | Readable text, whitespace/HTML cleaned. |
| `serving_quantity` | Grams (or ml) in one serving; `serving_size` always includes the weight, e.g. `1 cup (240 g)`. |
| `allergens`, `traces_tags` | Comma-separated Open Food Facts tags, e.g. `en:gluten,en:milk`. |
| `image_url`, `nutriscore_grade` (`a`–`e`), `ecoscore_grade` (`a-plus`–`f`), `nova_group` (1–4), `additives_n`, `carbon_footprint_100g` | From Open Food Facts. |
| `energy_kcal_100g`, `energy_kj_100g` | Both always filled when either is known. kJ values entered in the kcal field are corrected using the same check the app applies (`kcalPer100g`). If neither is known but protein, carbs and fat are, kcal is estimated with 4/4/9. |
| `proteins_100g` … `taurine_100g` | **Grams per 100 g** (Open Food Facts convention) for every nutrient, including sodium, cholesterol, vitamins and minerals. USDA/CNF mg and µg values are converted; vitamin A uses µg RAE (IU × 0.3 µg if only IU exists) and vitamin D µg (IU × 0.025 µg). |
| `countries` | `United States`, `Canada` or both. |
| `data_sources` | Human-readable source list. |
| `source_ids` | Every upstream record merged into the row, e.g. `cnf:1543;usda:173944`. |
| `trust_and_completion_score` | `10000` if any government source contributed, plus the percentage of core fields filled (0–100). |
| `updated_timestamp` | Newest upstream modification time, ISO 8601 UTC. |

Missing values are SQL `NULL` (ORDS serves those as `"Unknown"`, which the app already ignores). Values that are
physically impossible (negative, more than 100 g per 100 g, more than 1000 kcal per 100 g, …) are dropped to `NULL` rather than exported.

Incomplete foods are always kept. A barcode with no other data still lets a scan find the product, and the app then asks the user to contribute the missing label details.

## How duplicates condense

Records are grouped by:

1. **Barcode**: every source's GTIN is normalized, so Open Food Facts, USDA Branded and duplicate Open Food Facts entries for the same product become one row. USDA Branded keeps only the newest label submission per GTIN.
2. **Normalized name** for generic foods without a barcode (USDA Foundation / SR Legacy / FNDDS and CNF). Case, accents, word order and simple plurals are ignored, so `Bananas, raw` (USDA) and `Banana, raw` (CNF) merge.

Within a group, each field takes the first non-empty value in source priority order. Lower-priority sources only fill the gaps:

| Fields | Priority |
| --- | --- |
| Name, categories, image, allergens, scores, ingredients, package quantity | Open Food Facts → USDA Branded → Foundation → SR Legacy → CNF → FNDDS |
| Brand | USDA Branded (manufacturer text) → Open Food Facts → … → brand owner as a last resort |
| Energy, serving, nutrients | Foundation → SR Legacy → USDA Branded → CNF → FNDDS → Open Food Facts |

Energy (kcal + kJ) and serving (text + grams) are each taken from the same record, so the numbers and label text stay consistent. Ties within one source go to the more complete record, then the most recently updated one.

## Layout

```
fooddb/
  __main__.py      CLI
  build.py         download → parse → stage → condense → export
  download.py      cached/resumable downloads, latest FDC release discovery
  normalize.py     text, barcode, unit and energy standardization
  records.py       per-source standardized records + merge keys
  merge.py         disk-backed staging and duplicate condensation
  export.py        SQLite output and sqlite/postgres/oracle .sql scripts
  schema.py        output columns, limits and source priorities
  sources/         usda.py, cnf.py, off.py parsers
tests/             unittest suite with fixture files in each upstream format
```
