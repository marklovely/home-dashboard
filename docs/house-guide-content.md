# House Guide content

## Edit the guide (normal workflow)

**File:** `src/content/houseguide/guide-catalog.json`

This is the only file you need for copy changes. The app reads it directly — no Python, no rebuild.

1. Search the JSON for the topic title (e.g. `"Scooter"`, `"Heating"`).
2. Edit text inside `"blocks"` — look for `"content"`, `"steps"`, or `"items"`.
3. Run `npm run dev` and check House Guide in the browser.
4. Commit and push; Cloudflare Pages redeploys.

A short cheat sheet lives next to the file: [`src/content/houseguide/README.md`](../src/content/houseguide/README.md).

### Validate before push

```bash
npm test -- tests/guideCatalog.test.js tests/guideMedia.test.js
```

Or the full suite: `npm run check`.

## Block types

| type | use for |
|------|---------|
| `text` | Paragraph (`content`, optional `heading`) |
| `steps` | Numbered list (`steps` array) |
| `tip` / `warning` / `note` | Callout boxes |
| `keyValues` | Label/value pairs |
| `heroImage` / `gallery` | Photos via `mediaId` |
| `place` | Local pub/walk entries |
| `protected` | Wi‑Fi, contacts, lockbox — resolved at runtime |

Full typedefs: `src/types/guideContent.js`.

## Images

Photos go in `src/content/houseguide/media/`. Register each image in the `"media"` map at the top of `guide-catalog.json`:

```json
"hot-water-machine-controls": {
  "file": "hot-water-machine-controls.jpg",
  "alt": "Button layout on the hot water machine"
}
```

Reference from a topic:

```json
{ "type": "heroImage", "mediaId": "hot-water-machine-controls", "caption": "Button layout" }
```

`guideMediaValidate.js` (run via Vitest) checks that every `mediaId` has a file and alt text.

## Private values (not in git)

Copy `private-content.example.json` → `private-content.local.json` on trusted devices. Protected blocks in the catalog use dot-path keys such as `wifi.password` and `contacts.mark.phone`.

For production tablets, plan to inject these via Cloudflare Access–protected configuration rather than committing real values.

## Legacy PDF / Python tooling (optional)

You can ignore this unless you are doing a bulk re-import from a TrustedHousesitters PDF.

- PDF (gitignored): `src/content/houseguide/source/house-guide.pdf`
- `npm run guide:extract` — dumps raw PDF text for reference
- `npm run guide:build-catalog` — regenerates JSON from `scripts/build_house_guide_catalog.py`

**Do not run `guide:build-catalog` after hand-editing JSON** — it will overwrite your changes. The Python script is maintained for historical bulk builds; day-to-day edits belong in `guide-catalog.json`.
