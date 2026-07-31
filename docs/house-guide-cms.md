# House Guide CMS

Cloud-hosted House Guide content for owners to edit in the dashboard without changing git or redeploying the frontend.

## Architecture

| Layer | Choice |
|-------|--------|
| Content metadata | **D1** (`HOUSE_GUIDE_DB` — same database as appliance manuals) |
| Uploaded photos | Private **R2** bucket (`GUIDE_MEDIA`) |
| Bundled photos | Still served from Vite assets until replaced via upload |
| Fallback | `guide-catalog.json` in git when cloud content is not seeded |

## Owner workflow

1. Open **Guide Editor** (Owner Mode).
2. First time only: **Copy current guide to cloud** — imports the bundled JSON catalog into D1.
3. Pick an area → topic → edit title, blocks, and photos.
4. **Save draft** — stores unpublished changes.
5. **Publish topic** or **Publish all changes** — makes updates visible to house sitters and guests.

### Topic visibility

Each topic can be set to **House sitters and guests** (default) or **Owner notes only**. Owner-only topics are hidden from the published catalog that sitters receive; owners still see them in the editor and in draft catalog mode.

Sitters continue using **House Guide** as before; once cloud content is seeded and published, they read from the API instead of the static JSON bundle.

## API (Owner Mode unless noted)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/house-guide/catalog` | Published catalog (sitter + owner) |
| `GET` | `/api/house-guide/catalog?draft=1` | Draft blocks for owner editor |
| `POST` | `/api/house-guide/import` | Import full catalog JSON (seed) |
| `PATCH` | `/api/house-guide/topics/:id` | Save topic draft |
| `POST` | `/api/house-guide/topics/:id/publish` | Publish one topic |
| `POST` | `/api/house-guide/publish-all` | Publish all draft topics |
| `POST` | `/api/house-guide/media` | Upload image (multipart) |
| `GET` | `/api/house-guide/media/:id/file` | Stream uploaded image |

## Cloudflare setup

1. Create R2 bucket: `lovely-home-guide-media` (private).
2. Apply D1 migration: `npx wrangler d1 migrations apply lovely-home-appliance-manuals --remote`
3. Deploy Worker: `cd worker && npm run deploy`

`HOUSE_GUIDE_DB` and `GUIDE_MEDIA` bindings are declared in `worker/wrangler.toml`.

## Block types in the editor

Paragraph, numbered steps, tips/warnings/notes, details lists, photos (pick existing or upload to R2), locations, expandable sections, and place cards. Private info blocks are preserved but not editable here.

## Migrations

After pulling updates, apply new D1 migrations:

```bash
cd worker && npx wrangler d1 migrations apply lovely-home-appliance-manuals --remote
```
