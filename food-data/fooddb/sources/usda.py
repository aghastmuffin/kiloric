"""USDA FoodData Central (Foundation, SR Legacy, FNDDS survey, Branded) CSV releases."""

from __future__ import annotations

import math
import zipfile
from array import array
from pathlib import Path
from typing import Iterator

from ..download import log
from ..normalize import (
    IU_TO_GRAMS,
    clean_ingredients,
    clean_name,
    clean_text,
    format_amount,
    normalize_barcode,
    parse_number,
    serving_label,
    smart_case,
    to_grams,
    to_iso,
)
from ..records import make_record
from ..schema import USDA_BRANDED, USDA_FOUNDATION, USDA_SR_LEGACY, USDA_SURVEY
from .common import read_zip_csv, read_zip_rows

# USDA nutrient numbers (`nutrient_nbr`) -> (column, preference). Lower preference wins
# when a food reports several variants of the same nutrient.
NUTRIENT_NUMBERS: dict[str, tuple[str, int]] = {
    "208": ("energy_kcal_100g", 0),
    "958": ("energy_kcal_100g", 1),  # Atwater specific factors (Foundation foods)
    "957": ("energy_kcal_100g", 2),  # Atwater general factors
    "268": ("energy_kj_100g", 0),
    "203": ("proteins_100g", 0),
    "205": ("carbohydrates_100g", 0),
    "204": ("fat_100g", 0),
    "291": ("fiber_100g", 0),
    "269": ("sugars_100g", 0),
    "269.3": ("sugars_100g", 1),
    "539": ("added_sugars_100g", 0),
    "299": ("polyols_100g", 0),
    "606": ("saturated_fat_100g", 0),
    "605": ("trans_fat_100g", 0),
    "645": ("monounsaturated_fat_100g", 0),
    "646": ("polyunsaturated_fat_100g", 0),
    "307": ("sodium_100g", 0),
    "601": ("cholesterol_100g", 0),
    "320": ("vitamin_a_100g", 0),  # µg RAE
    "318": ("vitamin_a_100g", 1),  # IU
    "401": ("vitamin_c_100g", 0),
    "328": ("vitamin_d_100g", 0),  # µg
    "324": ("vitamin_d_100g", 1),  # IU
    "418": ("vitamin_b12_100g", 0),
    "301": ("calcium_100g", 0),
    "303": ("iron_100g", 0),
    "306": ("potassium_100g", 0),
    "304": ("magnesium_100g", 0),
    "262": ("caffeine_100g", 0),
    "529": ("taurine_100g", 0),
}

SLOTS = sorted(NUTRIENT_NUMBERS, key=lambda nbr: (NUTRIENT_NUMBERS[nbr][0], NUTRIENT_NUMBERS[nbr][1]))
SLOT_INDEX = {nbr: i for i, nbr in enumerate(SLOTS)}
NAN = float("nan")

DATA_TYPES = {
    "foundation": ("foundation_food", USDA_FOUNDATION),
    "sr_legacy": ("sr_legacy_food", USDA_SR_LEGACY),
    "survey": ("survey_fndds_food", USDA_SURVEY),
}

MARKET_COUNTRIES = {"united states": "us", "us": "us", "usa": "us", "": "us", "canada": "ca", "ca": "ca"}
SERVING_UNITS = {"g": "g", "grm": "g", "gm": "g", "gram": "g", "ml": "ml", "mlt": "ml"}
PLACEHOLDER_HOUSEHOLD = {"amount per serving", "per serving", "serving", "serving size", "none", "nan"}


def _id(value: str | None) -> int | None:
    text = (value or "").strip()
    return int(text) if text.isdigit() else None


def _nbr(value: str) -> str:
    text = (value or "").strip()
    return text[:-2] if text.endswith(".0") else text


def _nutrient_lookup(archive: zipfile.ZipFile) -> tuple[dict[str, tuple[int, float]], dict[str, tuple[int, float]]]:
    """(by nutrient id, by nutrient number) -> (slot, factor converting to output units)."""
    by_id: dict[str, tuple[int, float]] = {}
    by_nbr: dict[str, tuple[int, float]] = {}
    for row in read_zip_csv(archive, "nutrient.csv"):
        nbr = _nbr(row.get("nutrient_nbr", ""))
        if nbr not in NUTRIENT_NUMBERS:
            continue
        field = NUTRIENT_NUMBERS[nbr][0]
        unit = (row.get("unit_name") or "").strip().lower()
        if field.startswith("energy_"):
            if (field == "energy_kcal_100g") != (unit == "kcal"):
                continue
            factor = 1.0
        elif unit == "iu":
            if field not in IU_TO_GRAMS:
                continue
            factor = IU_TO_GRAMS[field]
        else:
            converted = to_grams(1.0, unit)
            if converted is None:
                continue
            factor = converted
        entry = (SLOT_INDEX[nbr], factor)
        by_id[row["id"].strip()] = entry
        by_nbr[nbr] = entry
    return by_id, by_nbr


def _load_nutrients(archive: zipfile.ZipFile, wanted: set[int] | None) -> dict[int, array]:
    by_id, by_nbr = _nutrient_lookup(archive)
    index, rows = read_zip_rows(archive, "food_nutrient.csv")
    if not index:
        return {}
    i_fdc, i_nut, i_amount = index["fdc_id"], index["nutrient_id"], index["amount"]
    lookup: dict[str, tuple[int, float]] | None = None
    sample: list[list[str]] = []
    values: dict[int, array] = {}
    empty = [NAN] * len(SLOTS)

    def apply(row: list[str]) -> None:
        entry = lookup.get(row[i_nut]) if lookup is not None else None
        if entry is None:
            return
        fdc = _id(row[i_fdc])
        if fdc is None or (wanted is not None and fdc not in wanted):
            return
        amount = parse_number(row[i_amount])
        if amount is None:
            return
        slots = values.get(fdc)
        if slots is None:
            slots = values[fdc] = array("d", empty)
        slots[entry[0]] = amount * entry[1]

    for row in rows:
        if lookup is None:
            sample.append(row)
            if len(sample) < 2000:
                continue
            lookup = _pick_lookup(sample, i_nut, by_id, by_nbr)
            for queued in sample:
                apply(queued)
            sample = []
            continue
        apply(row)
    if lookup is None:
        lookup = _pick_lookup(sample, i_nut, by_id, by_nbr)
        for queued in sample:
            apply(queued)
    return values


def _pick_lookup(sample, i_nut, by_id, by_nbr):
    """Survey (FNDDS) releases key `food_nutrient` by nutrient number, the others by id."""
    id_hits = sum(1 for row in sample if row[i_nut] in by_id)
    nbr_hits = sum(1 for row in sample if _nbr(row[i_nut]) in by_nbr)
    if nbr_hits > id_hits:
        return by_nbr
    return by_id


def _nutrient_fields(slots: array | None) -> dict:
    fields: dict = {}
    if slots is None:
        return fields
    for i, nbr in enumerate(SLOTS):
        value = slots[i]
        if math.isnan(value):
            continue
        field = NUTRIENT_NUMBERS[nbr][0]
        if field not in fields:
            fields[field] = value
    return fields


def _portions(archive: zipfile.ZipFile, wanted: set[int]) -> dict[int, tuple[str | None, float]]:
    units = {row["id"]: (row.get("name") or "").strip() for row in read_zip_csv(archive, "measure_unit.csv")}
    best: dict[int, tuple[tuple, str | None, float]] = {}
    for row in read_zip_csv(archive, "food_portion.csv"):
        fdc = _id(row.get("fdc_id"))
        if fdc not in wanted:
            continue
        grams = parse_number(row.get("gram_weight"))
        if not grams or grams <= 0:
            continue
        description = clean_text(row.get("portion_description"))
        if description and description.lower().startswith("quantity not specified"):
            continue
        if not description:
            parts = []
            amount = parse_number(row.get("amount"))
            if amount:
                parts.append(format_amount(amount))
            unit = units.get(row.get("measure_unit_id", ""), "")
            if unit and unit.lower() not in ("undetermined", "unknown"):
                parts.append(unit)
            modifier = clean_text(row.get("modifier"))
            if modifier and not modifier.isdigit():
                parts.append(modifier)
            description = " ".join(parts) or None
        seq = parse_number(row.get("seq_num"))
        rank = (seq if seq is not None else 1e9, _id(row.get("id")) or 0)
        if fdc not in best or rank < best[fdc][0]:
            best[fdc] = (rank, description, grams)
    return {fdc: (desc, grams) for fdc, (_, desc, grams) in best.items()}


def _categories(archive: zipfile.ZipFile) -> dict[str, str]:
    categories = {
        row["id"]: row.get("description", "")
        for row in read_zip_csv(archive, "food_category.csv")
    }
    for row in read_zip_csv(archive, "wweia_food_category.csv"):
        categories[row["wweia_food_category"]] = row.get("wweia_food_category_description", "")
    return categories


def iter_generic(path: Path, dataset: str, limit: int | None = None) -> Iterator[dict]:
    """Foundation, SR Legacy and FNDDS foods: generic foods without barcodes."""
    data_type, source = DATA_TYPES[dataset]
    with zipfile.ZipFile(path) as archive:
        foods = [
            row for row in read_zip_csv(archive, "food.csv")
            if row.get("data_type") == data_type and _id(row.get("fdc_id")) is not None
        ]
        if limit:
            foods = foods[:limit]
        wanted = {_id(row["fdc_id"]) for row in foods}
        log(f"[usda:{dataset}] {len(foods):,} foods")
        nutrients = _load_nutrients(archive, wanted)
        portions = _portions(archive, wanted)
        categories = _categories(archive)

    for row in foods:
        fdc = _id(row["fdc_id"])
        fields = _nutrient_fields(nutrients.get(fdc))
        fields["product_name"] = clean_name(row.get("description"))
        fields["categories"] = clean_text(categories.get(row.get("food_category_id", "")))
        portion = portions.get(fdc)
        if portion:
            fields["serving_size"] = serving_label(portion[0], portion[1])
            fields["serving_quantity"] = portion[1]
        yield make_record(
            source,
            str(fdc),
            fields,
            code=str(fdc),
            match_by_name=True,
            countries=("us",),
            updated=to_iso(row.get("publication_date")),
        )


def iter_branded(path: Path, countries: set[str], limit: int | None = None) -> Iterator[dict]:
    """Branded foods: one record per GTIN, keeping the newest label submission."""
    with zipfile.ZipFile(path) as archive:
        index, rows = read_zip_rows(archive, "branded_food.csv")
        col = {name: index.get(name) for name in (
            "fdc_id", "brand_owner", "brand_name", "subbrand_name", "gtin_upc", "ingredients",
            "serving_size", "serving_size_unit", "household_serving_fulltext", "branded_food_category",
            "package_weight", "modified_date", "available_date", "market_country", "discontinued_date",
        )}

        def get(row: list[str], name: str) -> str:
            i = col[name]
            return row[i] if i is not None and i < len(row) else ""

        chosen: dict[str, tuple[tuple, tuple]] = {}
        seen = 0
        for row in rows:
            country = MARKET_COUNTRIES.get(get(row, "market_country").strip().lower())
            if country is None or country not in countries:
                continue
            fdc = _id(get(row, "fdc_id"))
            if fdc is None:
                continue
            seen += 1
            gtin = normalize_barcode(get(row, "gtin_upc"))
            key = gtin or f"fdc:{fdc}"
            rank = (
                0 if get(row, "discontinued_date") else 1,
                get(row, "available_date"),
                get(row, "modified_date"),
                fdc,
            )
            previous = chosen.get(key)
            if previous is None or rank > previous[0]:
                chosen[key] = (rank, (
                    fdc, country, get(row, "gtin_upc"), get(row, "brand_name"), get(row, "subbrand_name"),
                    get(row, "brand_owner"), get(row, "ingredients"), get(row, "serving_size"),
                    get(row, "serving_size_unit"), get(row, "household_serving_fulltext"),
                    get(row, "branded_food_category"), get(row, "package_weight"),
                    get(row, "modified_date") or get(row, "available_date"),
                ))
            if limit and len(chosen) >= limit:
                break
        log(f"[usda:branded] {seen:,} label rows -> {len(chosen):,} unique products")

        wanted = {entry[1][0] for entry in chosen.values()}
        descriptions: dict[int, str] = {}
        index, rows = read_zip_rows(archive, "food.csv")
        i_fdc, i_desc = index["fdc_id"], index["description"]
        for row in rows:
            fdc = _id(row[i_fdc])
            if fdc in wanted:
                descriptions[fdc] = row[i_desc]
        log("[usda:branded] reading nutrients (large file, takes a few minutes)")
        nutrients = _load_nutrients(archive, wanted)

    for _, data in chosen.values():
        (fdc, country, gtin_raw, brand_name, subbrand, owner, ingredients, size, size_unit,
         household, category, package_weight, updated) = data
        fields = _nutrient_fields(nutrients.pop(fdc, None))
        fields["product_name"] = clean_name(descriptions.get(fdc))
        brand = clean_text(brand_name) or clean_text(subbrand)
        fields["brands"] = smart_case(brand) if brand else None
        fields["categories"] = clean_text(category)
        fields["quantity"] = clean_text(package_weight)
        fields["ingredients_text"] = clean_ingredients(ingredients)

        amount = parse_number(size)
        unit = SERVING_UNITS.get((size_unit or "").strip().lower())
        household_text = clean_text(household)
        if household_text and household_text.lower() in PLACEHOLDER_HOUSEHOLD:
            household_text = None
        if household_text:
            household_text = smart_case(household_text)
        if amount and unit:
            fields["serving_quantity"] = amount
            fields["serving_size"] = serving_label(household_text, amount, unit)
        elif household_text:
            fields["serving_size"] = household_text

        yield make_record(
            USDA_BRANDED,
            str(fdc),
            fields,
            code=str(fdc),
            barcode=gtin_raw,
            countries=(country,),
            updated=to_iso(updated),
            brands_fallback=smart_case(clean_text(owner)) if clean_text(owner) else None,
        )
