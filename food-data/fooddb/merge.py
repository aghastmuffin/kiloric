"""Condense duplicate records into one row per food, sharing data across sources."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Iterable, Iterator

from .normalize import drop_inconsistent_components, fill_energy_from_macros, format_amount
from .records import DATA_FIELDS
from .schema import (
    BRAND_FIELDS,
    COMPLETION_FIELDS,
    COUNTRY_NAMES,
    ENERGY_FIELDS,
    FIELD_GROUP_SOURCE_ORDER,
    GOVERNMENT_SOURCES,
    IDENTITY_FIELDS,
    NUTRIENT_FIELDS,
    SOURCE_ID_PREFIX,
    SOURCE_LABELS,
)
from .normalize import clean_column_value

SOURCE_LABEL_ORDER = list(SOURCE_LABELS)


def _ordered(records: list[dict], order_name: str) -> list[dict]:
    order = FIELD_GROUP_SOURCE_ORDER[order_name]
    rank = {source: i for i, source in enumerate(order)}
    by_recency = sorted(records, key=lambda r: r.get("_updated") or "", reverse=True)
    return sorted(by_recency, key=lambda r: (rank.get(r["_source"], len(order)), -r["_completeness"]))


def _first(records: list[dict], field: str):
    for record in records:
        value = record.get(field)
        if value is not None:
            return value
    return None


def merge_group(merge_key: str, records: list[dict]) -> tuple[dict, list[str]]:
    """Merge records describing the same food. Returns (row, alias codes)."""
    identity = _ordered(records, "identity")
    brand = _ordered(records, "brand")
    nutrition = _ordered(records, "nutrition")

    row: dict = {name: None for name in DATA_FIELDS}
    for field in IDENTITY_FIELDS:
        row[field] = _first(identity, field)
    row["ingredients"] = row.get("ingredients_text")
    for field in BRAND_FIELDS:
        row[field] = _first(brand, field) or _first(brand, "_brands_fallback")

    # Serving size and energy travel as a unit so a label's text and numbers stay consistent.
    serving_source = next((r for r in nutrition if r.get("serving_quantity") is not None), None)
    if serving_source is not None:
        row["serving_quantity"] = serving_source["serving_quantity"]
        row["serving_size"] = serving_source.get("serving_size") or f"{format_amount(row['serving_quantity'])} g"
    else:
        row["serving_size"] = _first(nutrition, "serving_size")

    energy_source = next((r for r in nutrition if r.get("energy_kcal_100g") is not None), None)
    if energy_source is not None:
        for field in ENERGY_FIELDS:
            row[field] = energy_source.get(field)

    for field in NUTRIENT_FIELDS:
        row[field] = _first(nutrition, field)
    drop_inconsistent_components(row)
    fill_energy_from_macros(row)
    for field in ENERGY_FIELDS:
        row[field] = clean_column_value(field, row[field])

    if merge_key.startswith("gtin:"):
        code = merge_key[5:]
    else:
        code = nutrition[0]["_code"]
    row["code"] = code
    filled = sum(1 for field in COMPLETION_FIELDS if row.get(field) is not None)

    if not row["product_name"]:
        row["product_name"] = (
            f"{row['brands']} product (barcode {code})" if row["brands"] else f"Unnamed product (barcode {code})"
        )

    sources = {r["_source"] for r in records}
    countries = {c for r in records for c in r["_countries"]}
    row["countries"] = ",".join(COUNTRY_NAMES[c] for c in ("us", "ca") if c in countries) or None
    labels = []
    for source in SOURCE_LABEL_ORDER:
        if source in sources and SOURCE_LABELS[source] not in labels:
            labels.append(SOURCE_LABELS[source])
    row["data_sources"] = ", ".join(labels)
    ids = sorted({f"{SOURCE_ID_PREFIX[r['_source']]}:{r['_source_id']}" for r in records})
    row["source_ids"] = clean_column_value("source_ids", ";".join(ids))

    updated = [r["_updated"] for r in records if r.get("_updated")]
    row["updated_timestamp"] = max(updated) if updated else None
    trust = 1 if sources & GOVERNMENT_SOURCES else 0
    row["trust_and_completion_score"] = trust * 10000 + round(100 * filled / len(COMPLETION_FIELDS))

    aliases = sorted({alias for r in records for alias in r["_aliases"]} - {code})
    return row, aliases


class Staging:
    """Disk-backed holding area so millions of records never sit in memory at once."""

    def __init__(self, path: Path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            path.unlink()
        self.db = sqlite3.connect(path)
        self.db.executescript(
            """
            PRAGMA journal_mode = OFF;
            PRAGMA synchronous = OFF;
            PRAGMA temp_store = FILE;
            CREATE TABLE staging (merge_key TEXT NOT NULL, payload TEXT NOT NULL);
            """
        )
        self.count = 0

    def add_all(self, records: Iterable[dict], batch: int = 20000) -> int:
        added = 0
        pending: list[tuple[str, str]] = []
        for record in records:
            pending.append((record["_merge_key"], json.dumps(record, separators=(",", ":"))))
            if len(pending) >= batch:
                self.db.executemany("INSERT INTO staging VALUES (?, ?)", pending)
                added += len(pending)
                pending.clear()
        if pending:
            self.db.executemany("INSERT INTO staging VALUES (?, ?)", pending)
            added += len(pending)
        self.db.commit()
        self.count += added
        return added

    def groups(self) -> Iterator[tuple[str, list[dict]]]:
        self.db.execute("CREATE INDEX IF NOT EXISTS staging_key ON staging (merge_key)")
        current_key: str | None = None
        current: list[dict] = []
        for merge_key, payload in self.db.execute("SELECT merge_key, payload FROM staging ORDER BY merge_key"):
            if merge_key != current_key and current:
                yield current_key, current
                current = []
            current_key = merge_key
            current.append(json.loads(payload))
        if current:
            yield current_key, current

    def close(self, delete: bool = True) -> None:
        self.db.close()
        if delete and self.path.exists():
            self.path.unlink()
