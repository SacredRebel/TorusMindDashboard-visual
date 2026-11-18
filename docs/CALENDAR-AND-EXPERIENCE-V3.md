# Torus Mind & Medicine — Experience V3

**Design contract:** This is an additive refinement of the approved Torus dashboard. The previous torus, mandala, brand artwork, moss/gold palette, structure, navigation, API model, and business workflow remain. No rewrite or React migration.

**Rollback point:** `backup/pre-calendar-pipeline-theme-2026-11-17` at `2cc6a53df3bd3866873335044450476cea73080e`.

## What changed

### Calendar

The existing `#calendar` page is a full **Month / Week / Agenda** workspace with:

- A consistent six-week month grid and a seven-day Week view; both reuse partner follow-up and business event records.
- Clickable days and event links, an adjacent agenda for the selected day, and keyboard navigation (arrow keys move ±1/7 days, Home/End move to week edges, PageUp/PageDown move months).
- Filter pills for all entries, follow-ups, or events. Today and selected dates are visually distinct.
- Quick creation of events directly on the selected date, opening the original editable event form.
- Direct **Edit** actions for both event records and partner follow-up records, reusing the existing save helpers. After a save the calendar, Today preview, Pipeline and partner/event pages read from the same app data.
- A downloadable CSV with date, record type, title, note and record ID; this can be imported in Google Sheets. Formula-like values are escaped to avoid spreadsheet injection. No patient-level fields are exported.
- On phones, month cells show legible date numbers and status dots instead of impossible-to-read strings; the day's full details remain below.
- The Today mini-calendar shares selection with the full calendar. Selecting a day from Today opens that day's agenda.

### Referral pipeline

The six stages now render in well-sized, horizontally scrollable and scroll-snapped columns, with accessible stage-scroll buttons and the original drag-and-drop / **Move to** controls. All chips, titles, dates and selects wrap **inside** their own partner cards; the six-column squeeze/overlap seen in the screenshots is corrected.

### Torus brand and appearance

The official sidebar wordmark now has a restrained, pointer-reactive tilt and momentary geometric orbit on hover or click. **No continuous logo animation.** Existing interactive torus and mandala motion is preserved.

A persistent **Night grove / Daylight** theme control changes the full interface, including cards, charts, calendars, forms, the pipeline, navigation and drawers. Night grove uses deep forest green, fern, sage and warm bronze rather than generic black. A tiny head bootstrap sets the preference before paint to prevent a theme flash. Both themes honor reduced-motion preferences. No new runtime libraries were installed.

## Data and synchronization — exact behavior

1. **Demo (current public preview):** fictional `sample.js` data held in browser memory. The UI can be edited interactively, but a full reload restores the original fictional sample. There is no external database connection and no sensitive patient information in this preview.
2. **Supabase live mode (existing application, unchanged):** after configuring authorized Supabase credentials and approved team access, events and partner follow-ups save to the existing `events` and `partners` tables through `upsert`. Existing realtime subscriptions propagate changes to signed-in screens. This was tested with the repository's mock-live test suite, not a live customer database.
3. **Google Sheets:** CSV export **works**, but there is **no Google Sheets OAuth connection, sheet identifier, authorized integration endpoint, or two-way synchronization** in the current project. A live Sheets sync cannot be claimed without an explicitly connected, approved sheet and a source-of-truth/conflict policy. Follow [the source repository's calendar integration playbook](https://github.com/SacredRebel/dashboard-tools-/blob/main/docs/calendars/01-integration-playbook.md): use the Torus database as the source of truth and external calendars/sheets as a mirror, with idempotent IDs, scoped credentials, privacy review, error reporting, and a one-way initial sync before write-back.
4. **Healthcare privacy:** keep patient details in approved systems such as IntakeQ; this BD calendar and its exported CSV contain only partner contact and business-event fields. Review data permissions and any required BAAs before enabling third-party calendar or Sheets connections.

## Test evidence and verification

- `python scripts/experience_regression.py`: calendar Month/Week/Agenda, filtering, selected dates, keyboard, date-prefilled event create/edit, partner follow-up edit, download CSV, dark-theme persistence, pipeline bounds and scroll, mini-calendar routes at desktop and mobile widths.
- `python scripts/visual_regression.py`: ten routes on 1280px and 375px, all geometries, page patterns, logo and overflow.
- `python scripts/func.py`: partner search/add, touch history, forms, validations, stage movement, metrics and drawers.
- `python scripts/live_test.py`: simulated Supabase auth, permissions, event/partner saves, realtime changes and aggregate import counts.
- Additional visual sweeps: eight screen widths (320, 360, 375, 430, 768, 1024, 1280, 1440), both themes, all ten routes; no document-level horizontal overflow.

The accessible controls use real buttons and links, no inert decorative elements. Animations occur on user interactions; large data surfaces remain opaque and readable. Calendar and pipeline utilize the existing data layer, not mock-only shadow APIs.

### Screenshots

The following images are actual browser screenshots of the updated HTML/CSS/JS, not AI concept mockups:
- `docs/screenshots/v3-calendar-light-desktop.jpg`
- `docs/screenshots/v3-calendar-night-desktop.jpg`
- `docs/screenshots/v3-pipeline-desktop.jpg`
- `docs/screenshots/v3-calendar-mobile.jpg`
- `docs/screenshots/v3-today-mobile.jpg`

## Further integration requirements

To connect Google Sheets as a synchronized companion, obtain the customer's approved spreadsheet ID, authorized Google account/service account and field mapping. Decide whether Sheets is strictly read-only as an external dashboard or can write updates back, with conflict handling, deletion semantics, error logging, and a privacy review. None of those credentials or links should be committed to GitHub or placed in browser JavaScript.
