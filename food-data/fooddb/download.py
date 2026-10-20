"""Cached, resumable downloads of the upstream datasets."""

from __future__ import annotations

import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

USER_AGENT = "CalCount-FoodDB/1.0 (https://github.com/taesonco/calcount)"

FDC_BASE = "https://fdc.nal.usda.gov/fdc-datasets/"
FDC_DOWNLOAD_PAGE = "https://fdc.nal.usda.gov/download-datasets"
FDC_DATASET_SLUGS = {
    "foundation": "foundation_food",
    "sr_legacy": "sr_legacy_food",
    "survey": "survey_food",
    "branded": "branded_food",
}
# Used when the download page can't be scraped (offline mirror, layout change).
FDC_FALLBACK_FILES = {
    "foundation": "FoodData_Central_foundation_food_csv_2026-04-30.zip",
    "sr_legacy": "FoodData_Central_sr_legacy_food_csv_2018-04.zip",
    "survey": "FoodData_Central_survey_food_csv_2024-10-31.zip",
    "branded": "FoodData_Central_branded_food_csv_2026-04-30.zip",
}

CNF_URL = (
    "https://www.canada.ca/content/dam/hc-sc/migration/hc-sc/fn-an/alt_formats/zip/"
    "nutrition/fiche-nutri-data/cnf-fcen-csv.zip"
)
OFF_URL = "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz"


def log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def _open(url: str, headers: dict | None = None, timeout: int = 60):
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, **(headers or {})})
    return urllib.request.urlopen(request, timeout=timeout)


def latest_fdc_files(page_html: str | None = None) -> dict[str, str]:
    """Newest CSV zip per FoodData Central dataset, from the public download page."""
    if page_html is None:
        try:
            with _open(FDC_DOWNLOAD_PAGE) as response:
                page_html = response.read().decode("utf-8", "replace")
        except (urllib.error.URLError, TimeoutError) as err:
            log(f"[download] could not read {FDC_DOWNLOAD_PAGE} ({err}); using known releases")
            return dict(FDC_FALLBACK_FILES)

    found = dict(FDC_FALLBACK_FILES)
    for dataset, slug in FDC_DATASET_SLUGS.items():
        pattern = rf"FoodData_Central_{slug}_csv_(\d{{4}}-\d{{2}}(?:-\d{{2}})?)\.zip"
        releases = sorted(set(re.findall(pattern, page_html)))
        if releases:
            found[dataset] = f"FoodData_Central_{slug}_csv_{releases[-1]}.zip"
    return found


def download(url: str, dest: Path, *, refresh: bool = False, retries: int = 4) -> Path:
    """Download `url` to `dest`, resuming partial files and skipping complete ones."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and not refresh:
        return dest

    part = dest.with_name(dest.name + ".part")
    delay = 4
    for attempt in range(retries + 1):
        offset = part.stat().st_size if part.exists() else 0
        headers = {"Range": f"bytes={offset}-"} if offset else {}
        try:
            with _open(url, headers=headers, timeout=120) as response:
                if offset and response.status != 206:
                    offset = 0
                total = response.headers.get("Content-Length")
                total_bytes = int(total) + offset if total else None
                mode = "ab" if offset else "wb"
                log(f"[download] {url} -> {dest.name}" + (f" (resuming at {offset >> 20} MB)" if offset else ""))
                _stream(response, part, mode, offset, total_bytes)
            os.replace(part, dest)
            return dest
        except (urllib.error.URLError, TimeoutError, ConnectionError) as err:
            if isinstance(err, urllib.error.HTTPError) and err.code == 416:
                os.replace(part, dest)
                return dest
            if attempt == retries:
                raise
            log(f"[download] {dest.name}: {err}; retrying in {delay}s")
            time.sleep(delay)
            delay *= 2
    raise RuntimeError("unreachable")


def _stream(response, part: Path, mode: str, offset: int, total: int | None) -> None:
    done = offset
    next_report = done + (64 << 20)
    with open(part, mode) as out:
        while True:
            chunk = response.read(1 << 20)
            if not chunk:
                break
            out.write(chunk)
            done += len(chunk)
            if done >= next_report:
                pct = f" ({done * 100 // total}%)" if total else ""
                log(f"[download]   {part.name[:-5]}: {done >> 20} MB{pct}")
                next_report = done + (64 << 20)
