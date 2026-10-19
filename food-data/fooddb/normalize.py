"""Value standardization shared by every source parser."""

from __future__ import annotations

import html
import math
import re
import unicodedata
from datetime import datetime, timezone

from .schema import COLUMN_BY_NAME, INT, REAL, TEXT

KJ_PER_KCAL = 4.184
SODIUM_PER_SALT = 1 / 2.5
MAX_KCAL_PER_100G = 900
MIN_MACRO_KCAL_FOR_CHECK = 15

_EMPTY_TEXT = {"", "unknown", "n/a", "na", "none", "null", "nil", "-", "--", "?", "undefined", "nan"}
_CONTROL_RE = re.compile(r"[\x00-\x1f\x7f]+")
_SPACE_RE = re.compile(r"\s+")
_WORD_RE = re.compile(r"[^\W\d_][^\W_']*(?:'[^\W\d_]+)?", re.UNICODE)
_SMALL_WORDS = {"a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with", "w/", "w/o"}
_KEEP_UPPER = {"usa", "us", "uk", "bbq", "ii", "iii", "iv", "uht", "nfs", "ns", "dha", "epa", "mct", "xl", "xxl"}
_NUMBER_RE = re.compile(r"^[+-]?(\d+([.,]\d*)?|[.,]\d+)([eE][+-]?\d+)?$")
_INGREDIENTS_PREFIX_RE = re.compile(r"^\s*(ingredients?|ingr[ée]dients?)\s*[:.\-]\s*", re.IGNORECASE)


def clean_text(value: object) -> str | None:
    """Trim, unescape HTML entities, drop control characters and empty sentinels."""
    if value is None:
        return None
    text = str(value)
    if "&" in text:
        text = html.unescape(text)
    text = unicodedata.normalize("NFC", text)
    text = _CONTROL_RE.sub(" ", text)
    text = _SPACE_RE.sub(" ", text).strip()
    if text.lower() in _EMPTY_TEXT:
        return None
    return text


def truncate(text: str | None, max_len: int | None) -> str | None:
    if text is None or max_len is None or len(text) <= max_len:
        return text
    cut = text[:max_len]
    for sep in (", ", " "):
        idx = cut.rfind(sep)
        if idx >= max_len * 0.6:
            return cut[:idx].rstrip(" ,;")
    return cut


def smart_case(text: str | None) -> str | None:
    """Title-case text that arrives in ALL CAPS; leave mixed-case text alone."""
    if not text:
        return text
    letters = [ch for ch in text if ch.isalpha()]
    if len(letters) < 2 or any(ch.islower() for ch in letters):
        return text

    first = True

    def fix(match: re.Match[str]) -> str:
        nonlocal first
        word = match.group(0)
        lower = word.lower()
        if lower in _KEEP_UPPER:
            out = word.upper()
        elif not first and lower in _SMALL_WORDS:
            out = lower
        else:
            out = lower[:1].upper() + lower[1:]
        first = False
        return out

    return _WORD_RE.sub(fix, text)


def clean_name(value: object) -> str | None:
    text = clean_text(value)
    if text is None:
        return None
    text = smart_case(text).strip(" ,;")
    if text and text[0].islower():
        text = text[0].upper() + text[1:]
    return text or None


def deslug(value: object) -> str | None:
    """Open Food Facts tag (`xx:lunds-byerlys`, `kellogg-s`) -> readable text."""
    text = clean_text(value)
    if not text:
        return None
    text = re.sub(r"^[a-z]{2}:", "", text)
    text = re.sub(r"-s\b", "'s", text)
    text = text.replace("-", " ")
    return _WORD_RE.sub(lambda m: m.group(0)[:1].upper() + m.group(0)[1:], text)


def clean_ingredients(value: object) -> str | None:
    text = clean_text(value)
    if text is None:
        return None
    text = _INGREDIENTS_PREFIX_RE.sub("", text).strip()
    if not text:
        return None
    if not any(ch.islower() for ch in text):
        text = text.lower()
    return text[:1].upper() + text[1:]


def clean_tags(value: object) -> str | None:
    """Comma-separated OFF tag list -> lowercase, de-duplicated, `en:` prefixed tags."""
    text = clean_text(value)
    if not text:
        return None
    seen: list[str] = []
    for raw in text.split(","):
        tag = raw.strip().lower()
        if not tag:
            continue
        if ":" not in tag:
            tag = "en:" + tag.replace(" ", "-")
        if tag not in seen:
            seen.append(tag)
    return ",".join(seen) or None


def clean_list(value: object) -> str | None:
    text = clean_text(value)
    if not text:
        return None
    seen: list[str] = []
    for raw in text.split(","):
        item = raw.strip()
        if item and item.lower() not in (s.lower() for s in seen):
            seen.append(item)
    return ",".join(seen) or None


def parse_number(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
    else:
        text = str(value).strip()
        if not text or not _NUMBER_RE.match(text):
            return None
        number = float(text.replace(",", "."))
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def round_sig(value: float, digits: int = 6) -> float:
    if value == 0:
        return 0.0
    return float(f"{value:.{digits}g}")


def clean_column_value(name: str, value: object) -> object:
    """Validate and round a value for a schema column; out-of-range numbers become NULL."""
    column = COLUMN_BY_NAME[name]
    if column.kind == TEXT:
        text = value if isinstance(value, str) else clean_text(value)
        return truncate(text, column.max_len) if text else None
    number = parse_number(value)
    if number is None:
        return None
    if number < column.min_value:
        return None
    if column.max_value is not None and number > column.max_value:
        return None
    if column.kind == INT:
        if abs(number - round(number)) > 1e-6:
            return None
        return int(round(number))
    if column.kind == REAL:
        if name in ("energy_kcal_100g", "energy_kj_100g"):
            return round(number, 1)
        if name == "serving_quantity":
            return round(number, 2) or None
        return round_sig(number)
    return number


def normalize_barcode(value: object) -> str | None:
    """Canonical GTIN text: EAN-8 stays 8 digits, UPC-A/EAN-13 become 13, GTIN-14 keeps 14.

    Matches how Open Food Facts stores codes, so `016000275287`, `0016000275287`
    and USDA's `00016000275287` all collapse to `0016000275287`.
    """
    text = clean_text(value)
    if not text:
        return None
    digits = re.sub(r"[\s\-]", "", text)
    if not digits.isdigit():
        return None
    core = digits.lstrip("0")
    if not core or len(core) > 14:
        return None
    if len(core) == 14:
        return core
    if len(digits) <= 8:
        return core.zfill(8)
    return core.zfill(13)


def barcode_spellings(gtin: str) -> list[str]:
    """Other spellings scanners report for a normalized GTIN (UPC-A 12 digits, GTIN-14)."""
    if len(gtin) != 13:
        return []
    spellings = ["0" + gtin]
    if gtin.startswith("0"):
        spellings.append(gtin[1:])
    return spellings


_PLURAL_EXCEPTIONS = {"ss", "us", "is"}


def _singular(token: str) -> str:
    if len(token) > 4 and token.endswith("ies"):
        return token[:-3] + "y"
    if len(token) > 3 and token.endswith("oes"):
        return token[:-2]
    if len(token) > 3 and token.endswith("s") and token[-2:] not in _PLURAL_EXCEPTIONS:
        return token[:-1]
    return token


def name_key(name: str | None) -> str | None:
    """Order- and plural-insensitive key so `Bananas, raw` and `Banana, raw` match."""
    if not name:
        return None
    text = unicodedata.normalize("NFKD", name)
    text = "".join(ch for ch in text if not unicodedata.combining(ch)).lower()
    text = text.replace("&", " and ")
    tokens = [t for t in re.split(r"[^a-z0-9%]+", text) if t]
    if not tokens:
        return None
    return " ".join(sorted(_singular(t) for t in tokens))


def to_iso(value: object) -> str | None:
    """Unix seconds / ISO date(-time) text -> `YYYY-MM-DDTHH:MM:SSZ` (UTC)."""
    if value is None or value == "":
        return None
    number = parse_number(value)
    try:
        if number is not None and number > 10_000_000:
            dt = datetime.fromtimestamp(number, tz=timezone.utc)
        else:
            text = str(value).strip().replace("Z", "+00:00")
            if len(text) == 10:
                text += "T00:00:00+00:00"
            dt = datetime.fromisoformat(text)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
    except (ValueError, OverflowError, OSError):
        return None
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def to_grams(amount: float | None, unit: str | None) -> float | None:
    """Convert a nutrient amount to grams. Returns None for unknown units (incl. IU)."""
    if amount is None or unit is None:
        return None
    u = unit.strip().lower().replace("μ", "µ")
    if u in ("g", "gm", "grm", "gram", "grams"):
        return amount
    if u in ("mg", "milligram", "milligrams"):
        return amount / 1000
    if u in ("ug", "µg", "mcg", "microgram", "micrograms"):
        return amount / 1_000_000
    return None


# International units -> grams, per nutrient.
IU_TO_GRAMS = {
    "vitamin_a_100g": 0.3e-6,  # retinol (same factor Open Food Facts uses)
    "vitamin_d_100g": 0.025e-6,
}


def atwater_kcal(protein: float | None, carbs: float | None, fat: float | None) -> float:
    return (protein or 0) * 4 + (carbs or 0) * 4 + (fat or 0) * 9


def fix_energy(record: dict) -> None:
    """Repair kJ stored as kcal and fill the missing half of the kcal/kJ pair.

    Mirrors the app's `kcalPer100g` heuristic so stored values never need it.
    """
    kcal = parse_number(record.get("energy_kcal_100g"))
    kj = parse_number(record.get("energy_kj_100g"))
    macro_kcal = atwater_kcal(
        parse_number(record.get("proteins_100g")),
        parse_number(record.get("carbohydrates_100g")),
        parse_number(record.get("fat_100g")),
    )

    if kcal is not None and kcal >= 0:
        looks_like_kj = kcal > MAX_KCAL_PER_100G or (
            macro_kcal >= MIN_MACRO_KCAL_FOR_CHECK and 3.5 <= kcal / macro_kcal <= 5
        )
        if looks_like_kj:
            if kj is None:
                kj = kcal
            kcal = kj / KJ_PER_KCAL
    if kcal is None and kj is not None:
        kcal = kj / KJ_PER_KCAL
    if kj is None and kcal is not None:
        kj = kcal * KJ_PER_KCAL

    record["energy_kcal_100g"] = kcal
    record["energy_kj_100g"] = kj


# A part can't outweigh the whole it belongs to; small tolerance for label rounding.
COMPONENT_PARENTS = (
    ("saturated_fat_100g", "fat_100g"),
    ("trans_fat_100g", "fat_100g"),
    ("monounsaturated_fat_100g", "fat_100g"),
    ("polyunsaturated_fat_100g", "fat_100g"),
    ("sugars_100g", "carbohydrates_100g"),
    ("polyols_100g", "carbohydrates_100g"),
    ("added_sugars_100g", "sugars_100g"),
)


def drop_inconsistent_components(record: dict) -> None:
    """Null sub-nutrients that exceed their parent (e.g. sugars above total carbs)."""
    for child, parent in COMPONENT_PARENTS:
        part = record.get(child)
        whole = record.get(parent)
        if part is not None and whole is not None and part > whole * 1.05 + 0.5:
            record[child] = None


def fill_energy_from_macros(record: dict) -> None:
    if record.get("energy_kcal_100g") is not None:
        return
    protein = record.get("proteins_100g")
    carbs = record.get("carbohydrates_100g")
    fat = record.get("fat_100g")
    if protein is None or carbs is None or fat is None:
        return
    kcal = atwater_kcal(protein, carbs, fat)
    record["energy_kcal_100g"] = round(kcal, 1)
    record["energy_kj_100g"] = round(kcal * KJ_PER_KCAL, 1)


def format_amount(value: float) -> str:
    if abs(value - round(value)) < 1e-9:
        return str(int(round(value)))
    return f"{value:.2f}".rstrip("0").rstrip(".")


def serving_label(description: str | None, grams: float | None, unit: str = "g") -> str | None:
    """`1 cup` + 240 -> `1 cup (240 g)`; avoids repeating a weight already in the text."""
    desc = clean_text(description)
    if grams is None or grams <= 0:
        return desc
    weight = f"{format_amount(grams)} {unit}"
    if not desc:
        return weight
    unit_words = r"(g|gram|grams)" if unit == "g" else r"(ml|mL|milliliters?|millilitres?)"
    if re.search(rf"\d\s*{unit_words}\b", desc, re.IGNORECASE):
        return desc
    return f"{desc} ({weight})"
