# Bin Collection app (UI reference)

Visual reference for the polished Bin Collection app (PR #17+). Screenshots are captured from the `#/bins` route on a tablet-width viewport (~1024px), owner and house sitter modes.

## Screenshots

| File | Description |
|------|-------------|
| `docs/images/bin-collection-owner.png` | Owner mode — collection information, hero, timeline |
| `docs/images/bin-collection-house-sitter.png` | House sitter mode — same hierarchy, informative copy |

After UI changes, refresh screenshots:

1. Run `npm run dev` and open `http://localhost:5173/#/bins`.
2. Capture owner mode, then switch to house sitter in Settings and capture again.
3. Save PNGs to `docs/images/` using the filenames above.

## Layout (top to bottom)

1. **Collection information** — single block (6am, Wagtail Road location).
2. **Next collection** hero — type → date → relative time → bin line; Lucide icon and subtle council colour accent.
3. **Summary cards** — next household and next garden waste (garden card visually secondary).
4. **Upcoming collections** timeline.
5. **Missed bin** note (easthants.gov.uk).
6. **Brown bin** collapsible (accepted / not accepted with icons).
7. **Council recycling guidance ↗** — external EHDC link.

The **Home dashboard card** for Bin Collection is unchanged; only the full app view is documented here.

See also [bin-collection-maintenance.md](./bin-collection-maintenance.md) for schedule data updates.
