# Torus Mind & Medicine — Experience V7

## Design contract / rollback

V7 is additive to the V6 dashboard and intentionally preserves the original Torus identity, procedural sacred geometry, routes, Supabase data model, patient-counts-only privacy boundary and backend CRUD. Prior release backup: [`backup/pre-v7-operational-polish-2026-11-17`](https://github.com/SacredRebel/TorusMindDashboard-visual/tree/backup/pre-v7-operational-polish-2026-11-17) at `e911b7eb71f6275209e932fb1fb56ceca65287da`.

## Specific fixes

### Brand and themes

- All secondary headers (Partners, Patients, Pipeline, Events, ROI, Calendar and Settings) retain their original page-specific Torus imagery and alternating triangle orientation. Triangles now sit closer to the editorial title; sacred geometry appears in the opposite corner. Home's approved interactive Torus hero is unchanged.
- Daylight uses warmer, better-separated cream, lichen, sage and moss. Night Grove is tuned toward warm charcoal-gray and deep green with bronze/cream typography and restrained translucent header controls.
- Dark Calendar has explicit accessible contrast rules for weekday labels, day numbers, selected/today states, off-month cells, events, follow-ups, overdue items, mode filters, and the day agenda.
- Settings cards no longer render decorative geometry overlays or ghost blocks over content; their background and text contrast are theme-aware.
- The refinements honor reduced-motion preferences and keyboard focus visibility.

### Calendar: local accordion, no route change

Selecting a calendar day updates the agenda on that page. Clicking an appointment's compact row opens its details below that row, closing it with the same action. These interactions update only the agenda DOM, rather than calling the application-wide `rerender()` on every appointment click. This protects viewport position, reduces unnecessary geometry reinitialization and makes opening/closing entries feel smoother.

The expanded record retains contact/event details and **separate buttons** for **Edit details**, **Open full contact** (partner follow-ups) or **Open full event**, and **Open linked contact** when the event has a related partner. The Add event button remains a separate action below the appointment list. The existing Month/Week/Agenda modes and Google Sheets-compatible CSV export remain.

### Pipeline: operational board

- Top-of-board real statistics: relationships in the current filter, overdue follow-ups, due in seven days and active referrers.
- Functional controls: filter by existing owner, BD activity and follow-up date; sort by follow-up date, contact name or last logged touch; reset filters.
- Select visible partners with checkboxes; bulk-move pipeline stages or assign an existing owner. These actions use the current `upsert('partners')` data path and authorized Supabase RLS when connected (not a separate simulated backend). Bulk writes are sequential; a backend error is surfaced, and earlier successful writes are not rolled back.
- Cards now show owner, last logged touch, a concise next-step preview, quick **Log touch** and **Edit / schedule** actions, and the original Move to selector. Stage-group navigation and drag/drop remain intact.

### Events & education: inline details

Every event row opens as an inline disclosure within the Events table. The row stays on `#events`, and only one expanded event is shown at a time. Details include date/time where available, event type/format, linked organization, BD activity, attendance, signups, existing professional contacts, attributed patient **counts only**, revenue, cost and optional business logistics notes.

Actions include **Edit event** (existing CRUD), **Duplicate** (opens a prefilled *new* unsaved event form, never duplicates in the background), and **Full report** (explicit navigation). The related partner/contact links remain available as explicit actions rather than forcing navigation when opening a row.

## Data honesty and privacy

This public Vercel preview still uses fictional in-browser demo data and does not persist across reloads. Existing live Supabase routes and realtime events remain. Optional event time/notes require the prior V6 migration (`supabase/migrations/20261117_event_schedule.sql`) to be applied by an authorized customer administrator; it is **not** applied automatically. Google Sheets CSV export works, but live two-way synchronization is **not** connected. Patient details remain in IntakeQ, not this dashboard.

## Verified browser workflow

`python scripts/experience_v7_regression.py 1440` and `python scripts/experience_v7_regression.py 375` validate, in Daylight and Night Grove: Calendar appointment open/close without navigation, correct dark selected-day state, Events inline expansion and Duplicate action, Pipeline filters/selection/bulk save, touch logging, client-sourced header art, Settings card textures, responsive width, and absence of JavaScript page errors. Tests use only fictional demo data.

Screenshots in `docs/screenshots/v7-*.jpg` are actual browser renders, not generated concept images. No new UI runtime dependency was added.
