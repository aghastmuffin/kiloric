"""Open Food Facts full CSV export, filtered to products sold in the US and/or Canada."""

from __future__ import annotations

import gzip
import re
from pathlib import Path
from typing import Iterator, TextIO

from ..download import log
from ..normalize import (
    SODIUM_PER_SALT,
    clean_ingredients,
    clean_list,
    clean_name,
    clean_tags,
    clean_text,
    deslug,
    parse_number,
    to_iso,
)
from ..records import make_record
from ..schema import OFF

COUNTRY_TAGS = {"en:united-states": "us", "en:canada": "ca"}

# OFF CSV column -> output column. The first column listed for a field wins.
NUMERIC_COLUMNS: tuple[tuple[str, str], ...] = (
    ("energy-kcal_100g", "energy_kcal_100g"),
    ("energy-kj_100g", "energy_kj_100g"),
    ("energy_100g", "energy_kj_100g"),
    ("proteins_100g", "proteins_100g"),
    ("carbohydrates_100g", "carbohydrates_100g"),
    ("fat_100g", "fat_100g"),
    ("fiber_100g", "fiber_100g"),
    ("sugars_100g", "sugars_100g"),
    ("added-sugars_100g", "added_sugars_100g"),
    ("polyols_100g", "polyols_100g"),
    ("saturated-fat_100g", "saturated_fat_100g"),
    ("trans-fat_100g", "trans_fat_100g"),
    ("monounsaturated-fat_100g", "monounsaturated_fat_100g"),
    ("polyunsaturated-fat_100g", "polyunsaturated_fat_100g"),
    ("sodium_100g", "sodium_100g"),
    ("cholesterol_100g", "cholesterol_100g"),
    ("vitamin-a_100g", "vitamin_a_100g"),
    ("vitamin-c_100g", "vitamin_c_100g"),
    ("vitamin-d_100g", "vitamin_d_100g"),
    ("vitamin-b12_100g", "vitamin_b12_100g"),
    ("calcium_100g", "calcium_100g"),
    ("iron_100g", "iron_100g"),
    ("potassium_100g", "potassium_100g"),
    ("magnesium_100g", "magnesium_100g"),
    ("caffeine_100g", "caffeine_100g"),
    ("taurine_100g", "taurine_100g"),
    ("carbon-footprint_100g", "carbon_footprint_100g"),
    ("serving_quantity", "serving_quantity"),
    ("nova_group", "nova_group"),
    ("additives_n", "additives_n"),
)

NUTRISCORE_GRADES = {"a", "b", "c", "d", "e"}
ECOSCORE_GRADES = {"a-plus", "a", "b", "c", "d", "e", "f"}


# Every real row starts with `<code>\t<product url>`; fragments of broken rows don't.
RECORD_START_RE = re.compile(r"^[^\t]*\thttps?://")


def iter_records(lines: Iterator[str], columns: int, stats: dict, anchored: bool = True) -> Iterator[str]:
    """Rejoin rows whose text fields contain raw newlines (the export doesn't quote them).

    With `anchored`, a row only starts on a `code<TAB>url` line, so a corrupt
    fragment can never be glued onto the next product and shift its columns.
    """
    need = columns - 1
    buf: str | None = None
    tabs = 0

    def bad() -> None:
        stats["malformed"] = stats.get("malformed", 0) + 1

    for line in lines:
        line = line.rstrip("\n")
        if anchored:
            starts = RECORD_START_RE.match(line) is not None
        else:
            starts = buf is None and bool(line)
        if starts:
            if buf is not None:
                bad()
            buf, tabs = line, line.count("\t")
        elif buf is None:
            if line:
                bad()
            continue
        else:
            buf += " " + line
            tabs += line.count("\t")
        if tabs == need:
            yield buf
            buf = None
        elif tabs > need:
            bad()
            buf = None
    if buf is not None:
        bad()


def parse_stream(stream: TextIO, countries: set[str], limit: int | None = None) -> Iterator[dict]:
    header = stream.readline().rstrip("\n").split("\t")
    col = {name: i for i, name in enumerate(header)}
    markers = [tag for tag, code in COUNTRY_TAGS.items() if code in countries]
    stats: dict = {}
    scanned = kept = 0

    def get(parts: list[str], *names: str) -> str | None:
        for name in names:
            i = col.get(name)
            if i is not None and parts[i]:
                return parts[i]
        return None

    anchored = len(header) > 1 and header[0] == "code" and header[1] == "url"
    for raw in iter_records(stream, len(header), stats, anchored):
        scanned += 1
        if scanned % 500_000 == 0:
            log(f"[off] scanned {scanned:,} products, kept {kept:,}")
        if not any(marker in raw for marker in markers):
            continue
        parts = raw.split("\t")
        tags = (get(parts, "countries_tags") or "").split(",")
        matched = sorted({COUNTRY_TAGS[t] for t in tags if t in COUNTRY_TAGS and COUNTRY_TAGS[t] in countries})
        if not matched:
            continue
        code = clean_text(get(parts, "code"))
        if not code:
            continue

        fields: dict = {}
        for off_name, field in NUMERIC_COLUMNS:
            if fields.get(field) is None:
                fields[field] = parse_number(get(parts, off_name))
        if fields.get("sodium_100g") is None:
            salt = parse_number(get(parts, "salt_100g"))
            if salt is not None:
                fields["sodium_100g"] = salt * SODIUM_PER_SALT

        fields["product_name"] = clean_name(
            get(parts, "product_name", "product_name_en", "generic_name", "abbreviated_product_name")
        )
        brands_text = clean_list(get(parts, "brands"))
        if not brands_text:
            tags_text = get(parts, "brands_tags", "brands_en")
            if tags_text:
                brands_text = clean_list(",".join(filter(None, (deslug(t) for t in tags_text.split(",")))))
        fields["brands"] = brands_text
        fields["categories"] = clean_list(get(parts, "categories_en", "categories"))
        fields["quantity"] = clean_text(get(parts, "quantity"))
        fields["serving_size"] = clean_text(get(parts, "serving_size"))
        fields["allergens"] = clean_tags(get(parts, "allergens_tags", "allergens"))
        fields["traces_tags"] = clean_tags(get(parts, "traces_tags"))
        image = clean_text(get(parts, "image_url"))
        fields["image_url"] = image if image and image.startswith("http") and "/invalid/" not in image else None
        nutriscore = (clean_text(get(parts, "nutriscore_grade")) or "").lower()
        fields["nutriscore_grade"] = nutriscore if nutriscore in NUTRISCORE_GRADES else None
        ecoscore = (clean_text(get(parts, "environmental_score_grade", "ecoscore_grade")) or "").lower()
        fields["ecoscore_grade"] = ecoscore if ecoscore in ECOSCORE_GRADES else None
        fields["ingredients_text"] = clean_ingredients(get(parts, "ingredients_text_en", "ingredients_text"))

        kept += 1
        yield make_record(
            OFF,
            code,
            fields,
            code=code,
            barcode=code,
            countries=matched,
            updated=to_iso(get(parts, "last_modified_t", "last_modified_datetime")),
            brands_fallback=clean_text(get(parts, "brand_owner")),
        )
        if limit and kept >= limit:
            break

    log(f"[off] scanned {scanned:,} products, kept {kept:,} sold in {'/'.join(sorted(countries)).upper()}"
        f" ({stats.get('malformed', 0):,} malformed rows skipped)")


def iter_off(path: Path, countries: set[str], limit: int | None = None) -> Iterator[dict]:
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8", errors="replace", newline="\n") as stream:
        yield from parse_stream(stream, countries, limit)
