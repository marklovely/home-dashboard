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

## Images and media IDs

Photos live in `src/content/houseguide/media/` (JPEG/PNG/WebP). The catalog **`media`** map uses stable IDs (for example `hot-water-machine-controls`) with:

- `file` — filename in `media/` (for example `hot-water-machine-controls.jpg`)
- `alt` — accessible description

Topic blocks reference **`mediaId`**, never raw paths:

```json
{ "type": "heroImage", "mediaId": "hot-water-machine-controls", "caption": "Button layout" }
```

### Vite resolution

`src/content/houseguide/guideMedia.js` is the only media resolver. It uses:

```javascript
import.meta.glob('./media/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' });
```

The glob path is **relative to `guideMedia.js`** (`./media/`, not `../media/`). Vite emits hashed URLs under `/assets/` in production.

Call `resolveGuideMedia(mediaId)` to get `{ ok, url, alt }` or a safe failure object.

### Adding a new image

1. Add the file under `media/` with a descriptive filename stem.
2. Add a `media` entry in `guide-catalog.json` with a matching ID and alt text.
3. Reference the ID from a `heroImage` or `gallery` block.
4. Run tests — `validateGuideMediaCatalog()` checks IDs, files, alt text, and references.

### Validation

`src/content/houseguide/guideMediaValidate.js` runs in Vitest (`tests/guideMedia.test.js`) as part of `npm run check`. It reports unknown IDs, missing bundled files, missing alt text, orphan files, and broken references.
