# Bin collection calendar maintenance

Two different calendars can be in play. Do not mix them up.

| Who | Where dates live | How to update |
|-----|------------------|----------------|
| **Owner on a live hub** | Settings → **Bin reminders** (stored in `site_profile.binSchedule`) | Add dates, then **Save bin reminders**. No repo change. |
| **Bundled fallback** (demo / production JS until an owner configures their own list) | `src/data/binCollections/*.js` | Transcribe the new council PDF, update tests, ship a release. |

The Bins app uses the owner list whenever it has any household or garden dates. The files below are only the fallback.

## Owner: new council PDF on a live hub

1. Open the hub → Settings → Bin reminders.
2. Under **Add collection dates**, enter the first date from the PDF and the bin type.
3. Set **Repeat** to the council pattern (often every 2 weeks) and **Repeat until** the last date on the PDF.
4. Tap **Add dates to list**. Repeat for rubbish, recycling, and garden waste.
5. Tap **Save bin reminders** at the bottom. The list is a draft until you save.

If the Bins app still shows an out-of-date calendar, confirm the new dates are in the list and that you saved. A leftover **Schedule valid until** from last year no longer hides dates that are still ahead — that field extends automatically when later dates are added.

You can skip the setup-wizard bins step and come back here later.

## Developer: bundled fallback PDFs

When East Hampshire District Council publishes new PDF calendars, update the static files in the repo. The dashboard does **not** fetch council pages at runtime.

| File | Contents |
|------|----------|
| `src/data/binCollections/householdCollections.js` | Calendar **17** — each `{ date, type, bankHolidayChange }` for rubbish and recycling |
| `src/data/binCollections/gardenWasteCollections.js` | Round **G2** — each `{ date }` for garden waste |
| `src/data/binCollections/collectionTypes.js` | Display names, bin descriptions, icons (only if council labels change) |
| `tests/binCollection.test.js` | Adjust expected **counts** and spot-check dates after transcription |

Also update `validFrom` / `validUntil` in the `*ScheduleMeta` exports when the PDF period changes.

### Authoritative sources

1. **Household** — Norse / EHDC household calendar PDF (e.g. `norse_17_0925.pdf`). Normal collection day is **Friday**. Rows alternate **rubbish** (green) and **recycling & glass** (grey). **Yellow** entries are bank-holiday changes — keep the printed weekday and `bankHolidayChange: true`. Do not move altered dates back to Friday.
2. **Garden waste** — Round **G2** PDF (e.g. `G02_1025.pdf`). Fortnightly **Tuesdays**. Garden waste may fall on a different day from household collections.

### Transcription checklist

1. Extract every date from the PDF (visual calendar or text), not from an alternating-week formula.
2. Store dates as ISO strings `YYYY-MM-DD` (UK local calendar dates).
3. Set `type` to `rubbish` or `recycling` for household entries; garden entries live only in `gardenWasteCollections.js`.
4. Run `npm run check` — tests assert event counts and the four known January/December bank-holiday dates.
5. Open the Bin Collection app and confirm the **next** collection and **upcoming** list against the PDF.

## Schedule expiry

The Bins app hides the timeline only when **there are no collection dates left on or after today**. A `validUntil` in the past does **not** hide dates that are still ahead (that used to be the bug on production when an owner added a new year but left last year’s end date in Settings).

For the bundled fallback, when today is after both the last transcribed date and `validUntil`, the UI asks the owner to add dates in Bin reminders. It does not point at this file on the tablet.

## Architecture reference

See [architecture.md](./architecture.md) — **Bin collection** section for service API and date-only rules.
