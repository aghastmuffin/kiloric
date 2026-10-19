import unittest

from fooddb.normalize import (
    barcode_spellings,
    clean_column_value,
    drop_inconsistent_components,
    clean_ingredients,
    clean_name,
    clean_tags,
    clean_text,
    deslug,
    fill_energy_from_macros,
    fix_energy,
    name_key,
    normalize_barcode,
    serving_label,
    to_grams,
    to_iso,
)


class BarcodeTests(unittest.TestCase):
    def test_upc_spellings_collapse_to_off_form(self):
        for raw in ("016000275287", "0016000275287", "00016000275287", " 0 16000 27528 7 "):
            self.assertEqual(normalize_barcode(raw), "0016000275287", raw)

    def test_ean8_kept_short(self):
        self.assertEqual(normalize_barcode("00171424"), "00171424")
        self.assertEqual(normalize_barcode("4"), "00000004")

    def test_gtin14_with_indicator_digit(self):
        self.assertEqual(normalize_barcode("10016000275284"), "10016000275284")

    def test_scanner_spellings(self):
        self.assertEqual(barcode_spellings("0016000275287"), ["00016000275287", "016000275287"])
        self.assertEqual(barcode_spellings("3017620422003"), ["03017620422003"])
        self.assertEqual(barcode_spellings("00171424"), [])

    def test_invalid(self):
        for raw in (None, "", "abc123", "0000", "123456789012345"):
            self.assertIsNone(normalize_barcode(raw), raw)


class TextTests(unittest.TestCase):
    def test_clean_text_drops_sentinels_and_controls(self):
        self.assertIsNone(clean_text("Unknown"))
        self.assertIsNone(clean_text("  "))
        self.assertEqual(clean_text("a\tb\n  c &amp; d"), "a b c & d")

    def test_all_caps_names_become_title_case(self):
        self.assertEqual(clean_name("CHEERIOS, HONEY NUT"), "Cheerios, Honey Nut")
        self.assertEqual(clean_name("KELLOGG'S FROSTED FLAKES WITH MARSHMALLOWS"), "Kellogg's Frosted Flakes with Marshmallows")
        self.assertEqual(clean_name("BBQ SAUCE"), "BBQ Sauce")

    def test_mixed_case_names_untouched_but_capitalised(self):
        self.assertEqual(clean_name("WESSON Vegetable Oil"), "WESSON Vegetable Oil")
        self.assertEqual(clean_name("greek yogurt"), "Greek yogurt")

    def test_deslug(self):
        self.assertEqual(deslug("xx:lunds-byerlys"), "Lunds Byerlys")
        self.assertEqual(deslug("kellogg-s"), "Kellogg's")

    def test_tags(self):
        self.assertEqual(clean_tags("en:Gluten, en:milk,en:gluten,soy"), "en:gluten,en:milk,en:soy")

    def test_ingredients(self):
        self.assertEqual(clean_ingredients("INGREDIENTS: BEEF STOCK, SALT."), "Beef stock, salt.")
        self.assertEqual(clean_ingredients("Water, Sugar"), "Water, Sugar")


class NumberTests(unittest.TestCase):
    def test_bounds(self):
        self.assertIsNone(clean_column_value("proteins_100g", 140))
        self.assertIsNone(clean_column_value("proteins_100g", -1))
        self.assertEqual(clean_column_value("proteins_100g", "12,5"), 12.5)
        self.assertIsNone(clean_column_value("nova_group", 7))
        self.assertEqual(clean_column_value("nova_group", "4"), 4)
        self.assertIsNone(clean_column_value("serving_quantity", 0))

    def test_text_truncated_at_word_boundary(self):
        value = clean_column_value("serving_size", "word " * 60)
        self.assertLessEqual(len(value), 128)
        self.assertFalse(value.endswith(" "))

    def test_units(self):
        self.assertEqual(to_grams(500, "mg"), 0.5)
        self.assertAlmostEqual(to_grams(3, "µg"), 3e-6)
        self.assertIsNone(to_grams(10, "IU"))


class EnergyTests(unittest.TestCase):
    def test_fills_missing_half(self):
        r = {"energy_kcal_100g": 100}
        fix_energy(r)
        self.assertAlmostEqual(r["energy_kj_100g"], 418.4)
        r = {"energy_kj_100g": 418.4}
        fix_energy(r)
        self.assertAlmostEqual(r["energy_kcal_100g"], 100)

    def test_kilojoules_in_kcal_column(self):
        r = {"energy_kcal_100g": 1500}
        fix_energy(r)
        self.assertAlmostEqual(r["energy_kcal_100g"], 1500 / 4.184)
        self.assertEqual(r["energy_kj_100g"], 1500)

    def test_kilojoules_detected_from_macros(self):
        r = {"energy_kcal_100g": 418, "proteins_100g": 5, "carbohydrates_100g": 20, "fat_100g": 1}
        fix_energy(r)
        self.assertAlmostEqual(r["energy_kcal_100g"], 418 / 4.184)

    def test_components_cannot_exceed_parent(self):
        r = {"fat_100g": 2, "saturated_fat_100g": 5, "trans_fat_100g": 2.4,
             "carbohydrates_100g": 10, "sugars_100g": 30, "added_sugars_100g": 3}
        drop_inconsistent_components(r)
        self.assertIsNone(r["saturated_fat_100g"])
        self.assertEqual(r["trans_fat_100g"], 2.4)
        self.assertIsNone(r["sugars_100g"])
        self.assertEqual(r["added_sugars_100g"], 3)

    def test_macros_fallback(self):
        r = {"proteins_100g": 10, "carbohydrates_100g": 20, "fat_100g": 5, "energy_kcal_100g": None}
        fill_energy_from_macros(r)
        self.assertEqual(r["energy_kcal_100g"], 165)


class MatchingTests(unittest.TestCase):
    def test_name_key_ignores_order_plural_case_accents(self):
        self.assertEqual(name_key("Bananas, raw"), name_key("banana raw"))
        self.assertEqual(name_key("Soufflé, cheese"), name_key("Cheese souffle"))
        self.assertNotEqual(name_key("Milk, whole"), name_key("Milk, skim"))

    def test_serving_label(self):
        self.assertEqual(serving_label("1 cup", 240), "1 cup (240 g)")
        self.assertEqual(serving_label("1 fish (500 g)", 500), "1 fish (500 g)")
        self.assertEqual(serving_label("125ml", 7.9), "125ml (7.9 g)")
        self.assertEqual(serving_label("8 fl oz (240 ml)", 240, "ml"), "8 fl oz (240 ml)")
        self.assertEqual(serving_label(None, 30), "30 g")

    def test_iso(self):
        self.assertEqual(to_iso("2024-04-18"), "2024-04-18T00:00:00Z")
        self.assertEqual(to_iso("1616845836"), "2021-03-27T11:50:36Z")
        self.assertEqual(to_iso("2026-06-13T17:06:54Z"), "2026-06-13T17:06:54Z")
        self.assertIsNone(to_iso("not a date"))


if __name__ == "__main__":
    unittest.main()
