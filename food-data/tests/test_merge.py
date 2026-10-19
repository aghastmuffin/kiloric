import unittest

from fooddb.merge import merge_group
from fooddb.records import make_record
from fooddb.schema import CNF, OFF, USDA_BRANDED, USDA_SR_LEGACY


def off_cheerios(**overrides):
    fields = {
        "product_name": "Cheerios",
        "brands": "Cheerios",
        "categories": "Breakfast cereals",
        "image_url": "https://images.openfoodfacts.org/x.jpg",
        "allergens": "en:gluten",
        "nutriscore_grade": "c",
        "energy_kcal_100g": 350,
        "proteins_100g": 12,
        "fat_100g": 6,
        "potassium_100g": 0.6,
    }
    fields.update(overrides)
    return make_record(OFF, "16000275287", fields, code="16000275287", barcode="16000275287",
                       countries=("us", "ca"), updated="2026-01-01T00:00:00Z", brands_fallback="General Mills")


def usda_cheerios():
    fields = {
        "product_name": "Cheerios Toasted Whole Grain Oat Cereal",
        "brands": "CHEERIOS",
        "energy_kcal_100g": 359,
        "proteins_100g": 12.8,
        "carbohydrates_100g": 74.4,
        "fat_100g": 6.4,
        "sodium_100g": 0.487,
        "serving_size": "1 1/2 cup (39 g)",
        "serving_quantity": 39,
        "ingredients_text": "Whole grain oats, corn starch",
    }
    return make_record(USDA_BRANDED, "2042000", fields, code="2042000", barcode="00016000275287",
                       countries=("us",), updated="2025-05-01T00:00:00Z")


class BarcodeMergeTests(unittest.TestCase):
    def test_same_product_condenses_and_shares_fields(self):
        a, b = off_cheerios(), usda_cheerios()
        self.assertEqual(a["_merge_key"], b["_merge_key"])
        row, aliases = merge_group(a["_merge_key"], [a, b])

        self.assertEqual(row["code"], "0016000275287")
        # Identity from Open Food Facts...
        self.assertEqual(row["product_name"], "Cheerios")
        self.assertEqual(row["image_url"], "https://images.openfoodfacts.org/x.jpg")
        self.assertEqual(row["nutriscore_grade"], "c")
        # ...nutrition from the USDA label, with OFF filling what USDA lacks.
        self.assertEqual(row["energy_kcal_100g"], 359)
        self.assertEqual(row["proteins_100g"], 12.8)
        self.assertEqual(row["carbohydrates_100g"], 74.4)
        self.assertEqual(row["potassium_100g"], 0.6)
        self.assertEqual(row["serving_quantity"], 39)
        self.assertEqual(row["ingredients_text"], "Whole grain oats, corn starch")
        self.assertEqual(row["countries"], "United States,Canada")
        self.assertEqual(row["data_sources"], "USDA FoodData Central (Branded), Open Food Facts")
        self.assertEqual(row["source_ids"], "off:16000275287;usda:2042000")
        self.assertEqual(row["updated_timestamp"], "2026-01-01T00:00:00Z")
        self.assertGreaterEqual(row["trust_and_completion_score"], 10000)
        self.assertIn("2042000", aliases)
        self.assertIn("16000275287", aliases)
        self.assertIn("00016000275287", aliases)

    def test_usda_brand_text_wins_over_off_slug(self):
        a = off_cheerios(brands="Cheerios")
        b = usda_cheerios()
        row, _ = merge_group(a["_merge_key"], [a, b])
        self.assertEqual(row["brands"], "CHEERIOS")

    def test_brand_falls_back_to_owner(self):
        a = off_cheerios(brands=None)
        row, _ = merge_group(a["_merge_key"], [a])
        self.assertEqual(row["brands"], "General Mills")

    def test_duplicates_within_one_source_prefer_most_complete(self):
        sparse = off_cheerios(categories=None, image_url=None, proteins_100g=None)
        full = off_cheerios(product_name="Cheerios Original")
        row, _ = merge_group(full["_merge_key"], [sparse, full])
        self.assertEqual(row["product_name"], "Cheerios Original")

    def test_incomplete_product_still_exported(self):
        r = make_record(OFF, "0000000000017", {}, code="0000000000017", barcode="0000000000017", countries=("us",))
        row, _ = merge_group(r["_merge_key"], [r])
        self.assertEqual(row["product_name"], "Unnamed product (barcode 0000000000017)")
        self.assertIsNone(row["energy_kcal_100g"])
        self.assertEqual(row["trust_and_completion_score"], 0)

    def test_energy_from_macros_when_no_source_has_it(self):
        r = make_record(OFF, "1", {"product_name": "x", "proteins_100g": 10, "carbohydrates_100g": 10, "fat_100g": 10},
                        code="00000001", barcode="00000001", countries=("us",))
        row, _ = merge_group(r["_merge_key"], [r])
        self.assertEqual(row["energy_kcal_100g"], 170)


class GenericMergeTests(unittest.TestCase):
    def test_usda_and_cnf_generic_food_condense(self):
        usda = make_record(USDA_SR_LEGACY, "173944", {
            "product_name": "Bananas, raw", "energy_kcal_100g": 89, "proteins_100g": 1.09,
        }, code="173944", match_by_name=True, countries=("us",))
        cnf = make_record(CNF, "1543", {
            "product_name": "Banana, raw", "energy_kcal_100g": 90, "potassium_100g": 0.358,
            "serving_size": "1 medium (118 g)", "serving_quantity": 118,
        }, code="cnf-1543", match_by_name=True, countries=("ca",))
        self.assertEqual(usda["_merge_key"], cnf["_merge_key"])
        row, aliases = merge_group(usda["_merge_key"], [cnf, usda])
        self.assertEqual(row["code"], "173944")
        self.assertEqual(row["product_name"], "Bananas, raw")
        self.assertEqual(row["energy_kcal_100g"], 89)
        self.assertEqual(row["potassium_100g"], 0.358)
        self.assertEqual(row["serving_quantity"], 118)
        self.assertEqual(row["countries"], "United States,Canada")
        self.assertEqual(aliases, ["cnf-1543"])

    def test_products_with_barcodes_never_name_match(self):
        r = make_record(OFF, "1", {"product_name": "Bananas, raw"}, code="00000001", barcode="00000001")
        self.assertTrue(r["_merge_key"].startswith("gtin:"))


if __name__ == "__main__":
    unittest.main()
