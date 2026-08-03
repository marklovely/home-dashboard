# Bin collection calendar maintenance

When East Hampshire District Council publishes new PDF calendars, update the static schedule files in the repo. The dashboard does **not** fetch council pages at runtime.

## Files to update

| File | Contents |
|------|----------|
| `src/data/binCollections/householdCollections.js` | Calendar **17** — each `{ date, type, bankHolidayChange }` for rubbish and recycling |
| `src/data/binCollections/gardenWasteCollections.js` | Round **G2** — each `{ date }` for garden waste |
| `src/data/binCollections/collectionTypes.js` | Display names, bin descriptions, icons (only if council labels change) |
| `tests/binCollection.test.js` | Adjust expected **counts** and spot-check dates after transcription |

Also update `validFrom` / `validUntil` in the `*ScheduleMeta` exports when the PDF period changes.

## Authoritative sources

1. **Household** — Norse / EHDC household calendar PDF (e.g. `norse_17_0925.pdf`). Normal collection day is **Friday**. Rows alternate **rubbish** (green) and **recycling & glass** (grey). **Yellow** entries are bank-holiday changes — keep the printed weekday and `bankHolidayChange: true`. Do not move altered dates back to Friday.
2. **Garden waste** — Round **G2** PDF (e.g. `G02_1025.pdf`). Fortnightly **Tuesdays**. Garden waste may fall on a different day from household collections.

## Transcription checklist

1. Extract every date from the PDF (visual calendar or text), not from an alternating-week formula.
2. Store dates as ISO strings `YYYY-MM-DD` (UK local calendar dates).
3. Set `type` to `rubbish` or `recycling` for household entries; garden entries live only in `gardenWasteCollections.js`.
4. Run `npm run check` — tests assert event counts and the four known January/December bank-holiday dates.
5. Open the Bin Collection app and confirm the **next** collection and **upcoming** list against the PDF.

**Owner self-service:** Hub setup wizard → **Bin collections** step (or Settings → Open setup wizard). Add each date manually — no command line required. Dates are stored in `site_profile.binSchedule` on the hub. Bundled JS files in this repo remain the fallback until an owner configures their schedule.

## Schedule expiry

When `asOf` is after `validUntil` (currently `2026-10-31`), the UI shows **A newer collection calendar is needed** and does not generate future dates. Replace the data files above; no Worker or API change is required unless you choose to host schedules remotely later.

## Architecture reference

See [architecture.md](./architecture.md) — **Bin collection** section for service API and date-only rules.
