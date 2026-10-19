"""Write the condensed foods to SQLite and, optionally, a portable `.sql` script."""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Iterable, TextIO

from .schema import COLUMNS, COLUMN_NAMES, INT, REAL

SQLITE_TYPES = {"text": "TEXT", "real": "REAL", "int": "INTEGER"}

TEXT_INDEXES = ("product_name", "brands")


def create_sqlite(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    for suffix in ("", "-journal", "-wal", "-shm"):
        candidate = Path(str(path) + suffix)
        if candidate.exists():
            candidate.unlink()
    db = sqlite3.connect(path)
    db.executescript("PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF;")
    columns = ",\n  ".join(
        f"{c.name} {SQLITE_TYPES[c.kind]}" + (" PRIMARY KEY" if c.name == "code" else "")
        + (" NOT NULL" if c.name == "product_name" else "")
        for c in COLUMNS
    )
    db.executescript(
        f"""
        CREATE TABLE foods (
          {columns}
        );
        CREATE TABLE food_codes (
          alias TEXT PRIMARY KEY,
          code TEXT NOT NULL REFERENCES foods (code)
        );
        CREATE TABLE build_info (
          key TEXT PRIMARY KEY,
          value TEXT
        );
        """
    )
    return db


class SqliteWriter:
    def __init__(self, path: Path, batch: int = 5000):
        self.db = create_sqlite(path)
        self.batch = batch
        self.rows: list[tuple] = []
        self.aliases: list[tuple[str, str]] = []
        self.self_aliases: list[tuple[str, str]] = []
        self.used_codes: set[str] = set()
        self.count = 0
        placeholders = ", ".join("?" for _ in COLUMN_NAMES)
        self.insert_sql = f"INSERT INTO foods ({', '.join(COLUMN_NAMES)}) VALUES ({placeholders})"

    def add(self, row: dict, aliases: Iterable[str]) -> str:
        code = row["code"]
        if code in self.used_codes:
            n = 2
            while f"{code}-{n}" in self.used_codes:
                n += 1
            code = row["code"] = f"{code}-{n}"
        self.used_codes.add(code)
        self.rows.append(tuple(row.get(name) for name in COLUMN_NAMES))
        self.self_aliases.append((code, code))
        self.aliases.extend((alias, code) for alias in aliases if alias != code)
        self.count += 1
        if len(self.rows) >= self.batch:
            self.flush()
        return code

    def flush(self) -> None:
        if self.rows:
            self.db.executemany(self.insert_sql, self.rows)
            self.rows.clear()
        if self.aliases:
            self.db.executemany("INSERT OR IGNORE INTO food_codes VALUES (?, ?)", self.aliases)
            self.aliases.clear()
        if self.self_aliases:
            self.db.executemany("INSERT OR REPLACE INTO food_codes VALUES (?, ?)", self.self_aliases)
            self.self_aliases.clear()

    def finish(self, info: dict[str, str], fts: bool = True) -> None:
        self.flush()
        self.db.executemany("INSERT OR REPLACE INTO build_info VALUES (?, ?)", sorted(info.items()))
        for column in TEXT_INDEXES:
            self.db.execute(f"CREATE INDEX foods_{column} ON foods ({column} COLLATE NOCASE)")
        self.db.execute("CREATE INDEX food_codes_code ON food_codes (code)")
        if fts:
            self.db.executescript(
                """
                CREATE VIRTUAL TABLE foods_fts USING fts5(
                  product_name, brands, categories,
                  content = 'foods', content_rowid = 'rowid', tokenize = 'unicode61 remove_diacritics 2'
                );
                INSERT INTO foods_fts (foods_fts) VALUES ('rebuild');
                """
            )
        self.db.commit()
        self.db.execute("ANALYZE")
        self.db.commit()
        self.db.close()


# --- portable SQL script ----------------------------------------------------

DIALECT_TYPES = {
    "sqlite": {"text": lambda n: "TEXT", "real": "REAL", "int": "INTEGER"},
    "postgres": {"text": lambda n: f"VARCHAR({n})" if n else "TEXT", "real": "DOUBLE PRECISION", "int": "INTEGER"},
    "oracle": {
        "text": lambda n: f"VARCHAR2({n} CHAR)" if n and n <= 1024 else "CLOB",
        "real": "BINARY_DOUBLE",
        "int": "NUMBER(10)",
    },
}
DIALECTS = tuple(DIALECT_TYPES)
ORACLE_CLOB_CHUNK = 1000
ORACLE_INSERT_ALL_MAX_COLUMNS = 999


def _type(dialect: str, column) -> str:
    mapping = DIALECT_TYPES[dialect]
    if column.kind == "text":
        return mapping["text"](column.max_len)
    return mapping[column.kind]


def _literal(value, kind: str, dialect: str) -> str:
    if value is None:
        return "NULL"
    if kind == INT:
        return str(int(value))
    if kind == REAL:
        text = repr(float(value))
        return f"{text}d" if dialect == "oracle" else text
    text = str(value)
    if kind == "clob" and len(text) > ORACLE_CLOB_CHUNK:
        # Oracle string literals max out at 4000 bytes; 1000 chars is safe for any UTF-8.
        pieces = (text[i:i + ORACLE_CLOB_CHUNK] for i in range(0, len(text), ORACLE_CLOB_CHUNK))
        return " || ".join("TO_CLOB('" + p.replace("'", "''") + "')" for p in pieces)
    return "'" + text.replace("'", "''") + "'"


def write_sql_dump(db_path: Path, out_path: Path, dialect: str = "sqlite", batch: int = 500) -> int:
    """Re-export the SQLite build as a `.sql` script (CREATE TABLE + INSERTs)."""
    if dialect not in DIALECT_TYPES:
        raise ValueError(f"unknown dialect {dialect!r}; choose from {', '.join(DIALECTS)}")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    src = sqlite3.connect(db_path)
    kinds = ["clob" if _type(dialect, c) == "CLOB" else c.kind for c in COLUMNS]
    count = 0
    with open(out_path, "w", encoding="utf-8", newline="\n") as out:
        _write_header(out, dialect)
        rows = src.execute(f"SELECT {', '.join(COLUMN_NAMES)} FROM foods ORDER BY code")
        count = _write_inserts(out, dialect, "foods", COLUMN_NAMES, kinds, rows, batch)
        aliases = src.execute("SELECT alias, code FROM food_codes ORDER BY alias")
        _write_inserts(out, dialect, "food_codes", ("alias", "code"), ["text", "text"], aliases, batch)
        info = src.execute("SELECT key, value FROM build_info ORDER BY key")
        _write_inserts(out, dialect, "build_info", ("key", "value"), ["text", "text"], info, batch)
        _write_footer(out, dialect)
    src.close()
    return count


def _write_header(out: TextIO, dialect: str) -> None:
    out.write("-- CalCount food database export (generated by food-data/fooddb). Units: see food-data/README.md\n")
    if dialect == "oracle":
        out.write("SET DEFINE OFF;\n")
    elif dialect == "sqlite":
        out.write("PRAGMA foreign_keys = OFF;\n")
    out.write("BEGIN;\n" if dialect != "oracle" else "")
    columns = ",\n  ".join(
        f"{c.name} {_type(dialect, c)}"
        + (" PRIMARY KEY" if c.name == "code" else "")
        + (" NOT NULL" if c.name == "product_name" else "")
        for c in COLUMNS
    )
    code_type = _type(dialect, COLUMNS[0])
    out.write(f"CREATE TABLE foods (\n  {columns}\n);\n")
    out.write(
        f"CREATE TABLE food_codes (\n  alias {code_type} PRIMARY KEY,\n  code {code_type} NOT NULL REFERENCES foods (code)\n);\n"
    )
    key_type = "VARCHAR2(64 CHAR)" if dialect == "oracle" else ("VARCHAR(64)" if dialect == "postgres" else "TEXT")
    value_type = "VARCHAR2(1000 CHAR)" if dialect == "oracle" else "TEXT"
    out.write(f"CREATE TABLE build_info (\n  key {key_type} PRIMARY KEY,\n  value {value_type}\n);\n")


def _write_footer(out: TextIO, dialect: str) -> None:
    out.write("CREATE INDEX foods_product_name ON foods (product_name);\n")
    out.write("CREATE INDEX foods_brands ON foods (brands);\n")
    out.write("CREATE INDEX food_codes_code ON food_codes (code);\n")
    out.write("COMMIT;\n")


def _write_inserts(out: TextIO, dialect: str, table: str, names, kinds, rows, batch: int) -> int:
    column_list = ", ".join(names)
    count = 0
    since_commit = 0
    pending: list[str] = []
    if dialect == "oracle":
        # INSERT ALL accepts at most 999 columns across all of its INTO clauses.
        batch = max(1, min(batch, ORACLE_INSERT_ALL_MAX_COLUMNS // len(names)))

    def flush() -> None:
        if not pending:
            return
        if dialect == "oracle":
            out.write("INSERT ALL\n")
            for values in pending:
                out.write(f"  INTO {table} ({column_list}) VALUES ({values})\n")
            out.write("SELECT 1 FROM DUAL;\n")
        else:
            out.write(f"INSERT INTO {table} ({column_list}) VALUES\n  (")
            out.write("),\n  (".join(pending))
            out.write(");\n")
        pending.clear()

    for row in rows:
        pending.append(", ".join(_literal(v, k, dialect) for v, k in zip(row, kinds)))
        count += 1
        if len(pending) >= batch:
            since_commit += len(pending)
            flush()
            if dialect == "oracle" and since_commit >= 10000:
                out.write("COMMIT;\n")
                since_commit = 0
    flush()
    return count
