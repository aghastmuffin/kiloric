"""Merge a validated fooddb SQLite build into Kiloric's Oracle catalog.

This loader only adds columns and rows. Existing rows are updated only where
the pipeline supplies a non-NULL value, so incomplete source records cannot
erase populated legacy fields.
"""

from __future__ import annotations

import os
import re
import secrets
import subprocess
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Iterable

from .schema import COLUMN_NAMES

TARGET_TABLE = "STANDARDIZED_FOOD_DB"
ALIAS_TABLE = "FOOD_CODE_ALIASES"
NEW_COLUMNS = {
    "INGREDIENTS_TEXT": "CLOB",
    "INGREDIENTS": "CLOB",
    "COUNTRIES": "VARCHAR2(128 CHAR)",
    "DATA_SOURCES": "VARCHAR2(256 CHAR)",
    "SOURCE_IDS": "VARCHAR2(1024 CHAR)",
}
ORDS_CODE_SOURCE = """SELECT f.*
FROM STANDARDIZED_FOOD_DB f
WHERE UPPER(TRIM(f.code)) = UPPER(TRIM(:code))
UNION ALL
SELECT f.*
FROM FOOD_CODE_ALIASES a
JOIN STANDARDIZED_FOOD_DB f ON UPPER(TRIM(f.code)) = UPPER(TRIM(a.code))
WHERE UPPER(TRIM(a.alias)) = UPPER(TRIM(:code))
  AND NOT EXISTS (
      SELECT 1
      FROM STANDARDIZED_FOOD_DB direct_match
      WHERE UPPER(TRIM(direct_match.code)) = UPPER(TRIM(:code))
  )"""


def _oracle_module():
    try:
        import oracledb
    except ImportError as exc:  # pragma: no cover - depends on optional extra
        raise RuntimeError("Install the Oracle extra with: pip install '.[oracle]'") from exc
    return oracledb


def _connect_from_env():
    """Use an existing wallet, or download a temporary wallet through OCI CLI."""
    oracledb = _oracle_module()
    user = os.environ.get("ORACLE_USER", "ADMIN")
    password = os.environ.get("ORACLE_ADMIN_PASSWORD")
    dsn = os.environ.get("ORACLE_DSN")
    if not password or not dsn:
        raise RuntimeError("Set ORACLE_ADMIN_PASSWORD and ORACLE_DSN in the environment")

    wallet_dir = os.environ.get("ORACLE_WALLET_DIR")
    wallet_password = os.environ.get("ORACLE_WALLET_PASSWORD")
    temp_dir = None
    if not wallet_dir:
        adb_id = os.environ.get("OCI_AUTONOMOUS_DATABASE_ID")
        region = os.environ.get("OCI_REGION", "ca-montreal-1")
        if not adb_id:
            raise RuntimeError("Set ORACLE_WALLET_DIR or OCI_AUTONOMOUS_DATABASE_ID")
        temp_dir = tempfile.TemporaryDirectory(prefix="kiloric-oracle-wallet-")
        root = Path(temp_dir.name)
        archive = root / "wallet.zip"
        wallet_dir = str(root / "wallet")
        Path(wallet_dir).mkdir(mode=0o700)
        wallet_password = secrets.token_urlsafe(24)
        command = [
            "oci", "db", "autonomous-database", "generate-wallet",
            "--autonomous-database-id", adb_id,
            "--password", wallet_password,
            "--file", str(archive),
            "--generate-type", "SINGLE",
            "--region", region,
        ]
        result = subprocess.run(command, capture_output=True, text=True, check=False)
        if result.returncode:
            temp_dir.cleanup()
            raise RuntimeError("OCI CLI could not generate an Autonomous Database wallet")
        with zipfile.ZipFile(archive) as wallet:
            wallet.extractall(wallet_dir)
        archive.unlink(missing_ok=True)

    if not wallet_password:
        if temp_dir:
            temp_dir.cleanup()
        raise RuntimeError("Set ORACLE_WALLET_PASSWORD when ORACLE_WALLET_DIR is used")
    try:
        connection = oracledb.connect(
            user=user,
            password=password,
            dsn=dsn,
            config_dir=wallet_dir,
            wallet_location=wallet_dir,
            wallet_password=wallet_password,
        )
    except Exception:
        if temp_dir:
            temp_dir.cleanup()
        raise
    return connection, temp_dir


def _table_exists(cursor, table_name: str) -> bool:
    cursor.execute("SELECT COUNT(*) FROM user_tables WHERE table_name = :name", name=table_name)
    return cursor.fetchone()[0] > 0


def _columns(cursor, table_name: str) -> set[str]:
    cursor.execute("SELECT column_name FROM user_tab_columns WHERE table_name = :name", name=table_name)
    return {row[0] for row in cursor.fetchall()}


def _create_stage(cursor, stage: str) -> None:
    existing = _columns(cursor, TARGET_TABLE)
    expected_legacy = {name.upper() for name in COLUMN_NAMES} - set(NEW_COLUMNS)
    missing = expected_legacy - existing
    if missing:
        raise RuntimeError(f"Oracle food table is missing legacy columns: {', '.join(sorted(missing))}")
    cursor.execute(
        f"CREATE TABLE {stage} AS SELECT {', '.join(sorted(expected_legacy, key=lambda n: list(COLUMN_NAMES).index(n.lower())))} "
        f"FROM {TARGET_TABLE} WHERE 1 = 0"
    )
    cursor.execute(
        f"ALTER TABLE {stage} ADD (" + ", ".join(f"{name} {kind}" for name, kind in NEW_COLUMNS.items()) + ")"
    )
    cursor.execute(
        f"CREATE TABLE {stage}_CODES (ALIAS VARCHAR2(64 CHAR) NOT NULL, CODE VARCHAR2(64 CHAR) NOT NULL)"
    )


def _as_target_row(row: tuple, columns: tuple[str, ...]) -> tuple:
    values = list(row)
    for index, name in enumerate(columns):
        value = values[index]
        if value is None:
            continue
        if name == "updated_timestamp":
            values[index] = datetime.fromisoformat(value.replace("Z", "+00:00"))
        elif name == "trust_and_completion_score":
            values[index] = int(value)
        elif name not in {"code"} and not isinstance(value, str):
            # The pre-existing Oracle catalog stores nutrient values as text.
            values[index] = str(value)
    return tuple(values)


def _insert_batches(cursor, sql: str, rows: Iterable[tuple], size: int, label: str, connection) -> int:
    total = 0
    batch: list[tuple] = []
    for row in rows:
        batch.append(row)
        if len(batch) == size:
            cursor.executemany(sql, batch)
            connection.commit()
            total += len(batch)
            batch.clear()
            print(f"[oracle] staged {total:,} {label}", flush=True)
    if batch:
        cursor.executemany(sql, batch)
        connection.commit()
        total += len(batch)
        print(f"[oracle] staged {total:,} {label}", flush=True)
    return total


def _ensure_target_columns(cursor) -> None:
    present = _columns(cursor, TARGET_TABLE)
    for name, kind in NEW_COLUMNS.items():
        if name not in present:
            cursor.execute(f"ALTER TABLE {TARGET_TABLE} ADD ({name} {kind})")


def _merge_foods(cursor, stage: str) -> None:
    names = [name.upper() for name in COLUMN_NAMES]
    updates = ",\n".join(
        f"t.{name} = CASE WHEN s.{name} IS NOT NULL THEN s.{name} ELSE t.{name} END"
        for name in names
        if name != "CODE"
    )
    columns = ", ".join(names)
    values = ", ".join(f"s.{name}" for name in names)
    cursor.execute(
        f"MERGE INTO {TARGET_TABLE} t USING {stage} s ON (UPPER(TRIM(t.CODE)) = UPPER(TRIM(s.CODE))) "
        f"WHEN MATCHED THEN UPDATE SET {updates} "
        f"WHEN NOT MATCHED THEN INSERT ({columns}) VALUES ({values})"
    )


def _ensure_alias_table(cursor) -> None:
    if not _table_exists(cursor, ALIAS_TABLE):
        cursor.execute(
            f"CREATE TABLE {ALIAS_TABLE} (ALIAS VARCHAR2(64 CHAR) NOT NULL, CODE VARCHAR2(64 CHAR) NOT NULL, "
            "CONSTRAINT PK_FOOD_CODE_ALIAS PRIMARY KEY (ALIAS))"
        )
        return
    present = _columns(cursor, ALIAS_TABLE)
    if not {"ALIAS", "CODE"}.issubset(present):
        raise RuntimeError("FOOD_CODE_ALIASES already exists with an incompatible schema")


def _merge_aliases(connection, alias_stage: str, batch_size: int) -> int:
    """Upsert aliases in bounded set-based transactions to stay below ADB undo limits."""
    read_cursor = connection.cursor()
    write_cursor = connection.cursor()
    write_cursor.execute("ALTER SESSION DISABLE PARALLEL DML")
    chunk_size = max(batch_size, 50_000)
    read_cursor.arraysize = chunk_size
    read_cursor.execute(
        f"SELECT /*+ INDEX(s {alias_stage}_UQ) */ s.ALIAS, s.CODE "
        f"FROM {alias_stage} s ORDER BY s.ALIAS"
    )
    merge_sql = (
        f"MERGE INTO {ALIAS_TABLE} t "
        f"USING (SELECT /*+ INDEX(s {alias_stage}_UQ) */ s.ALIAS, s.CODE FROM {alias_stage} s "
        "WHERE s.ALIAS >= :1 AND s.ALIAS <= :2) s "
        "ON (t.ALIAS = s.ALIAS) "
        "WHEN MATCHED THEN UPDATE SET t.CODE = s.CODE "
        "WHEN NOT MATCHED THEN INSERT (ALIAS, CODE) VALUES (s.ALIAS, s.CODE)"
    )
    total = 0
    while batch := read_cursor.fetchmany(chunk_size):
        write_cursor.execute(merge_sql, [batch[0][0], batch[-1][0]])
        connection.commit()
        total += len(batch)
        if total % 100_000 < chunk_size:
            print(f"[oracle] merged {total:,} code aliases", flush=True)
    read_cursor.close()
    write_cursor.close()
    return total


def _create_index_if_missing(cursor, name: str, statement: str) -> None:
    cursor.execute("SELECT COUNT(*) FROM user_indexes WHERE index_name = :name", name=name)
    if cursor.fetchone()[0] == 0:
        cursor.execute(statement)


def _replace_code_handler(cursor) -> None:
    cursor.execute(
        "SELECT h.items_per_page, h.mimes_allowed, h.comments "
        "FROM user_ords_modules m "
        "JOIN user_ords_templates t ON t.module_id = m.id "
        "JOIN user_ords_handlers h ON h.template_id = t.id "
        "WHERE m.name = :module_name AND t.uri_template = :pattern AND h.method = 'GET'",
        module_name=os.environ.get("ORDS_MODULE_NAME", "oracle.calcount.taeson.co"),
        pattern=os.environ.get("ORDS_CODE_PATTERN", "code"),
    )
    handler = cursor.fetchone()
    if not handler:
        raise RuntimeError("The existing ORDS GET code handler could not be found")
    items_per_page, mimes_allowed, comments = handler
    cursor.callproc(
        "ORDS.DEFINE_HANDLER",
        [
            os.environ.get("ORDS_MODULE_NAME", "oracle.calcount.taeson.co"),
            os.environ.get("ORDS_CODE_PATTERN", "code"),
            "GET",
            "json/collection",
            ORDS_CODE_SOURCE,
            items_per_page,
            mimes_allowed,
            comments,
        ],
    )


def _finish_alias_phase(connection, stage: str, batch_size: int) -> dict[str, int]:
    alias_stage = stage + "_CODES"
    stats: dict[str, int] = {}
    with connection.cursor() as cursor:
        if not _table_exists(cursor, stage) or not _table_exists(cursor, alias_stage):
            raise RuntimeError(f"Oracle staging tables for {stage} were not found")
        _ensure_alias_table(cursor)
        stats["merged_aliases"] = _merge_aliases(connection, alias_stage, batch_size)
        cursor.execute(
            f"SELECT COUNT(*) FROM {ALIAS_TABLE} a LEFT JOIN {TARGET_TABLE} f "
            "ON UPPER(TRIM(f.CODE)) = UPPER(TRIM(a.CODE)) WHERE f.CODE IS NULL"
        )
        stats["dangling_aliases"] = cursor.fetchone()[0]
        if stats["dangling_aliases"]:
            raise RuntimeError("Some aliases point to food codes that are missing from the catalog")
        cursor.execute(f"SELECT COUNT(*) FROM {TARGET_TABLE}")
        stats["final_foods"] = cursor.fetchone()[0]
        cursor.execute(f"SELECT COUNT(*) FROM {ALIAS_TABLE}")
        stats["final_aliases"] = cursor.fetchone()[0]

        _create_index_if_missing(
            cursor,
            "IDX_FOOD_CODE_ALIAS_CI",
            f"CREATE INDEX IDX_FOOD_CODE_ALIAS_CI ON {ALIAS_TABLE} (UPPER(TRIM(ALIAS)))",
        )
        _replace_code_handler(cursor)
        connection.commit()

        cursor.execute("BEGIN CTX_DDL.SYNC_INDEX('IDX_FOOD_DB_PRODUCT_NAME'); END;")
        print("[oracle] synchronized Oracle Text fuzzy-search index", flush=True)
        cursor.execute(f"DROP TABLE {alias_stage} PURGE")
        cursor.execute(f"DROP TABLE {stage} PURGE")
        connection.commit()
    return stats


def resume_oracle_aliases(stage: str, batch_size: int = 5000) -> dict[str, int]:
    """Resume after a staged food merge has committed but alias loading failed."""
    if not re.fullmatch(r"FPSTG_[A-F0-9]{8}", stage):
        raise ValueError("--resume-stage must be an FPSTG_ stage name printed by the failed upload")
    connection, temp_dir = _connect_from_env()
    try:
        return _finish_alias_phase(connection, stage, batch_size)
    finally:
        connection.close()
        if temp_dir:
            temp_dir.cleanup()


def upload_oracle(db_path: Path, batch_size: int = 5000) -> dict[str, int]:
    """Stage, validate, then merge a built SQLite catalog into Oracle."""
    import sqlite3

    db_path = db_path.resolve()
    if not db_path.is_file():
        raise FileNotFoundError(db_path)
    check = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        integrity = check.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise RuntimeError(f"Source SQLite database failed integrity_check: {integrity}")
        foods_total = check.execute("SELECT COUNT(*) FROM foods").fetchone()[0]
        codes_total = check.execute("SELECT COUNT(*) FROM food_codes").fetchone()[0]
        if check.execute("SELECT COUNT(*) FROM foods WHERE code IS NULL OR product_name IS NULL OR trim(product_name) = ''").fetchone()[0]:
            raise RuntimeError("Source SQLite database has missing codes or product names")
        duplicate_codes = check.execute("SELECT COUNT(*) FROM (SELECT code FROM foods GROUP BY code HAVING COUNT(*) > 1)").fetchone()[0]
        if duplicate_codes:
            raise RuntimeError("Source SQLite database has duplicate food codes")
        duplicate_code_keys = check.execute(
            "SELECT COUNT(*) FROM (SELECT upper(trim(code)) FROM foods GROUP BY upper(trim(code)) HAVING COUNT(*) > 1)"
        ).fetchone()[0]
        if duplicate_code_keys:
            raise RuntimeError("Source SQLite database has codes that collide case-insensitively")
        oversized_aliases = check.execute(
            "SELECT COUNT(*) FROM food_codes WHERE length(alias) > 64 OR length(code) > 64"
        ).fetchone()[0]
        if oversized_aliases:
            raise RuntimeError("Source SQLite database contains aliases too long for the Oracle alias table")
    finally:
        check.close()

    connection, temp_dir = _connect_from_env()
    stage = "FPSTG_" + secrets.token_hex(4).upper()
    alias_stage = stage + "_CODES"
    columns = tuple(COLUMN_NAMES)
    column_sql = ", ".join(name.upper() for name in columns)
    bind_sql = ", ".join(f":{n}" for n in range(1, len(columns) + 1))
    insert_food_sql = f"INSERT INTO {stage} ({column_sql}) VALUES ({bind_sql})"
    insert_alias_sql = f"INSERT INTO {alias_stage} (ALIAS, CODE) VALUES (:1, :2)"
    stats: dict[str, int] = {"source_foods": foods_total, "source_aliases": codes_total}
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) - COUNT(DISTINCT UPPER(TRIM(CODE))) FROM STANDARDIZED_FOOD_DB")
            if cursor.fetchone()[0]:
                raise RuntimeError("Existing Oracle food codes collide case-insensitively; refusing to merge")
            _create_stage(cursor, stage)
            input_sizes = [None] * len(columns)
            oracledb = _oracle_module()
            for name in ("ingredients_text", "ingredients"):
                input_sizes[columns.index(name)] = oracledb.DB_TYPE_CLOB
            cursor.setinputsizes(*input_sizes)

            source = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
            try:
                foods = (
                    _as_target_row(row, columns)
                    for row in source.execute(f"SELECT {', '.join(columns)} FROM foods ORDER BY code")
                )
                stats["staged_foods"] = _insert_batches(cursor, insert_food_sql, foods, batch_size, "foods", connection)
                aliases = source.execute("SELECT alias, code FROM food_codes")
                stats["staged_aliases"] = _insert_batches(cursor, insert_alias_sql, aliases, batch_size, "code aliases", connection)
            finally:
                source.close()

            if stats["staged_foods"] != foods_total or stats["staged_aliases"] != codes_total:
                raise RuntimeError("Oracle staging counts did not match the validated SQLite source")
            cursor.execute(f"CREATE UNIQUE INDEX {stage}_CODE_UQ ON {stage} (CODE)")
            cursor.execute(f"CREATE UNIQUE INDEX {alias_stage}_UQ ON {alias_stage} (ALIAS)")
            _create_index_if_missing(
                cursor,
                "IDX_SFDB_CODE_CI",
                f"CREATE INDEX IDX_SFDB_CODE_CI ON {TARGET_TABLE} (UPPER(TRIM(CODE)))",
            )
            cursor.execute(
                f"SELECT COUNT(*) FROM {stage} s JOIN {TARGET_TABLE} t "
                "ON UPPER(TRIM(t.CODE)) = UPPER(TRIM(s.CODE))"
            )
            stats["matched_foods"] = cursor.fetchone()[0]
            stats["new_foods"] = foods_total - stats["matched_foods"]
            cursor.execute(f"SELECT COUNT(*) FROM {TARGET_TABLE}")
            stats["existing_foods"] = cursor.fetchone()[0]
            print("[oracle] staging validated; merging into STANDARDIZED_FOOD_DB", flush=True)

            _ensure_target_columns(cursor)
            _merge_foods(cursor, stage)
            connection.commit()

            stats.update(_finish_alias_phase(connection, stage, batch_size))
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
        if temp_dir:
            temp_dir.cleanup()
    return stats

