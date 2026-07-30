# House Guide — editing content

**Edit this file:** [`guide-catalog.json`](./guide-catalog.json)

That JSON is what the dashboard loads. No Python, no build step for text changes.

## Quick workflow

1. Open `guide-catalog.json` and find the section you want (search for a title, e.g. `"Scooter"` or `"Feeding"`).
2. Change the text in `blocks` — usually `"content"` on a line, or items in `"steps"`.
3. Save, then check locally: `npm run dev` and open House Guide on the tablet or browser.
4. Commit and push — Cloudflare Pages deploys automatically.

To sanity-check before push: `npm test -- tests/guideCatalog.test.js tests/guideMedia.test.js`

## Block types (copy/paste patterns)

**Paragraph**

```json
{ "type": "text", "content": "Your text here." }
```

**Numbered steps**

```json
{
  "type": "steps",
  "heading": "Each meal",
  "steps": ["Step one", "Step two"]
}
```

**Tip / warning / note**

```json
{ "type": "tip", "content": "Helpful hint." }
{ "type": "warning", "heading": "Near roads", "content": "Use a lead." }
```

**Label + value list**

```json
{
  "type": "keyValues",
  "items": [{ "label": "Breed", "value": "Jack Russell Terrier" }]
}
```

**Photo** (file must exist in `media/` — see below)

```json
{ "type": "heroImage", "mediaId": "fuse-box", "caption": "Optional caption" }
```

## Adding a photo

1. Drop the image in [`media/`](./media/) (jpg/png/webp).
2. Add an entry at the top of `guide-catalog.json` under `"media"`:

```json
"my-photo-id": {
  "file": "my-photo.jpg",
  "alt": "Short description for accessibility"
}
```

3. Reference `"mediaId": "my-photo-id"` in a topic block.

## Wi‑Fi, phone numbers, lockbox codes

Never put real secrets in `guide-catalog.json`. Use a **protected** block:

```json
{
  "type": "protected",
  "kind": "wifi",
  "label": "Wi‑Fi password",
  "key": "wifi.password"
}
```

Values live in `private-content.local.json` (copy from `private-content.example.json`) on trusted devices only — that file is gitignored.

## Need more detail?

See [`docs/house-guide-content.md`](../../../docs/house-guide-content.md).

The Python scripts under `scripts/` are optional legacy tooling — you can ignore them for everyday edits.
