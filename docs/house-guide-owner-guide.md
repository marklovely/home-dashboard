# House Guide — Owner's handbook

> **In the dashboard:** open **Guide Editor** → **Writing guide** for the integrated help system (searchable, always available while you edit).

This file mirrors that content for reading in git or offline. For technical deployment and API details, see [house-guide-cms.md](./house-guide-cms.md).

---

## What you are building

The **House Guide** is a structured manual for living in your home: rooms, appliances, Scooter, Wi‑Fi, emergency info, and local tips. Sitters open it on the wall tablet under **House Guide** (or via deep links such as `#/house-guide/topic/scooter-bedtime`).

You do **not** edit one long document. Instead, content is organised in layers:

```text
Guide (one home)
 └── Areas (categories)     e.g. Kitchen, Scooter, Emergency
      └── Topics (pages)    e.g. Dishwasher, Feeding, Fuse box
           └── Blocks       paragraphs, steps, photos, tips…
           └── Quick actions optional buttons (Alexa, links, info panels)
```

**Theory:** each **topic** is one answer to one question (“How do I use the dishwasher?”, “What is Scooter’s bedtime routine?”). **Blocks** are reusable building blocks with fixed shapes (paragraph, steps, warning, photo). The app knows how to display each block type consistently on a tablet — large type, clear callouts, tappable photos.

This is intentional. Structured blocks keep sitter pages scannable and accessible. They also let search, Scooter companion sections, and Emergency cards pull the right topic without parsing free‑form prose.

---

## Where content lives

| What | Where |
|------|--------|
| **Your live edits** | Cloudflare **D1** database (via the Worker API) |
| **Photos you upload** | Private **R2** storage |
| **Bundled photos** | Shipped with the app from git (legacy originals) |
| **Fallback copy** | `guide-catalog.json` in git — used only if cloud is empty or unreachable |
| **Secrets** (Wi‑Fi password, etc.) | **Not** in the CMS — separate private config |

**Normal workflow:** edit in **Guide Editor** → **Save draft** → **Publish**. Sitters see published content on the next load. You never need to commit JSON or redeploy the frontend for text or photo changes.

**First time only:** open Guide Editor and tap **Copy current guide to cloud** to import the bundled catalog into D1.

---

## Draft vs publish

Think of this like “save privately” vs “go live”.

| Action | Who sees it |
|--------|-------------|
| **Save draft** | You, in Guide Editor (draft mode) |
| **Publish topic** | House sitters and guests in **House Guide** |
| **Publish all changes** | Every topic that still has unpublished edits |

The toolbar shows how many unpublished changes exist. Topics with drafts show a **Draft** label in the topic list.

**Important:** saving without publishing is safe for experimenting. Sitters always receive the **last published** version of each topic.

---

## Opening Guide Editor

1. Unlock **Owner Mode** on the tablet (PIN if in guest mode).
2. Open **Guide Editor** from the home screen.
3. Pick an **area** (category), then a **topic**, or create a new one.

You can also change **Guide intro text** (collapsed section at the top) — the title and subtitle on the House Guide home screen.

---

## Writing a topic — recommended order

1. **Title & subtitle** — what sitters see in lists and search results. Keep subtitles short (“Evening routine · Upstairs”).
2. **Summary** — one or two sentences; used in cards and search.
3. **Audience** — **House sitters and guests** (default) or **Owner notes only** (hidden from sitters).
4. **Blocks** — the main instructions (see below).
5. **Search keywords** — extra words sitters might type (“Netflix”, “bo kettle”, “bins”).
6. **Appliance manual links** — names that match published appliance manuals (optional).
7. **Quick actions** — buttons at the bottom of the page (Alexa routines, jump to another topic, info panel).
8. **Save draft**, preview mentally, then **Publish topic**.

### Topic IDs

When creating a topic, choose a short id: letters, numbers, hyphens (e.g. `bin-day`, `scooter-bedtime`). IDs are used in URLs and links; they cannot be changed easily after creation, so pick something stable.

---

## Block types — when to use what

Use the **Add block** dropdown at the bottom of the topic editor.

| Block | Use for | Sitter sees |
|-------|---------|-------------|
| **Paragraph** | Normal explanation. Optional heading. | Heading + body text |
| **Numbered steps** | Sequences (“Each meal”, “Before you leave”) | Ordered list |
| **Tip** | Helpful hint (green-style callout) | Highlighted box |
| **Warning** | Safety, roads, don’t-do-this | Strong callout |
| **Note** | Neutral aside | Callout |
| **Details list** | Label + value pairs (breed, model, program number) | Definition list |
| **Contacts** | Names, numbers; optional `tel:` / `mailto:` links | Tappable phone/email where set |
| **Photo** | One hero image with caption | Large image, tap to enlarge |
| **Location** | “Where is the stop tap?” | Heading + text |
| **Expandable section** | Extra detail sitters can open if needed | `<details>` toggle |
| **Place** | Pub, walk, vet — name, address, dog-friendly flag | Place card |

**Not editable in Guide Editor:** **Private info** blocks (Wi‑Fi, lockbox codes). These remain in secure private configuration; existing blocks are preserved if you save a topic that already had them.

### Writing tips for blocks

- **One idea per block** — split long walls of text into paragraph + steps + tip.
- **Steps for procedures** — dishwasher, heating, bedtime routine, TV input.
- **Warnings for consequences** — roads, lead, fuse box, water stop tap.
- **Photos for “which button?”** — remote, fuse box, machine panel. Upload a clear, well-lit photo; write alt text as if describing it to someone on the phone.
- **Short headings** — sitters skim on a tablet arm’s length away.

---

## Photos

### Inside a topic (Photo block)

1. Add a **Photo** block.
2. Prefer **Upload photo** — file is stored in cloud and attached automatically.
3. Or expand **Choose existing** to pick from the library.
4. Fill **Alt text** (required for accessibility) and optional **Caption**.

### Photo library (toolbar)

**Photo library** lists all images — bundled originals and your uploads.

- **Replace** — swap the file for an uploaded photo (same id, new image).
- **Delete** — removes uploaded photos from cloud. Topics still pointing at that id will show “Image unavailable” until you pick another.

Bundled photos from the original import are **read-only** in the library.

---

## Quick actions

Buttons at the bottom of a topic page in House Guide.

| Type | Purpose | Example |
|------|---------|---------|
| **Alexa routine** | Fires a Virtual Button by number | “Bedtime” → button 2 |
| **Open another topic** | Jumps to a different guide page | “Feeding guide” |
| **Info panel** | Small overlay with extra label/value rows | Treat rules, phone list |

Each action needs a **button label** sitters will tap. Save draft, then publish — quick actions only appear in **House Guide** after publish (not in Guide Editor preview alone).

Validation errors (e.g. missing topic id on a navigate action) are shown before save/publish.

---

## Search

Sitters search from the House Guide home screen. A topic matches if the query appears in:

- Title, subtitle, summary
- **Search keywords** you add in the editor
- Text inside blocks (published content)

Add keywords for **synonyms and brand names** sitters might use but you did not put in the title: `Netflix`, `kettle`, `Alexa`, `bbq`, `charger`.

---

## Owner-only topics

Set **Audience** to **Owner notes only** for internal reminders you do not want on the sitter tablet. These topics:

- Appear in Guide Editor for you
- Are **excluded** from the published catalog sitters receive
- Do not appear in sitter search

Use sparingly — most operational content should be **guest** audience so sitters are not forced to call you.

---

## Topic management

- **Create** — form at the bottom of an area’s topic list. New topics start **unpublished**.
- **Reorder** — drag topics in the list (or use drag handles) to change order within an area.
- **Delete** — bottom of topic editor; permanent after confirm.

---

## Appliance manuals

In **Appliance manual links**, enter names that match **published** manuals in the Appliance Manuals feature. Matching names become links on the sitter topic page. Names must match exactly what sitters see in the manuals list.

---

## What sitters see vs what you see

| Feature | Owner (Guide Editor) | Sitter (House Guide) |
|---------|----------------------|----------------------|
| Draft edits | Yes | No |
| Owner-only topics | Yes | No |
| Published guest topics | Yes | Yes |
| Quick actions | After publish | Yes |
| Private info values | If configured on device | Resolved at runtime |

Use **Owner / Guest** switcher in the header (home deployment) to preview the guest home and app set without handing over the tablet.

---

## Deep links

You can link directly to a topic:

```text
https://your-dashboard.pages.dev/#/house-guide/topic/scooter-bedtime
```

Emergency cards and in-guide “open another topic” actions use the same routing. Useful for messages to sitters: “Open this link on the tablet.”

---

## Offline behaviour

After sitters have opened House Guide online once, the service worker caches the **published catalog** and **uploaded photos** for offline reading. Bundled JSON/images still work as a fallback if the API is down. Edits you publish require connectivity to reach the tablet until the next successful sync.

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| Sitters still see old text | Did you **Publish**? Hard-refresh or wake tablet from screensaver. |
| Photo shows “Image unavailable” | Photo block has empty or deleted `mediaId` — re-upload or pick from library. |
| Quick action does nothing | Publish topic; confirm Alexa button number matches **Controls** app. |
| Search does not find topic | Add **Search keywords**; publish. |
| “Copy to cloud” needed again | Rare — usually only on a fresh environment without D1 seed. |
| API errors on reorder/upload | Worker may need deploy — see [house-guide-cms.md](./house-guide-cms.md). |

---

## Text, emojis, and formatting today

The editor is **plain text only**:

- All fields are `<textarea>` / `<input>` — no bold buttons, no font picker, no WYSIWYG.
- Content is stored as strings and displayed with `textContent` (HTML is **not** interpreted — pasted markup appears as literal characters).
- **Line breaks** in a single paragraph field appear as one block of text unless you split into separate blocks or use **Numbered steps** / **Details list**.

### Emojis today

**Unicode emojis work** if you paste or type them directly into any text field (title, steps, tips, button labels): 🐕 ✅ ⚠️ 📺. They render on sitter tablets like normal characters.

There is **no emoji picker** in the app yet. Use your system emoji keyboard on the device you edit from, or copy/paste.

**Use emojis sparingly** — one per heading or callout is enough. Screen readers read emoji names; warnings are clearer as **Warning** blocks than as emoji alone.

---

## Rich text — directions to consider

If you want more expressive editing later, these are the main options (not built yet — for planning):

### Option 1 — Lightweight Markdown (recommended direction)

Allow a small subset in paragraph/callout fields:

- `**bold**`, `*italic*`, `[link text](url)`
- Optional `-` bullet lines inside a paragraph block

**Pros:** Fast to type, stores plain strings, easy to sanitize, works with emoji.  
**Cons:** Owners must learn minimal syntax (or we add toolbar buttons that insert markers).

### Option 2 — Structured inline styles (no free HTML)

Store content as `[{ t: "text", bold: true }, { t: "🐕" }]` instead of raw HTML.

**Pros:** Safe, predictable rendering.  
**Cons:** More complex editor UI and migration from existing strings.

### Option 3 — Full rich text (contenteditable / ProseMirror / TipTap)

WYSIWYG bold, lists, links, emoji picker.

**Pros:** Familiar Word-like experience.  
**Cons:** Harder on tablets, paste-from-Word mess, security sanitisation, harder to keep block-based layout consistent.

### Option 4 — Emoji picker only (smallest step)

Keep plain text; add a button that inserts emoji at the cursor in text fields.

**Pros:** Quick win, no rendering changes.  
**Cons:** Still no bold/links.

### Recommendation

Stay **block-based** for layout (steps, warnings, photos). Add **Markdown-lite + emoji picker** inside text fields first — best balance for a tablet-edited home manual. Avoid full HTML or paste-rich-word unless you need it.

If you want to pursue this, a sensible phase would be:

1. Emoji picker on titles, steps, tips, action labels  
2. Markdown rendering for `text` / `tip` / `warning` / `note` / `collapsible` only  
3. Link validation and “open in new tab” for external URLs  

---

## Related docs

- [house-guide-cms.md](./house-guide-cms.md) — architecture, API, Cloudflare setup  
- [house-guide-content.md](./house-guide-content.md) — legacy git/JSON workflow (fallback)  
- [appliance-manuals.md](./appliance-manuals.md) — PDF manuals for appliances  

---

## Quick reference — owner checklist

- [ ] Cloud guide seeded (**Copy current guide to cloud** once)  
- [ ] Edit in **Guide Editor**, not git, for day-to-day changes  
- [ ] **Save draft** while working; **Publish** when sitters should see it  
- [ ] Use **steps** + **warnings** + **photos** for how-to content  
- [ ] Add **search keywords** for how sitters actually ask  
- [ ] Upload photos with clear **alt text**  
- [ ] Test as sitter: **Guest** view + **House Guide** app  
- [ ] Emojis OK as unicode; no bold/italic until rich text is added  
