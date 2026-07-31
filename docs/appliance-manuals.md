# Appliance Manuals

Secure PDF appliance user guides for the Lovely Home dashboard. Owners upload and manage manuals; house sitters browse and read published guides from **House Guide → Appliance Manuals**.

## Architecture

| Layer | Choice |
|-------|--------|
| PDF storage | Private Cloudflare **R2** bucket (never public) |
| Worker binding | `APPLIANCE_GUIDES` |
| Metadata | Cloudflare **D1** (`APPLIANCE_MANUALS_DB`) |
| Object keys | Server-generated opaque paths (`guides/{uuid}.pdf`) |
| Max upload size | **15 MB** |
| Supported types | **PDF only** (MIME, extension, magic bytes) |

PDFs are **not** stored in Git, bundled in the frontend, placed in localStorage, or exposed via permanent public URLs. The Worker streams files through an authenticated endpoint.

## Authorization

Two layers apply to every request:

1. **Cloudflare Access** identity (JWT)
2. **Server-authoritative device session** cookie

| Operation | Requirements |
|-----------|----------------|
| Upload, edit, replace, publish/hide, delete | Owner Access identity + **Owner Mode** device session |
| View unpublished manual or metadata | Owner Access identity + **Owner Mode** device session |
| List published manuals | Valid Access session + any valid device session |
| View published PDF | Valid Access session + any valid device session + manual `published = true` |

House sitters receive **403 Forbidden** for management operations and for unpublished manuals. The Worker ignores client-supplied `mode`, `role`, or object keys.

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/appliance-manuals` | List metadata (owner: all; sitter: published only) |
| `GET` | `/api/appliance-manuals/:id` | Manual metadata |
| `GET` | `/api/appliance-manuals/:id/file` | Stream PDF (`Content-Disposition: inline`) |
| `POST` | `/api/appliance-manuals` | Create manual (multipart: fields + PDF) |
| `PATCH` | `/api/appliance-manuals/:id` | Update metadata |
| `PUT` | `/api/appliance-manuals/:id/file` | Replace PDF |
| `DELETE` | `/api/appliance-manuals/:id` | Delete manual and PDF |

Responses never include R2 object keys, bucket names, or storage credentials.

## Database migration

Migration file: `worker/migrations/0001_appliance_manuals.sql`

Apply locally:

```bash
cd worker
npx wrangler d1 migrations apply lovely-home-appliance-manuals --local
```

Apply to remote (Preview or Production):

```bash
cd worker
npx wrangler d1 migrations apply lovely-home-appliance-manuals --remote
```

## Cloudflare configuration

Do **not** make the R2 bucket public. Use separate buckets for Preview and Production so test uploads never overwrite live manuals.

### Preview

1. **R2 bucket** — create `lovely-home-appliance-guides-preview` (private).
2. **D1 database** — create `lovely-home-appliance-manuals-preview`.
3. In the Cloudflare dashboard (or Preview environment vars), bind:
   - `APPLIANCE_GUIDES` → preview bucket
   - `APPLIANCE_MANUALS_DB` → preview D1 database
4. Run D1 migrations against the preview database.
5. Deploy the Worker to the preview environment.

Update `worker/wrangler.toml` environment-specific overrides as needed, for example:

```toml
[env.preview]
[[env.preview.r2_buckets]]
binding = "APPLIANCE_GUIDES"
bucket_name = "lovely-home-appliance-guides-preview"

[[env.preview.d1_databases]]
binding = "APPLIANCE_MANUALS_DB"
database_name = "lovely-home-appliance-manuals-preview"
database_id = "<preview-database-id>"
```

Replace `<preview-database-id>` with the ID from `wrangler d1 list`.

### Production

1. **R2 bucket** — create `lovely-home-appliance-guides` (private).
2. **D1 database** — create `lovely-home-appliance-manuals`.
3. Bind `APPLIANCE_GUIDES` and `APPLIANCE_MANUALS_DB` on the production Worker.
4. Run D1 migrations on the production database.
5. Deploy the Worker.

The placeholder `database_id` in `wrangler.toml` must be replaced with the real production D1 ID before deploy.

## Owner workflow

1. Unlock **Owner Mode** on the tablet.
2. Open **Appliance Manuals** from the Home launcher.
3. **Add manual** — enter appliance details, choose category, upload PDF, optionally publish.
4. **Edit** metadata, **Replace PDF**, **Publish** / **Hide from House Sitters**, or **Delete** (with confirmation).
5. Use **View** to preview the uploaded guide.

Unpublished manuals remain visible to owners only.

## House sitter workflow

1. Open **House Guide** from Home or bottom navigation.
2. Choose **Appliance Manuals**.
3. Search or filter by category.
4. Tap **View Manual** to read the PDF in-app, or **Open PDF in new tab** if embedding is unavailable.

## Backup and recovery

- **D1** holds metadata (titles, publish state, opaque object keys). Back up with [D1 export/backups](https://developers.cloudflare.com/d1/reference/backups/) or periodic `wrangler d1 export`.
- **R2** holds PDF binaries. Enable [object versioning](https://developers.cloudflare.com/r2/buckets/object-lifecycle/) or replicate to a second private bucket for disaster recovery.
- If metadata exists but R2 object is missing, republish by replacing the PDF from Owner Mode.
- If R2 cleanup fails after delete, orphaned objects may remain; check Worker logs for `appliance_manual_r2_cleanup_failed` and remove orphans manually from the private bucket.

## Frontend behaviour

- Owner management UI mounts only after the server confirms **Owner Mode**.
- Switching to House Sitter Mode clears manual state, aborts in-flight requests, and closes owner dialogs.
- PDF viewing uses a blob URL from an authenticated fetch, with iframe embedding and a new-tab fallback for Fully Kiosk Browser and other limited embedders.

## Troubleshooting

### `404 Not Found` on `/api/appliance-manuals`

PR **preview deployments** (e.g. `https://<hash>.home-dashboard-a11.pages.dev`) ship the **frontend only**. API calls are proxied to the separate **`lovely-home-hub-api` Worker**. A 404 means that Worker is still running an older build **without** the appliance-manuals routes.

Fix:

1. Merge or check out the branch that includes `worker/src/routes/applianceManuals.js`.
2. Create the D1 database and private R2 bucket (see [Cloudflare configuration](#cloudflare-configuration)).
3. Put the real D1 `database_id` in `worker/wrangler.toml`.
4. Apply migrations: `npx wrangler d1 migrations apply lovely-home-appliance-manuals --remote`
5. Deploy the Worker: `cd worker && npm run deploy`

After deploy, uploads should return `201` (or `503` if bindings are missing — not `404`).

### `503` after deploy

Bindings or migrations are missing. Confirm `APPLIANCE_MANUALS_DB` and `APPLIANCE_GUIDES` appear on the Worker in the Cloudflare dashboard, and migrations have been applied.

## Limitations (v1)

- PDF files only
- No full-text search inside PDF contents
- No version history (replace overwrites the stored file)
- Sort order is assigned automatically on create; owners can adjust via API patch (`sortOrder`) — UI support may follow existing patterns
