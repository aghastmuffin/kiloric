import gzip
import sqlite3
import tempfile
import unittest
from pathlib import Path

from fooddb.__main__ import main
from fooddb.export import _literal, write_sql_dump
from fooddb.sources.off import iter_off

from . import fixtures


def build_fixture_inputs(tmp: Path) -> dict[str, Path]:
    sr = fixtures.write_usda_generic(
        tmp / "sr.zip", "FoodData_Central_sr_legacy_food_csv_2018-04", "sr_legacy_food",
        foods=[("173944", "Bananas, raw", "9")],
        nutrients=[("173944", "1008", "89"), ("173944", "1003", "1.09"), ("173944", "1005", "22.84"),
                   ("173944", "1004", "0.33"), ("173944", "1093", "1"), ("173944", "1106", "3"),
                   ("173944", "1104", "64")],
        portions=[("173944", "1", "1", "9999", "", "medium (7\" to 7-7/8\" long)", "118")],
    )
    foundation = fixtures.write_usda_generic(
        tmp / "foundation.zip", "FoodData_Central_foundation_food_csv_2026-04-30", "foundation_food",
        foods=[("2709224", "Hummus, commercial", "16")],
        nutrients=[("2709224", "2048", "229"), ("2709224", "1003", "7.35"), ("2709224", "1087", "38")],
        portions=[("2709224", "", "2.0", "1000", "", "", "35.8")],
    )
    survey = fixtures.write_usda_generic(
        tmp / "survey.zip", "FoodData_Central_survey_food_csv_2024-10-31", "survey_fndds_food",
        foods=[("2705384", "Milk, NFS", "1004")],
        # FNDDS releases key food_nutrient by nutrient *number*, not id.
        nutrients=[("2705384", "208", "51"), ("2705384", "203", "3.35"), ("2705384", "301", "125")],
        portions=[("2705384", "1", "", "9999", "Quantity not specified", "90000", "0"),
                  ("2705384", "2", "", "9999", "1 cup", "10205", "244")],
    )
    branded = fixtures.write_usda_branded(
        tmp / "branded.zip",
        products=[
            {"fdc_id": "1000", "brand_owner": "General Mills Sales Inc.", "brand_name": "CHEERIOS",
             "gtin_upc": "00016000275287", "ingredients": "INGREDIENTS: WHOLE GRAIN OATS, CORN STARCH.",
             "serving_size": "39", "serving_size_unit": "GRM", "household_serving_fulltext": "1 1/2 cup",
             "branded_food_category": "Cereal", "package_weight": "18 oz/510 g", "modified_date": "2020-01-01",
             "available_date": "2020-01-01", "market_country": "United States", "description": "CHEERIOS OLD"},
            {"fdc_id": "2000", "brand_owner": "General Mills Sales Inc.", "brand_name": "CHEERIOS",
             "gtin_upc": "00016000275287", "ingredients": "INGREDIENTS: WHOLE GRAIN OATS, CORN STARCH, SALT.",
             "serving_size": "39", "serving_size_unit": "GRM", "household_serving_fulltext": "1 1/2 cup",
             "branded_food_category": "Cereal", "package_weight": "18 oz/510 g", "modified_date": "2025-01-01",
             "available_date": "2025-01-01", "market_country": "United States", "description": "CHEERIOS"},
            {"fdc_id": "3000", "brand_owner": "Kiwi Co", "brand_name": "KIWI", "gtin_upc": "09400000000001",
             "market_country": "New Zealand", "description": "KIWI SNACK"},
        ],
        nutrients=[("2000", "1008", "359"), ("2000", "1003", "12.8"), ("2000", "1005", "74.4"),
                   ("2000", "1004", "6.4"), ("2000", "1093", "487"), ("2000", "1110", "400"),
                   ("1000", "1008", "999")],
    )
    cnf = fixtures.write_cnf(
        tmp / "cnf.zip",
        foods=[("1543", "9", "Banana, raw"), ("5000", "9", "Saskatoon berries, raw")],
        amounts=[("1543", "208", "90"), ("1543", "306", "358"), ("1543", "814", "3"),
                 ("5000", "208", "85"), ("5000", "203", "1.3"), ("5000", "205", "18.5"), ("5000", "204", "0.5")],
        measures=[("1", "100g"), ("2", "1 medium"), ("3", "125ml")],
        factors=[("1543", "1", "1"), ("1543", "2", "1.18"), ("5000", "3", "0.78")],
    )
    off = fixtures.write_off(tmp / "off.csv.gz", [
        fixtures.off_row(code="16000275287", product_name="Cheerios", brands_tags="cheerios,general-mills",
                         countries_tags="en:canada,en:united-states", categories_en="Breakfast cereals",
                         allergens_tags="en:gluten", nutriscore_grade="c", environmental_score_grade="unknown",
                         image_url="https://images.openfoodfacts.org/images/products/001/600/027/5287/front_en.8.400.jpg",
                         **{"energy-kcal_100g": "358.974358974359", "fat_100g": "6.41", "fiber_100g": "10.26",
                            "salt_100g": "1.2", "calcium_100g": "0.333", "last_modified_t": "1735689600"}),
        # Raw newline inside the ingredients field: one record split over two lines.
        fixtures.off_row(code="0628915000017", product_name="Maple syrup", brands_tags="xx:maple-farm",
                         countries_tags="en:canada", ingredients_text="Pure maple\nsyrup",
                         **{"energy-kj_100g": "1088", "carbohydrates_100g": "67"}),
        # Corrupt fragment missing its barcode/url columns.
        "\t" * 5 + "en:united-states\tjunk",
        fixtures.off_row(code="3017620422003", product_name="Nutella", countries_tags="en:france,en:italy"),
        fixtures.off_row(code="0000000000017", countries_tags="en:united-states"),
    ])
    return {"sr": sr, "foundation": foundation, "survey": survey, "branded": branded, "cnf": cnf, "off": off}


class OffParserTests(unittest.TestCase):
    def test_country_filter_and_multiline_rows(self):
        with tempfile.TemporaryDirectory() as tmp:
            inputs = build_fixture_inputs(Path(tmp))
            records = list(iter_off(inputs["off"], {"us", "ca"}))
            codes = [r["_code"] for r in records]
            self.assertEqual(codes, ["0016000275287", "0628915000017", "0000000000017"])
            maple = records[1]
            self.assertEqual(maple["ingredients_text"], "Pure maple syrup")
            self.assertEqual(maple["brands"], "Maple Farm")
            self.assertEqual(maple["_countries"], ["ca"])
            self.assertAlmostEqual(maple["energy_kcal_100g"], 260.0)
            cheerios = records[0]
            self.assertAlmostEqual(cheerios["sodium_100g"], 0.48)
            self.assertIsNone(cheerios["ecoscore_grade"])

            ca_only = [r["_code"] for r in iter_off(inputs["off"], {"ca"})]
            self.assertEqual(ca_only, ["0016000275287", "0628915000017"])


class BuildTests(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        inputs = build_fixture_inputs(self.tmp)
        self.db_path = self.tmp / "out" / "foods.sqlite"
        self.sql_path = self.tmp / "out" / "foods.sql"
        main([
            "build", "--out", str(self.db_path), "--sql", str(self.sql_path), "--cache-dir", str(self.tmp / "cache"),
            "--usda-foundation-file", str(inputs["foundation"]), "--usda-sr-legacy-file", str(inputs["sr"]),
            "--usda-survey-file", str(inputs["survey"]), "--usda-branded-file", str(inputs["branded"]),
            "--cnf-file", str(inputs["cnf"]), "--off-file", str(inputs["off"]),
        ])
        self.db = sqlite3.connect(self.db_path)
        self.db.row_factory = sqlite3.Row

    def tearDown(self):
        self.db.close()
        self._tmp.cleanup()

    def food(self, code):
        row = self.db.execute("SELECT * FROM foods WHERE code = ?", (code,)).fetchone()
        self.assertIsNotNone(row, code)
        return dict(row)

    def test_row_count(self):
        codes = sorted(r[0] for r in self.db.execute("SELECT code FROM foods"))
        # Banana condenses (USDA + CNF); Cheerios condenses (USDA branded x2 + OFF);
        # NZ-only and France-only products are excluded.
        self.assertEqual(codes, sorted([
            "173944", "2709224", "2705384", "cnf-5000", "0016000275287", "0628915000017", "0000000000017",
        ]))

    def test_branded_and_off_condense(self):
        food = self.food("0016000275287")
        self.assertEqual(food["product_name"], "Cheerios")
        self.assertEqual(food["brands"], "Cheerios")
        self.assertEqual(food["energy_kcal_100g"], 359.0)
        self.assertEqual(food["proteins_100g"], 12.8)
        self.assertEqual(food["sodium_100g"], 0.487)
        self.assertAlmostEqual(food["vitamin_d_100g"], 1e-5)
        self.assertEqual(food["fiber_100g"], 10.26)
        self.assertEqual(food["calcium_100g"], 0.333)
        self.assertEqual(food["serving_size"], "1 1/2 cup (39 g)")
        self.assertEqual(food["serving_quantity"], 39.0)
        self.assertEqual(food["ingredients_text"], "Whole grain oats, corn starch, salt.")
        self.assertEqual(food["quantity"], "18 oz/510 g")
        self.assertEqual(food["allergens"], "en:gluten")
        self.assertEqual(food["countries"], "United States,Canada")
        self.assertEqual(food["data_sources"], "USDA FoodData Central (Branded), Open Food Facts")
        self.assertEqual(food["source_ids"], "off:16000275287;usda:2000")
        for alias in ("16000275287", "016000275287", "00016000275287", "2000"):
            code = self.db.execute("SELECT code FROM food_codes WHERE alias = ?", (alias,)).fetchone()[0]
            self.assertEqual(code, "0016000275287", alias)

    def test_generic_foods_condense_across_countries(self):
        food = self.food("173944")
        self.assertEqual(food["product_name"], "Bananas, raw")
        self.assertEqual(food["categories"], "Fruits and Fruit Juices")
        self.assertEqual(food["energy_kcal_100g"], 89.0)
        self.assertAlmostEqual(food["energy_kj_100g"], 372.4)
        self.assertEqual(food["sodium_100g"], 0.001)
        self.assertEqual(food["vitamin_a_100g"], 3e-06)
        self.assertEqual(food["potassium_100g"], 0.358)
        self.assertEqual(food["serving_size"], '1 medium (7" to 7-7/8" long) (118 g)')
        self.assertEqual(food["countries"], "United States,Canada")
        self.assertEqual(food["source_ids"], "cnf:1543;usda:173944")
        self.assertEqual(self.db.execute("SELECT code FROM food_codes WHERE alias='cnf-1543'").fetchone()[0], "173944")

    def test_dataset_specific_details(self):
        hummus = self.food("2709224")
        self.assertEqual(hummus["energy_kcal_100g"], 229.0)  # Atwater-specific energy (Foundation)
        self.assertEqual(hummus["serving_size"], "2 cup (35.8 g)")
        milk = self.food("2705384")
        self.assertEqual(milk["calcium_100g"], 0.125)  # nutrient-number keyed survey data
        self.assertEqual(milk["categories"], "Milk, reduced fat")
        self.assertEqual(milk["serving_size"], "1 cup (244 g)")
        berries = self.food("cnf-5000")
        self.assertEqual(berries["serving_size"], "125ml (78 g)")
        self.assertEqual(berries["countries"], "Canada")

    def test_incomplete_rows_are_kept(self):
        empty = self.food("0000000000017")
        self.assertEqual(empty["product_name"], "Unnamed product (barcode 0000000000017)")
        maple = self.food("0628915000017")
        self.assertEqual(maple["brands"], "Maple Farm")
        self.assertEqual(maple["trust_and_completion_score"] // 10000, 0)

    def test_build_info(self):
        info = dict(self.db.execute("SELECT key, value FROM build_info"))
        self.assertEqual(info["foods_out"], "7")
        self.assertEqual(info["records_usda_branded"], "1")
        self.assertIn("grams per 100 g", info["units"])

    def test_full_text_search(self):
        hits = [r[0] for r in self.db.execute(
            "SELECT f.code FROM foods_fts JOIN foods f ON f.rowid = foods_fts.rowid WHERE foods_fts MATCH 'banana*'"
        )]
        self.assertEqual(hits, ["173944"])

    def test_sqlite_dump_round_trips(self):
        restored = sqlite3.connect(":memory:")
        restored.executescript(self.sql_path.read_text(encoding="utf-8"))
        original = [tuple(r) for r in self.db.execute("SELECT * FROM foods ORDER BY code")]
        copied = restored.execute("SELECT * FROM foods ORDER BY code").fetchall()
        self.assertEqual(original, copied)
        self.assertEqual(
            restored.execute("SELECT count(*) FROM food_codes").fetchone()[0],
            self.db.execute("SELECT count(*) FROM food_codes").fetchone()[0],
        )

    def test_other_dialects(self):
        pg = self.tmp / "pg.sql"
        ora = self.tmp / "ora.sql"
        write_sql_dump(self.db_path, pg, "postgres")
        write_sql_dump(self.db_path, ora, "oracle")
        pg_text = pg.read_text(encoding="utf-8")
        ora_text = ora.read_text(encoding="utf-8")
        self.assertIn("product_name VARCHAR(256) NOT NULL", pg_text)
        self.assertIn("energy_kcal_100g DOUBLE PRECISION", pg_text)
        self.assertIn("SET DEFINE OFF;", ora_text)
        self.assertIn("ingredients_text CLOB", ora_text)
        self.assertIn("INSERT ALL", ora_text)
        self.assertIn("'1 medium (7\" to 7-7/8\" long) (118 g)'", ora_text)

    def test_oracle_insert_all_stays_under_column_limit(self):
        ora = self.tmp / "ora.sql"
        write_sql_dump(self.db_path, ora, "oracle", batch=500)
        blocks = ora.read_text(encoding="utf-8").split("INSERT ALL\n")[1:]
        self.assertTrue(blocks)
        for block in blocks:
            statement = block.split("SELECT 1 FROM DUAL;")[0]
            into_lines = [line for line in statement.splitlines() if line.startswith("  INTO ")]
            columns = into_lines[0].split("(", 1)[1].split(")", 1)[0].count(",") + 1
            self.assertLessEqual(len(into_lines) * columns, 999)

    def test_oracle_long_clob_literals_are_chunked(self):
        literal = _literal("é'" * 1500, "clob", "oracle")
        self.assertEqual(literal.count("TO_CLOB("), 3)
        for piece in literal.split(" || "):
            self.assertTrue(piece.startswith("TO_CLOB('") and piece.endswith("')"))
            value = piece[len("TO_CLOB('"):-2].replace("''", "'")
            self.assertLessEqual(len(value.encode()), 4000)
        self.assertEqual(_literal("short", "clob", "oracle"), "'short'")


if __name__ == "__main__":
    unittest.main()
