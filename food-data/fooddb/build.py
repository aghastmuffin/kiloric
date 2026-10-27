"""End-to-end build: download -> parse -> stage -> condense -> export."""

from __future__ import annotations

import time
import os
import sqlite3
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from . import __version__
from .download import CNF_URL, FDC_BASE, OFF_URL, download, latest_fdc_files, log
from .export import SqliteWriter, write_sql_dump
from .merge import Staging, merge_group
from .sources.cnf import iter_cnf
from .sources.off import iter_off
from .sources.usda import iter_branded, iter_generic

USDA_DATASETS = ("foundation", "sr_legacy", "survey", "branded")
ALL_SOURCES = ("usda", "cnf", "off")


@dataclass
class BuildOptions:
    out: Path
    cache_dir: Path
    sources: tuple[str, ...] = ALL_SOURCES
    usda_datasets: tuple[str, ...] = USDA_DATASETS
    countries: frozenset[str] = frozenset({"us", "ca"})
    sql_out: Path | None = None
    dialect: str = "sqlite"
    limit: int | None = None
    refresh: bool = False
    fts: bool = True
    local_files: dict[str, Path] = field(default_factory=dict)


def fetch_inputs(options: BuildOptions) -> dict[str, Path]:
    """Resolve every input file, downloading anything that isn't cached yet."""
    files: dict[str, Path] = {}
    cache = options.cache_dir
    if "usda" in options.sources:
        wanted = [d for d in options.usda_datasets if f"usda_{d}" not in options.local_files]
        releases = latest_fdc_files() if wanted else {}
        for dataset in options.usda_datasets:
            key = f"usda_{dataset}"
            if key in options.local_files:
                files[key] = options.local_files[key]
            else:
                name = releases[dataset]
                files[key] = download(FDC_BASE + name, cache / name, refresh=options.refresh)
    if "cnf" in options.sources:
        files["cnf"] = options.local_files.get("cnf") or download(CNF_URL, cache / "cnf-fcen-csv.zip", refresh=options.refresh)
    if "off" in options.sources:
        files["off"] = options.local_files.get("off") or download(
            OFF_URL, cache / "en.openfoodfacts.org.products.csv.gz", refresh=options.refresh
        )
    return files


def build(options: BuildOptions) -> dict:
    started = time.time()
    files = fetch_inputs(options)
    staging = Staging(options.out.with_name(options.out.name + ".staging"))
    # Build beside the destination and only publish a database after SQLite
    # confirms it is structurally sound. Incomplete source fields are NULL;
    # product_name is populated with a placeholder by the merge layer.
    build_path = options.out.with_name(options.out.name + ".building")
    if build_path.exists():
        build_path.unlink()
    per_source: Counter[str] = Counter()

    def stage(label: str, records) -> None:
        t = time.time()
        added = staging.add_all(records)
        per_source[label] += added
        log(f"[build] staged {added:,} {label} records in {time.time() - t:.0f}s")

    for dataset in options.usda_datasets if "usda" in options.sources else ():
        path = files[f"usda_{dataset}"]
        if dataset == "branded":
            stage("usda_branded", iter_branded(path, set(options.countries), options.limit))
        else:
            stage(f"usda_{dataset}", iter_generic(path, dataset, options.limit))
    if "cnf" in options.sources:
        stage("cnf", iter_cnf(files["cnf"], options.limit))
    if "off" in options.sources:
        stage("off", iter_off(files["off"], set(options.countries), options.limit))

    log(f"[build] condensing {staging.count:,} records")
    writer = SqliteWriter(build_path)
    merged_groups = 0
    multi_source_groups = 0
    for merge_key, records in staging.groups():
        row, aliases = merge_group(merge_key, records)
        writer.add(row, aliases)
        if len(records) > 1:
            merged_groups += 1
            if len({r["_source"] for r in records}) > 1:
                multi_source_groups += 1
    staging.close()

    stats = {
        "records_in": sum(per_source.values()),
        "foods_out": writer.count,
        "condensed_groups": merged_groups,
        "cross_source_groups": multi_source_groups,
        **{f"records_{k}": v for k, v in sorted(per_source.items())},
    }
    info = {
        "generator": f"kiloric-fooddb {__version__}",
        "built_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "countries": ",".join(sorted(options.countries)),
        "units": "*_100g columns are grams per 100 g/ml; energy_kcal_100g kcal, energy_kj_100g kJ; serving_quantity g/ml",
        **{f"input_{k}": p.name for k, p in sorted(files.items())},
        **{k: str(v) for k, v in stats.items()},
    }
    writer.finish(info, fts=options.fts)
    with sqlite3.connect(build_path) as check_db:
        integrity = check_db.execute("PRAGMA integrity_check").fetchone()[0]
        missing_products = check_db.execute("SELECT COUNT(*) FROM foods WHERE product_name IS NULL OR trim(product_name) = ''").fetchone()[0]
        dangling_codes = check_db.execute(
            "SELECT COUNT(*) FROM food_codes c LEFT JOIN foods f ON f.code = c.code WHERE f.code IS NULL"
        ).fetchone()[0]
    if integrity != "ok" or missing_products or dangling_codes:
        build_path.unlink(missing_ok=True)
        raise RuntimeError(
            f"Invalid output database: integrity={integrity}, "
            f"empty_product_names={missing_products}, dangling_codes={dangling_codes}"
        )
    options.out.parent.mkdir(parents=True, exist_ok=True)
    os.replace(build_path, options.out)
    log(f"[build] wrote {writer.count:,} foods to {options.out}")

    if options.sql_out:
        log(f"[build] writing {options.dialect} SQL script to {options.sql_out}")
        write_sql_dump(options.out, options.sql_out, options.dialect)

    stats["seconds"] = round(time.time() - started)
    return stats
