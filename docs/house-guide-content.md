# House Guide content

## Source PDF

Place the TrustedHousesitters guide at `source/house-guide.pdf` (gitignored). The app never loads the PDF.

## Build catalog

After updating the PDF or extraction text:

```bash
python3 -m venv .venv-guide
.venv-guide/bin/pip install pypdf pymupdf
npm run guide:build-catalog
```

This writes `guide-catalog.json` from `source/extracted-text.txt` (also gitignored when generated from PDF).

## Private values

Copy `private-content.example.json` to `private-content.local.json` (gitignored) on trusted devices. Protected blocks in the catalog resolve keys such as `wifi.password` and `contacts.mark.phone`.

For production, plan to inject these via Cloudflare Access–protected configuration rather than committing real values.

## Images

Contextual photos live in `media/` as JPEG. Re-extract from the PDF when the source changes; map filenames in the catalog `media` section.
