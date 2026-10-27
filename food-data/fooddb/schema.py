"""Output schema for the exported `foods` table.

Column names and value conventions match the Oracle ORDS `friendly-food` / `code`
endpoints the app reads (see `src/lib/ordsNormalize.ts`). Nutrients follow the
Open Food Facts convention: every `*_100g` value is grams per 100 g (or 100 ml),
except energy, which is kcal / kJ per 100 g.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Column:
    name: str
    kind: str  # "text" | "real" | "int"
    max_len: int | None = None
    max_value: float | None = None
    min_value: float = 0.0


TEXT = "text"
REAL = "real"
INT = "int"

# Upper bounds reject obviously broken values (unit mix-ups, typos) instead of
# exporting them. 100 g per 100 g is the physical ceiling for any component;
# micronutrient caps sit just above the richest real foods and supplements
# (e.g. calcium carbonate is 40 % calcium, magnesium oxide 60 % magnesium).
COLUMNS: tuple[Column, ...] = (
    Column("code", TEXT, 64),
    Column("product_name", TEXT, 256),
    Column("brands", TEXT, 256),
    Column("categories", TEXT, 512),
    Column("quantity", TEXT, 128),
    Column("serving_size", TEXT, 128),
    Column("serving_quantity", REAL, max_value=5000),
    Column("allergens", TEXT, 512),
    Column("traces_tags", TEXT, 512),
    Column("image_url", TEXT, 1024),
    Column("nova_group", INT, min_value=1, max_value=4),
    Column("nutriscore_grade", TEXT, 8),
    Column("ecoscore_grade", TEXT, 8),
    Column("carbon_footprint_100g", REAL, max_value=100000),
    Column("additives_n", INT, max_value=100),
    Column("energy_kcal_100g", REAL, max_value=1000),
    Column("energy_kj_100g", REAL, max_value=4200),
    Column("proteins_100g", REAL, max_value=100),
    Column("carbohydrates_100g", REAL, max_value=100),
    Column("fat_100g", REAL, max_value=100),
    Column("fiber_100g", REAL, max_value=100),
    Column("sugars_100g", REAL, max_value=100),
    Column("added_sugars_100g", REAL, max_value=100),
    Column("polyols_100g", REAL, max_value=100),
    Column("saturated_fat_100g", REAL, max_value=100),
    Column("trans_fat_100g", REAL, max_value=100),
    Column("monounsaturated_fat_100g", REAL, max_value=100),
    Column("polyunsaturated_fat_100g", REAL, max_value=100),
    Column("sodium_100g", REAL, max_value=40),
    Column("cholesterol_100g", REAL, max_value=4),
    Column("vitamin_a_100g", REAL, max_value=0.5),
    Column("vitamin_c_100g", REAL, max_value=100),
    Column("vitamin_d_100g", REAL, max_value=0.05),
    Column("vitamin_b12_100g", REAL, max_value=0.1),
    Column("calcium_100g", REAL, max_value=40),
    Column("iron_100g", REAL, max_value=5),
    Column("potassium_100g", REAL, max_value=55),
    Column("magnesium_100g", REAL, max_value=60),
    Column("caffeine_100g", REAL, max_value=100),
    Column("taurine_100g", REAL, max_value=100),
    Column("ingredients_text", TEXT, 2000),
    Column("countries", TEXT, 128),
    Column("data_sources", TEXT, 256),
    Column("source_ids", TEXT, 1024),
    Column("trust_and_completion_score", INT),
    Column("updated_timestamp", TEXT, 32),
    # Appended so positional readers of the legacy schema keep their columns.
    # Existing clients can continue reading ingredients_text.
    Column("ingredients", TEXT, 2000),
)

COLUMN_BY_NAME = {c.name: c for c in COLUMNS}
COLUMN_NAMES = tuple(c.name for c in COLUMNS)

NUTRIENT_FIELDS = (
    "proteins_100g",
    "carbohydrates_100g",
    "fat_100g",
    "fiber_100g",
    "sugars_100g",
    "added_sugars_100g",
    "polyols_100g",
    "saturated_fat_100g",
    "trans_fat_100g",
    "monounsaturated_fat_100g",
    "polyunsaturated_fat_100g",
    "sodium_100g",
    "cholesterol_100g",
    "vitamin_a_100g",
    "vitamin_c_100g",
    "vitamin_d_100g",
    "vitamin_b12_100g",
    "calcium_100g",
    "iron_100g",
    "potassium_100g",
    "magnesium_100g",
    "caffeine_100g",
    "taurine_100g",
)

ENERGY_FIELDS = ("energy_kcal_100g", "energy_kj_100g")
SERVING_FIELDS = ("serving_size", "serving_quantity")
BRAND_FIELDS = ("brands",)
IDENTITY_FIELDS = (
    "product_name",
    "categories",
    "quantity",
    "allergens",
    "traces_tags",
    "image_url",
    "nova_group",
    "nutriscore_grade",
    "ecoscore_grade",
    "carbon_footprint_100g",
    "additives_n",
    "ingredients_text",
)
UNION_FIELDS = ("countries", "data_sources", "source_ids")

# Fields counted towards the completion half of `trust_and_completion_score`.
COMPLETION_FIELDS = (
    ("product_name", "brands", "categories", "quantity", "allergens", "image_url", "ingredients_text")
    + SERVING_FIELDS
    + ENERGY_FIELDS
    + NUTRIENT_FIELDS
)

# Source keys, in the order a reader would recognise them.
USDA_FOUNDATION = "usda_foundation"
USDA_SR_LEGACY = "usda_sr_legacy"
USDA_SURVEY = "usda_survey"
USDA_BRANDED = "usda_branded"
CNF = "cnf"
OFF = "off"

SOURCE_LABELS = {
    USDA_FOUNDATION: "USDA FoodData Central (Foundation)",
    USDA_SR_LEGACY: "USDA FoodData Central (SR Legacy)",
    USDA_SURVEY: "USDA FoodData Central (FNDDS)",
    USDA_BRANDED: "USDA FoodData Central (Branded)",
    CNF: "Health Canada Canadian Nutrient File",
    OFF: "Open Food Facts",
}

SOURCE_ID_PREFIX = {
    USDA_FOUNDATION: "usda",
    USDA_SR_LEGACY: "usda",
    USDA_SURVEY: "usda",
    USDA_BRANDED: "usda",
    CNF: "cnf",
    OFF: "off",
}

GOVERNMENT_SOURCES = frozenset({USDA_FOUNDATION, USDA_SR_LEGACY, USDA_SURVEY, USDA_BRANDED, CNF})

# When duplicates condense, each field group takes its value from the first
# source in this order that has one; later sources only fill gaps.
# Lab-analysed government data wins for nutrition; Open Food Facts usually has
# the cleanest product names, photos, allergens and scores; USDA branded data
# carries the brand exactly as the manufacturer wrote it.
FIELD_GROUP_SOURCE_ORDER = {
    "identity": (OFF, USDA_BRANDED, USDA_FOUNDATION, USDA_SR_LEGACY, CNF, USDA_SURVEY),
    "brand": (USDA_BRANDED, OFF, USDA_FOUNDATION, USDA_SR_LEGACY, CNF, USDA_SURVEY),
    "nutrition": (USDA_FOUNDATION, USDA_SR_LEGACY, USDA_BRANDED, CNF, USDA_SURVEY, OFF),
}

FIELD_GROUPS = {
    "identity": IDENTITY_FIELDS,
    "brand": BRAND_FIELDS,
    "serving": SERVING_FIELDS,
    "energy": ENERGY_FIELDS,
    "nutrients": NUTRIENT_FIELDS,
}

FIELD_GROUP_ORDER_KEY = {
    "identity": "identity",
    "brand": "brand",
    "serving": "nutrition",
    "energy": "nutrition",
    "nutrients": "nutrition",
}

COUNTRY_NAMES = {"us": "United States", "ca": "Canada"}
