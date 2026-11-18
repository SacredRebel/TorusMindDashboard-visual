# Torus Mind & Medicine — Experience V6

**Approach:** Build on approved V5, do not redesign from scratch. Preserve the original Torus wordmark, interactive sacred geometry, navigation, colors, partner pipeline, ROI calculations, patient counts-only model, and the existing Supabase auth/realtime path.

Previous production snapshot: [`backup/pre-calendar-settings-v6-2026-11-17`](https://github.com/SacredRebel/TorusMindDashboard-visual/tree/backup/pre-calendar-settings-v6-2026-11-17), commit `ab25af049d2a742db659167b9c6e90579c04b8fb`.

## Calendar improvements

- Explicit **Previous month** and **Next month** actions are now clearly labeled immediately above the month grid, with the month/year between them. **Today** remains in the branded header. This is distinct from clicking individual dates to change the selected day.
- Clicking any appointment chip, Agenda entry, or selected day's appointment opens a **record summary inside the Calendar's existing right-hand panel**, without navigating away from `#calendar`.
- A partner follow-up summary includes contact, practice, pipeline status, owner, activity, next step, date, and available contact phone. A separate **Open partner profile** action navigates to that specific partner; **Edit details** opens the existing partner form without leaving Calendar.
- An event summary includes the event date and optional start/end time, format, type, related partner/venue, activity, and attendance/waitlist outcomes. When optional business notes exist they display in the summary. **Open full event** and linked **Partner details** are explicit links; editing stays in an in-page drawer.
- The **Back to day** control returns to the selected day's appointment list. Clicking a new day or month clears the previously selected record summary. All appointment items remain grounded in the existing partner and event data records.
- The main calendar retains Month/Week/Agenda modes, filtering, clickable day cells, keyboard date navigation, selected-day event creation, CSV export, and source-of-truth upsert/realtime handling.

## Plan / Edit Event drawer

- The form is now styled as a real event workspace, with **Event essentials** and **Participation & outcomes** sections, clean input hierarchy, brand-matched gradients, responsive layout and persistent save actions in Daylight and Night Grove.
- Existing required fields and validations remain: title, date, type, BD activity, format, attendance, waitlist, cost, hours, plus a related organization reference.
- Related partner / host now lists **all existing partners**, not only records marked Community venue. It reuses the existing `events.venue_id` foreign key and can be opened from the event's Calendar summary.
- Optional fields: **start time, end time, agenda/logistics notes** (no patient information). The event editor verifies that the end time comes after the start time. These fields are enabled in demo and only in a live database that passes a real schema-column probe.

### Important backend migration before enabling live event time/notes

Current legacy production schema does **not** include those three scheduling columns. The SQL is included as [`supabase/migrations/20261117_event_schedule.sql`](../supabase/migrations/20261117_event_schedule.sql) and mirrored idempotently in [`supabase/schema.sql`](../supabase/schema.sql). After the authorized database admin has applied the migration to the actual Torus Supabase instance, reload the app; it probes for column support and then saves/loads start time, end time, and notes through the existing authenticated events upsert + realtime subscription. **No migration was executed against the customer's production database by this work.**

Until the migration is applied, the live event form shows a clear informational note; all legacy event fields and partner links remain fully operable. Demo records and changes in the public site are fictional and held in browser memory, not the client's Supabase. No Google Calendar or Sheets live synchronization is implied by scheduling columns.

## Settings organization and real controls

The Settings page now has **one** branded header and a two-column stack layout on larger screens, collapsing to a single column on small screens. Opening the dropdown-list disclosures expands only that independent stack; no large blank space is introduced in adjacent cards. Long option lists scroll inside their own disclosure surfaces.

### Existing team-wide data settings (unchanged Supabase contract)

- Practice opening date and hourly staff cost save to the existing `settings` record and feed 30/60/90-day target and ROI calculations.
- Team members, access roles and live sign-in remain in the original `team_members`/Supabase workflow.
- Data state preview now applies to the screen immediately rather than only showing a toast.

### New local device settings (functional, clearly labeled)

- **First day of week:** Sunday or Monday, changes both full and Today calendars.
- **Default calendar view:** Month / Week / Agenda; selected default persists on this browser and applies on reload.
- **Information density:** Comfortable / Compact. Compact actually reduces card, calendar and table spacing.
- **Sacred geometry motion:** Ambient / Reduced. Reduced stops auto-animation while preserving manual pointer/keyboard interactions; ambient can resume motion.
- **Reset display preferences:** restores original defaults, immediately and persistently.

These are intentionally **on-this-browser preferences**, saved in localStorage, *not* shared team Supabase settings. The UI explicitly says so.

### Integration readiness (no fake toggles)

- Database & team status reflects whether live Supabase is configured or the page is a fictional demo.
- IntakeQ has an **Import CSV** action using the existing aggregated-lead import flow. Patient details remain in IntakeQ, never in this CRM dashboard.
- Google Sheets offers the working Calendar **Export CSV**. Two-way synchronization is **not connected** and requires a separately authorized integration.
- Event scheduling status reflects the actual schema probe.
- Quick-access links navigate to Calendar, Partners, Events and ROI.

## Mandala visual direction

The Mandala **keeps the same interactive hero background that the Torus uses**. Its V5 inner bordered rectangle, overlay filters, extra green gradient panel and vignette are removed; the sculpture is now unboxed. The existing 3D projected sacred geometry remains interactive via drag, mouse hover parallax, keyboard arrows, pause/play, and motion preference. The Torus mode is preserved, and both themes inherit the hero's own brand green gradient. Reduced-motion preferences are respected.

## QA evidence

- `python scripts/experience_v6_regression.py`: real browser tests at 375, 1024 and 1440 px for month navigation; event and partner appointment summaries on the same calendar page; explicit profile navigation; event creation with linked partner, notes, time validation and persistence; independent Settings stacks; all device preferences, reload persistence and reset; dark theme; and unboxed mandala. Checks horizontal overflow and page JavaScript errors.
- `python scripts/visual_regression.py`: desktop/mobile geometry and page layout across ten routes.
- `python scripts/experience_regression.py`: Month / Week / Agenda, CSV, event CRUD, Pipeline, light/dark theme and Today mini-calendar.
- `python scripts/experience_v4_regression.py`, `python scripts/experience_v5_regression.py`: original V4/V5 visual and interaction features, updated for V6's intentional navigation/mandala changes.
- `python scripts/func.py` and `python scripts/live_test.py`: original CRM forms, validations, stage changes, simulated Supabase save/realtime auth, event saves, aggregate-only IntakeQ import and team access. These tests do not connect to customer databases.

## Real browser preview images

The files `docs/screenshots/v6-*.jpg` are rendered browser captures of Calendar, selected appointment details, event drawer, Settings, and the unboxed mandala in the current implementation—not generated mockups.
