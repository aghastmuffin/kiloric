"""Tiny stand-ins for the upstream releases, written in their real file layouts."""

from __future__ import annotations

import csv
import gzip
import io
import zipfile
from pathlib import Path

USDA_NUTRIENTS = [
    # id, name, unit, nutrient_nbr
    ("1003", "Protein", "G", "203"),
    ("1004", "Total lipid (fat)", "G", "204"),
    ("1005", "Carbohydrate, by difference", "G", "205"),
    ("1008", "Energy", "KCAL", "208"),
    ("1062", "Energy", "kJ", "268"),
    ("2048", "Energy (Atwater Specific Factors)", "KCAL", "958"),
    ("1079", "Fiber, total dietary", "G", "291"),
    ("2000", "Total Sugars", "G", "269"),
    ("1093", "Sodium, Na", "MG", "307"),
    ("1106", "Vitamin A, RAE", "UG", "320"),
    ("1104", "Vitamin A, IU", "IU", "318"),
    ("1110", "Vitamin D (D2 + D3), International Units", "IU", "324"),
    ("1087", "Calcium, Ca", "MG", "301"),
]


def _csv_text(header: list[str], rows: list[list]) -> str:
    buf = io.StringIO()
    writer = csv.writer(buf, quoting=csv.QUOTE_ALL, lineterminator="\n")
    writer.writerow(header)
    writer.writerows(rows)
    return buf.getvalue()


def _nutrient_csv() -> str:
    return _csv_text(
        ["id", "name", "unit_name", "nutrient_nbr", "rank"],
        [[i, n, u, nbr, "1"] for i, n, u, nbr in USDA_NUTRIENTS],
    )


def write_usda_generic(path: Path, folder: str, data_type: str, foods, nutrients, portions, by_number=False) -> Path:
    """foods: (fdc_id, description, category_id); nutrients: (fdc_id, nutrient_id_or_nbr, amount)."""
    with zipfile.ZipFile(path, "w") as z:
        z.writestr(f"{folder}/food.csv", _csv_text(
            ["fdc_id", "data_type", "description", "food_category_id", "publication_date"],
            [[f, data_type, d, c, "2024-04-18"] for f, d, c in foods] + [["999999", "sample_food", "Ignored", "", ""]],
        ))
        z.writestr(f"{folder}/nutrient.csv", _nutrient_csv())
        z.writestr(f"{folder}/food_nutrient.csv", _csv_text(
            ["id", "fdc_id", "nutrient_id", "amount", "data_points", "derivation_id"],
            [[str(i), f, n, a, "", ""] for i, (f, n, a) in enumerate(nutrients)],
        ))
        z.writestr(f"{folder}/food_portion.csv", _csv_text(
            ["id", "fdc_id", "seq_num", "amount", "measure_unit_id", "portion_description", "modifier", "gram_weight"],
            [[str(i), *p] for i, p in enumerate(portions)] + [["99", "", "", "", "", "", "", ""]],
        ))
        z.writestr(f"{folder}/measure_unit.csv", _csv_text(["id", "name"], [["1000", "cup"], ["9999", "undetermined"]]))
        z.writestr(f"{folder}/food_category.csv", _csv_text(
            ["id", "code", "description"], [["9", "0900", "Fruits and Fruit Juices"]]
        ))
        z.writestr(f"{folder}/wweia_food_category.csv", _csv_text(
            ["wweia_food_category", "wweia_food_category_description"], [["1004", "Milk, reduced fat"]]
        ))
    return path


def write_usda_branded(path: Path, products, nutrients) -> Path:
    header = [
        "fdc_id", "brand_owner", "brand_name", "subbrand_name", "gtin_upc", "ingredients",
        "not_a_significant_source_of", "serving_size", "serving_size_unit", "household_serving_fulltext",
        "branded_food_category", "data_source", "package_weight", "modified_date", "available_date",
        "market_country", "discontinued_date", "preparation_state_code", "trade_channel",
        "short_description", "material_code",
    ]
    with zipfile.ZipFile(path, "w") as z:
        z.writestr("FoodData_Central_branded_food_csv_test/branded_food.csv", _csv_text(header, [
            [p.get(h, "") for h in header] for p in products
        ]))
        z.writestr("FoodData_Central_branded_food_csv_test/food.csv", _csv_text(
            ["fdc_id", "data_type", "description", "food_category_id", "publication_date", "market_country"],
            [[p["fdc_id"], "branded_food", p["description"], "", "2026-04-30", "United States"] for p in products],
        ))
        z.writestr("FoodData_Central_branded_food_csv_test/nutrient.csv", _nutrient_csv())
        z.writestr("FoodData_Central_branded_food_csv_test/food_nutrient.csv", _csv_text(
            ["id", "fdc_id", "nutrient_id", "amount", "data_points", "derivation_id"],
            [[str(i), f, n, a, "", ""] for i, (f, n, a) in enumerate(nutrients)],
        ))
    return path


def write_cnf(path: Path, foods, amounts, measures, factors) -> Path:
    def latin(text: str) -> bytes:
        return text.encode("latin-1")

    with zipfile.ZipFile(path, "w") as z:
        z.writestr("FOOD NAME.csv", latin(_csv_text(
            ["FoodID", "FoodCode", "FoodGroupID", "FoodSourceID", "FoodDescription", "FoodDescriptionF",
             "FoodDateOfEntry", "FoodDateOfPublication", "CountryCode", "ScientificName"],
            [[f, f, g, "20", d, d, "1981-01-01", "", "", ""] for f, g, d in foods],
        )))
        z.writestr("FOOD GROUP.csv", latin(_csv_text(
            ["FoodGroupID", "FoodGroupCode", "FoodGroupName", "FoodGroupNameF"],
            [["9", "9", "Fruits and fruit juices", "Fruits et jus de fruits\n"]],
        )))
        z.writestr("NUTRIENT NAME.csv", latin(_csv_text(
            ["NutrientID", "NutrientCode", "NutrientSymbol", "NutrientUnit", "NutrientName", "NutrientNameF",
             "Tagname", "NutrientDecimals"],
            [
                ["203", "203", "PROT", "g", "PROTEIN", "PROTÉINES", "PROCNT", "2"],
                ["204", "204", "FAT", "g", "FAT", "LIPIDES", "FAT", "2"],
                ["205", "205", "CARB", "g", "CARBOHYDRATE", "GLUCIDES", "CHOCDF", "2"],
                ["208", "208", "KCAL", "kCal", "ENERGY (KILOCALORIES)", "ÉNERGIE", "ENERC_KCAL", "0"],
                ["307", "307", "NA", "mg", "SODIUM", "SODIUM", "NA", "0"],
                ["306", "306", "K", "mg", "POTASSIUM", "POTASSIUM", "K", "0"],
                ["814", "320", "RAE", "µg", "RETINOL ACTIVITY EQUIVALENTS", "ÉQUIVALENTS", "VITA_RAE", "0"],
            ],
        )))
        z.writestr("NUTRIENT AMOUNT.csv", latin(_csv_text(
            ["FoodID", "NutrientID", "NutrientValue", "StandardError", "NumberofObservations", "NutrientSourceID",
             "NutrientDateOfEntry"],
            [[f, n, v, "0", "0", "1", "2010-01-01"] for f, n, v in amounts],
        )))
        z.writestr("MEASURE NAME.csv", latin(_csv_text(
            ["MeasureID", "MeasureDescription", "MeasureDescriptionF", "", ""],
            [[m, d, d, "", ""] for m, d in measures],
        )))
        z.writestr("CONVERSION FACTOR.csv", latin(_csv_text(
            ["FoodID", "MeasureID", "ConversionFactorValue", "ConvFactorDateOfEntry"],
            [[f, m, v, "1997-05-01"] for f, m, v in factors],
        )))
    return path


OFF_HEADER = [
    "code", "url", "product_name", "generic_name", "quantity", "brands_tags", "brands_en", "categories_en",
    "countries_tags", "ingredients_text", "allergens_tags", "traces_tags", "serving_size", "serving_quantity",
    "additives_n", "nutriscore_grade", "nova_group", "brand_owner", "environmental_score_grade", "image_url",
    "last_modified_t", "energy-kj_100g", "energy-kcal_100g", "energy_100g", "fat_100g", "saturated-fat_100g",
    "carbohydrates_100g", "sugars_100g", "fiber_100g", "proteins_100g", "salt_100g", "sodium_100g",
    "vitamin-a_100g", "calcium_100g",
]


def off_row(**values) -> str:
    code = values.get("code", "")
    values.setdefault("url", f"http://world-en.openfoodfacts.org/product/{code}/x")
    return "\t".join(str(values.get(h, "")) for h in OFF_HEADER)


def write_off(path: Path, rows: list[str]) -> Path:
    with gzip.open(path, "wt", encoding="utf-8", newline="\n") as out:
        out.write("\t".join(OFF_HEADER) + "\n")
        for row in rows:
            out.write(row + "\n")
    return path
