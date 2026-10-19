"""Standardized per-source records, before duplicates are condensed."""

from __future__ import annotations

from typing import Iterable

from .normalize import clean_column_value, fix_energy, name_key, normalize_barcode
from .schema import COLUMN_NAMES, COMPLETION_FIELDS, UNION_FIELDS

DATA_FIELDS = tuple(
    name
    for name in COLUMN_NAMES
    if name not in UNION_FIELDS and name not in ("code", "trust_and_completion_score", "updated_timestamp")
)


def make_record(
    source: str,
    source_id: str,
    fields: dict,
    *,
    code: str | None = None,
    barcode: object = None,
    match_by_name: bool = False,
    aliases: Iterable[str] = (),
    countries: Iterable[str] = (),
    updated: str | None = None,
    brands_fallback: str | None = None,
) -> dict:
    """Build a standardized record.

    `barcode` (any GTIN spelling) makes the record merge with every other record
    for the same product. Without one, `match_by_name` lets generic foods
    (e.g. "Banana, raw") merge across databases by normalized name.
    """
    record: dict = {}
    for name in DATA_FIELDS:
        value = fields.get(name)
        record[name] = None if value is None else value
    fix_energy(record)
    for name in DATA_FIELDS:
        record[name] = clean_column_value(name, record[name])

    gtin = normalize_barcode(barcode)
    if gtin:
        merge_key = f"gtin:{gtin}"
        record_code = gtin
    else:
        record_code = code or f"{source}-{source_id}"
        key = name_key(record["product_name"]) if match_by_name else None
        merge_key = f"name:{key}" if key else f"id:{source}:{source_id}"

    alias_set = {record_code}
    if code:
        alias_set.add(code)
    raw_barcode = str(barcode).strip() if barcode not in (None, "") else None
    if raw_barcode:
        alias_set.add(raw_barcode)
    alias_set.update(a for a in aliases if a)

    record["_source"] = source
    record["_source_id"] = str(source_id)
    record["_code"] = record_code
    record["_merge_key"] = merge_key
    record["_aliases"] = sorted(alias_set)
    record["_countries"] = sorted(set(countries))
    record["_updated"] = updated
    record["_brands_fallback"] = clean_column_value("brands", brands_fallback) if brands_fallback else None
    record["_completeness"] = sum(1 for f in COMPLETION_FIELDS if record.get(f) is not None)
    return record
