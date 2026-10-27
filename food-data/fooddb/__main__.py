"""Command line entry point: `python -m fooddb --help`."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .build import ALL_SOURCES, USDA_DATASETS, BuildOptions, build, fetch_inputs
from .export import DIALECTS, write_sql_dump
from .oracle_upload import resume_oracle_aliases, upload_oracle

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "output" / "kiloric_foods.sqlite"
DEFAULT_CACHE = ROOT / ".cache"


def _csv(value: str) -> tuple[str, ...]:
    return tuple(v.strip().lower() for v in value.split(",") if v.strip())


def _choices(values: tuple[str, ...], allowed: tuple[str, ...], flag: str) -> tuple[str, ...]:
    unknown = [v for v in values if v not in allowed]
    if unknown:
        raise SystemExit(f"{flag}: unknown value(s) {', '.join(unknown)}; choose from {', '.join(allowed)}")
    return values


def _add_input_flags(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE, help="where downloads are kept (default: %(default)s)")
    parser.add_argument("--sources", type=_csv, default=ALL_SOURCES, help="comma list of usda,cnf,off (default: all)")
    parser.add_argument(
        "--usda-datasets", type=_csv, default=USDA_DATASETS,
        help="comma list of foundation,sr_legacy,survey,branded (default: all)",
    )
    parser.add_argument("--refresh", action="store_true", help="re-download files even if cached")
    for key, help_text in (
        ("usda-foundation", "FoodData Central Foundation CSV zip"),
        ("usda-sr-legacy", "FoodData Central SR Legacy CSV zip"),
        ("usda-survey", "FoodData Central FNDDS (survey) CSV zip"),
        ("usda-branded", "FoodData Central Branded CSV zip"),
        ("cnf", "Canadian Nutrient File CSV zip"),
        ("off", "Open Food Facts products CSV(.gz) export"),
    ):
        parser.add_argument(f"--{key}-file", type=Path, help=f"use a local {help_text} instead of downloading")


def _options(args: argparse.Namespace) -> BuildOptions:
    local = {
        key: getattr(args, f"{key}_file")
        for key in ("usda_foundation", "usda_sr_legacy", "usda_survey", "usda_branded", "cnf", "off")
        if getattr(args, f"{key}_file", None)
    }
    return BuildOptions(
        out=getattr(args, "out", DEFAULT_OUT),
        cache_dir=args.cache_dir,
        sources=_choices(args.sources, ALL_SOURCES, "--sources"),
        usda_datasets=_choices(args.usda_datasets, USDA_DATASETS, "--usda-datasets"),
        countries=frozenset(_choices(getattr(args, "countries", ("us", "ca")), ("us", "ca"), "--countries")),
        sql_out=getattr(args, "sql", None),
        dialect=getattr(args, "dialect", "sqlite"),
        limit=getattr(args, "limit", None),
        refresh=args.refresh,
        fts=not getattr(args, "no_fts", False),
        local_files=local,
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m fooddb", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p_build = sub.add_parser("build", help="download (if needed) and build the SQL database")
    p_build.add_argument("--out", type=Path, default=DEFAULT_OUT, help="SQLite output path (default: %(default)s)")
    p_build.add_argument("--sql", type=Path, help="also write a .sql script (CREATE TABLE + INSERT) here")
    p_build.add_argument("--dialect", choices=DIALECTS, default="sqlite", help="dialect for --sql (default: sqlite)")
    p_build.add_argument("--countries", type=_csv, default=("us", "ca"), help="Open Food Facts / USDA markets: us,ca")
    p_build.add_argument("--limit", type=int, help="max records per source (for quick test builds)")
    p_build.add_argument("--no-fts", action="store_true", help="skip the SQLite full-text search index")
    _add_input_flags(p_build)

    p_download = sub.add_parser("download", help="only fetch and cache the source files")
    _add_input_flags(p_download)

    p_dump = sub.add_parser("dump", help="convert an existing SQLite build into a .sql script")
    p_dump.add_argument("--db", type=Path, default=DEFAULT_OUT, help="SQLite build (default: %(default)s)")
    p_dump.add_argument("--sql", type=Path, required=True, help="output .sql path")
    p_dump.add_argument("--dialect", choices=DIALECTS, default="sqlite")

    p_upload = sub.add_parser("upload-oracle", help="merge a validated SQLite build into the existing Oracle food catalog")
    p_upload.add_argument("--db", type=Path, default=DEFAULT_OUT, help="SQLite build (default: %(default)s)")
    p_upload.add_argument("--batch-size", type=int, default=5000, help="rows per Oracle batch (default: %(default)s)")
    p_upload.add_argument("--resume-stage", help="resume alias loading from a retained FPSTG_ stage after a partial upload")

    args = parser.parse_args(argv)
    if args.command == "build":
        stats = build(_options(args))
        print(json.dumps(stats, indent=2))
    elif args.command == "download":
        files = fetch_inputs(_options(args))
        print(json.dumps({k: str(v) for k, v in files.items()}, indent=2))
    elif args.command == "dump":
        count = write_sql_dump(args.db, args.sql, args.dialect)
        print(f"wrote {count:,} foods to {args.sql}")
    elif args.command == "upload-oracle":
        if args.batch_size < 1:
            raise SystemExit("--batch-size must be positive")
        stats = (
            resume_oracle_aliases(args.resume_stage, args.batch_size)
            if args.resume_stage
            else upload_oracle(args.db, args.batch_size)
        )
        print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
