"""Health Canada Canadian Nutrient File (CNF) CSV release."""

from __future__ import annotations

import zipfile
from pathlib import Path
from typing import Iterator

from ..download import log
from ..normalize import IU_TO_GRAMS, clean_name, clean_text, parse_number, serving_label, to_grams, to_iso
from ..records import make_record
from ..schema import CNF
from .common import read_zip_csv

ENCODING = "latin-1"

# CNF NutrientID -> (column, preference); lower preference wins.
NUTRIENT_IDS: dict[str, tuple[str, int]] = {
    "208": ("energy_kcal_100g", 0),
    "268": ("energy_kj_100g", 0),
    "203": ("proteins_100g", 0),
    "205": ("carbohydrates_100g", 0),
    "204": ("fat_100g", 0),
    "291": ("fiber_100g", 0),
    "269": ("sugars_100g", 0),
    "606": ("saturated_fat_100g", 0),
    "605": ("trans_fat_100g", 0),
    "645": ("monounsaturated_fat_100g", 0),
    "646": ("polyunsaturated_fat_100g", 0),
    "307": ("sodium_100g", 0),
    "601": ("cholesterol_100g", 0),
    "814": ("vitamin_a_100g", 0),  # µg RAE
    "401": ("vitamin_c_100g", 0),
    "339": ("vitamin_d_100g", 0),  # µg (D2 + D3)
    "324": ("vitamin_d_100g", 1),  # IU
    "418": ("vitamin_b12_100g", 0),
    "301": ("calcium_100g", 0),
    "303": ("iron_100g", 0),
    "306": ("potassium_100g", 0),
    "304": ("magnesium_100g", 0),
    "262": ("caffeine_100g", 0),
}


def _factors(archive: zipfile.ZipFile) -> dict[str, float]:
    factors: dict[str, float] = {}
    for row in read_zip_csv(archive, "NUTRIENT NAME.csv", ENCODING):
        nutrient_id = (row.get("NutrientID") or "").strip()
        if nutrient_id not in NUTRIENT_IDS:
            continue
        field = NUTRIENT_IDS[nutrient_id][0]
        unit = (row.get("NutrientUnit") or "").strip().lower()
        if field.startswith("energy_"):
            factors[nutrient_id] = 1.0
        elif unit == "iu":
            if field in IU_TO_GRAMS:
                factors[nutrient_id] = IU_TO_GRAMS[field]
        else:
            converted = to_grams(1.0, unit)
            if converted is not None:
                factors[nutrient_id] = converted
    return factors


def _measures(archive: zipfile.ZipFile) -> dict[str, tuple[str | None, float]]:
    """First household measure per food (CNF factors are relative to 100 g)."""
    names = {
        (row.get("MeasureID") or "").strip(): clean_text(row.get("MeasureDescription"))
        for row in read_zip_csv(archive, "MEASURE NAME.csv", ENCODING)
    }
    best: dict[str, tuple[tuple, str | None, float]] = {}
    for row in read_zip_csv(archive, "CONVERSION FACTOR.csv", ENCODING):
        food_id = (row.get("FoodID") or "").strip()
        measure_id = (row.get("MeasureID") or "").strip()
        factor = parse_number(row.get("ConversionFactorValue"))
        if not factor or factor <= 0:
            continue
        name = names.get(measure_id)
        is_reference = bool(name) and name.replace(" ", "").lower() in ("100g", "100ml")
        rank = (1 if is_reference else 0, int(measure_id) if measure_id.isdigit() else 1 << 30)
        if food_id not in best or rank < best[food_id][0]:
            best[food_id] = (rank, name, factor * 100)
    return {food_id: (name, grams) for food_id, (_, name, grams) in best.items()}


def iter_cnf(path: Path, limit: int | None = None) -> Iterator[dict]:
    with zipfile.ZipFile(path) as archive:
        groups = {
            (row.get("FoodGroupID") or "").strip(): clean_text(row.get("FoodGroupName"))
            for row in read_zip_csv(archive, "FOOD GROUP.csv", ENCODING)
        }
        foods = list(read_zip_csv(archive, "FOOD NAME.csv", ENCODING))
        if limit:
            foods = foods[:limit]
        wanted = {(row.get("FoodID") or "").strip() for row in foods}
        factors = _factors(archive)

        best: dict[str, dict[str, tuple[int, float]]] = {}
        for row in read_zip_csv(archive, "NUTRIENT AMOUNT.csv", ENCODING):
            food_id = (row.get("FoodID") or "").strip()
            nutrient_id = (row.get("NutrientID") or "").strip()
            if food_id not in wanted or nutrient_id not in factors:
                continue
            amount = parse_number(row.get("NutrientValue"))
            if amount is None:
                continue
            field, preference = NUTRIENT_IDS[nutrient_id]
            per_food = best.setdefault(food_id, {})
            current = per_food.get(field)
            if current is None or preference < current[0]:
                per_food[field] = (preference, amount * factors[nutrient_id])
        measures = _measures(archive)
    log(f"[cnf] {len(foods):,} foods")

    for row in foods:
        food_id = (row.get("FoodID") or "").strip()
        fields = {field: value for field, (_, value) in best.get(food_id, {}).items()}
        fields["product_name"] = clean_name(row.get("FoodDescription"))
        fields["categories"] = groups.get((row.get("FoodGroupID") or "").strip())
        measure = measures.get(food_id)
        if measure:
            fields["serving_size"] = serving_label(measure[0], measure[1])
            fields["serving_quantity"] = measure[1]
        yield make_record(
            CNF,
            food_id,
            fields,
            code=f"cnf-{food_id}",
            match_by_name=True,
            countries=("ca",),
            updated=to_iso(row.get("FoodDateOfPublication") or row.get("FoodDateOfEntry")),
        )
