#!/usr/bin/env python3
"""Extract TrustedHousesitters house guide PDF into structured JSON and media assets."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PDF = ROOT / "src/content/houseguide/source/house-guide.pdf"
CATALOG = ROOT / "src/content/houseguide/guide-catalog.json"
MEDIA_DIR = ROOT / "src/content/houseguide/media"
EXTRACTED_TEXT = ROOT / "src/content/houseguide/source/extracted-text.json"


def main() -> int:
    if not SOURCE_PDF.is_file():
        print(f"No PDF at {SOURCE_PDF}. Add house-guide.pdf and run again.", file=sys.stderr)
        print("See src/content/houseguide/source/README.md", file=sys.stderr)
        return 1

    try:
        import pypdf  # type: ignore
    except ImportError:
        print("Install pypdf: python3 -m pip install pypdf", file=sys.stderr)
        return 1

    reader = pypdf.PdfReader(str(SOURCE_PDF))
    pages = []
    for index, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        pages.append({"page": index + 1, "text": text.strip()})

    EXTRACTED_TEXT.parent.mkdir(parents=True, exist_ok=True)
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    EXTRACTED_TEXT.write_text(json.dumps({"pages": pages}, indent=2), encoding="utf-8")

    print(f"Wrote {len(pages)} pages to {EXTRACTED_TEXT}")
    print(
        "Map extracted text and embedded images into guide-catalog.json manually or extend this script."
    )
    if CATALOG.is_file():
        print(f"Current catalog: {CATALOG}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
