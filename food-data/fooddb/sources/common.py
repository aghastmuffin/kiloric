from __future__ import annotations

import csv
import io
import sys
import zipfile
from typing import Iterator

csv.field_size_limit(sys.maxsize)


def zip_member(archive: zipfile.ZipFile, filename: str) -> str | None:
    """Find `filename` anywhere in the archive (releases nest files in a folder)."""
    target = filename.lower()
    for name in archive.namelist():
        if name.lower().rsplit("/", 1)[-1] == target:
            return name
    return None


def read_zip_rows(
    archive: zipfile.ZipFile, filename: str, encoding: str = "utf-8"
) -> tuple[dict[str, int], Iterator[list[str]]]:
    """Header index + raw row lists; much faster than DictReader for very large files."""
    member = zip_member(archive, filename)
    if member is None:
        return {}, iter(())
    raw = archive.open(member)
    reader = csv.reader(io.TextIOWrapper(raw, encoding=encoding, errors="replace", newline=""))
    header = next(reader, [])
    index = {name.strip().lstrip("\ufeff"): i for i, name in enumerate(header)}

    def rows() -> Iterator[list[str]]:
        try:
            yield from reader
        finally:
            raw.close()

    return index, rows()


def read_zip_csv(archive: zipfile.ZipFile, filename: str, encoding: str = "utf-8") -> Iterator[dict]:
    member = zip_member(archive, filename)
    if member is None:
        return
    with archive.open(member) as raw:
        text = io.TextIOWrapper(raw, encoding=encoding, errors="replace", newline="")
        reader = csv.DictReader(text)
        if reader.fieldnames:
            reader.fieldnames = [f.strip().lstrip("\ufeff") for f in reader.fieldnames]
        yield from reader
