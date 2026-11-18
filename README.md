# Torus Mind & Medicine: BD Dashboard & CRM

Business development dashboard and referral CRM for Torus Mind & Medicine (Stuart, FL). Built by Beyond Consulting with the [dashboard-tools](https://github.com/SacredRebel/dashboard-tools-) framework.

> **Status:** Deploys to Vercel from this repo. With no database it runs in **demo mode** (fictional sample data). Add two Supabase settings in Vercel and it goes **live**: team login by email link, saved data and real-time updates. See [docs/SETUP.md](docs/SETUP.md).

## What it tracks

1. **Professional contacts and referral sources.** It tracks:
   - who has been contacted and every touch with them
   - who has agreed to refer
   - every patient each source sends, and when they last sent one
2. **Activities that generate patients.** These include lunch-and-learns, webinars, open houses, teas, integration circles, community talks and partnerships. For each one it shows:
   - the professional contacts it produced
   - the patient leads it produced
   - consults, packages and return on cost
3. **Patient leads and the website discovery form.** It shows:
   - how each patient came in (discovery form, phone, email, provider referral form, at an event, walk-in)
   - what drove them
   - which provider or event gets the credit
   - the discovery-form funnel: submissions → consults → packages

## Visual identity fork (Nov 2026)

This fork retains the business-development CRM while adding Torus Medicine's original wordmark and art, sacred-geometry treatments on each page, interactive torus and mandala modes, and page-specific geometric details (no original-brand video on Today). Start npm run dev and visit http://localhost:4173/index.html#today. Run python scripts/visual_regression.py for desktop/mobile screenshots and navigation checks. See docs/VISUAL-IDENTITY-GUIDE.md for architecture, attribution and privacy notes. All sample data is fictional.

## Repo layout

| Path | What |
|---|---|
| `dashboard/` | The app: static HTML, CSS and JS with no dependencies. `app.js` is the screens and data layer; `sample.js` is the demo data; `config.js` is written at deploy time. |
| `vercel.json`, `scripts/write-config.mjs` | Vercel build: writes `config.js` from `SUPABASE_URL` / `SUPABASE_ANON_KEY`, plus security headers |
| `supabase/schema.sql` | Database tables, team-only security, live updates, import function. Tested on Postgres 16. |
| `supabase/seed_playbook_partners.sql` | Optional: the 13 referral targets from the playbook |
| `docs/SETUP.md` | Step-by-step: deploy to Vercel now, connect Supabase later, weekly IntakeQ routine |
| `dashboard/torus-theme.css` | Torus brand tokens taken from torusmedicine.com. Components use tokens only. |
| `dashboard/tokens.css` | Design-token names and scale from dashboard-tools |
| `tracker/Torus_BD_Tracker.xlsx` | The Google Sheets tracker used today. Import it into Torus's Workspace. |
| `tracker/build_tracker.py` | Regenerates the tracker (`python3 tracker/build_tracker.py`) |
| `docs/brief.md` | The approved dashboard brief: pages, records, numbers, look |
| `docs/screenshots/` | Desktop (1280px) and phone (375px) screenshots |
| `scripts/shoot.py`, `scripts/func.py`, `scripts/live_test.py` | Screenshots, demo click-through, and live-mode tests against an in-memory database stand-in |

## Privacy rules (non-negotiable)

- **No patient details in this repo, the tracker or the dashboard.**
  - Patient leads are stored as monthly counts only (per channel, source and credited partner/event).
  - Names, IDs, contact details, PHQ-9 answers and insurance stay in IntakeQ. The import summarises in the browser.
- **Website forms that collect patient information must be IntakeQ forms.** This covers the discovery form, PHQ-9 and provider referrals. Webflow is not HIPAA-compliant and signs no BAA.
- **No Zapier for patient data.**
- **Real data goes only into accounts covered by a BAA**, such as Google Workspace or IntakeQ.

## Next steps

- **Go live:** create the client's Supabase project and follow docs/SETUP.md part 2.
- **IntakeQ:** weekly CSV import now (summarised to monthly counts in the browser); the IntakeQ API later.
- **"For Providers" page** on the website, with a "Make a referral" IntakeQ form and a provider-only partner/RSVP form.

### Visual v2 backup and change policy

The previous finished design is preserved in branch [`backup/pre-calendar-liquid-polish-2026-11-17`](https://github.com/SacredRebel/TorusMindDashboard-visual/tree/backup/pre-calendar-liquid-polish-2026-11-17). Future visual iterations must remain **additive**: never rebuild from scratch or remove the current torus, mandala, sacred geometry, main identity, and visual language. The second pass makes Today a compact command center with an embedded calendar and denser KPIs; Calendar now sits directly after Patients in navigation. Polishing follows the rules from the [`dashboard-tools-`](https://github.com/SacredRebel/dashboard-tools-) repository. The preview uses fictional `sample.js` only, with no inherited business demo imports.


### Torus Experience v3 — calendar, pipeline, appearance

The working v2 design is preserved in the backup branch `backup/pre-calendar-pipeline-theme-2026-11-17`. V3 adds an accessible Month/Week/Agenda calendar, partner/event editing on selected days, CSV export for Google Sheets, a properly contained scrollable pipeline, interactive logo flourish, and a persistent forest-green dark theme. There is **no live Sheets sync** until an approved Sheet and credentials are connected; the existing Supabase save/realtime path remains intact.

See [the design, data, and synchronization guide](docs/CALENDAR-AND-EXPERIENCE-V3.md). Run `python scripts/experience_regression.py`, `python scripts/visual_regression.py`, `python scripts/func.py`, and `python scripts/live_test.py` to verify the implementation. No new runtime dependencies were added.


### Experience V4: focused usability refinements

The previously approved V3 design is backed up in [`backup/pre-layout-refinement-v4-2026-11-17`](https://github.com/SacredRebel/TorusMindDashboard-visual/tree/backup/pre-layout-refinement-v4-2026-11-17). V4 fixes duplicate Today/Calendar headers, whole-cell calendar clicks, in-place Today day agendas, Pipeline cropping (responsive stage groups), oversized ROI chart spacing, unreadable Settings lists, daylight color separation and seamless route-specific Torus triangle artwork. The interactive Torus and 3D mandala remain; Supabase logic is unchanged. See [V4 release guide](docs/EXPERIENCE-V4-RELEASE.md).


### Torus Experience V5 — subtle visual polish

The last approved design is preserved in [`backup/pre-v5-surgical-polish-2026-11-17`](https://github.com/SacredRebel/TorusMindDashboard-visual/tree/backup/pre-v5-surgical-polish-2026-11-17). V5 fixes the literal escaped-newline HTML bug that put an unwanted strip above the app, removes repeating sacred-geometry wallpaper from cards, refines the 3D mandala's green atmosphere in both themes, eliminates stretched Today's empty card area, and gives Add Partner a structured, responsive, accessible form. **No business workflow, API or data-contract changes.** See [V5 release guide](docs/EXPERIENCE-V5-POLISH.md).


### Experience V6 — calendar scheduling and operations preferences

The approved V5 is backed up at [`backup/pre-calendar-settings-v6-2026-11-17`](https://github.com/SacredRebel/TorusMindDashboard-visual/tree/backup/pre-calendar-settings-v6-2026-11-17). V6 provides clear previous/next **month** navigation; appointment and follow-up details **inside Calendar** with separate partner/event profile links; a redesigned, partner-linked Plan Event drawer; a one-header Settings page with independently stacked cards and genuinely persisted, local browser display preferences; and the Mandala rendered **directly on the original hero background**, without its boxed overlay. See [V6 operations and migration guide](docs/EXPERIENCE-V6-CALENDAR-OPERATIONS.md).

**Migration boundary:** Live start/end times and event notes require the optional `supabase/migrations/20261117_event_schedule.sql` applied by the database administrator. Demo supports these fields immediately; the existing live events model remains compatible with older schemas. Google Sheets live two-way sync is not connected.


### Experience V7 — readable themes and operational page controls

The previous V6 is preserved at [`backup/pre-v7-operational-polish-2026-11-17`](https://github.com/SacredRebel/TorusMindDashboard-visual/tree/backup/pre-v7-operational-polish-2026-11-17). V7 refines secondary-page headers and both brand themes, fixes dark Calendar contrast, adds fast in-place appointment accordions with clear contact actions, adds expandable Events table rows, and upgrades Pipeline with filters, statistics, selection, bulk ownership/stage updates and quick CRM actions. See [the V7 workflow guide](docs/EXPERIENCE-V7-UI-WORKFLOWS.md).


### Experience V8 — original geometry restored and differentiated pipeline stages

V8 corrects a real CSS background-layer sizing defect that caused square patches in ROI, Settings and other cards, restores original sacred geometry through explicit transparent ornaments in both themes, strengthens the original Torus header triangles and corner artwork, improves warm text/card contrast, and assigns each of the **six pipeline stages** its own complete light/dark column-and-card color treatment. The approved V7 functionality and animated Torus/Mandala are preserved. See [V8 implementation and QA guide](docs/EXPERIENCE-V8-VISUAL-FINISH.md). Rollback: [`backup/pre-v8-geometry-stage-polish-2026-11-18`](https://github.com/SacredRebel/TorusMindDashboard-visual/tree/backup/pre-v8-geometry-stage-polish-2026-11-18).


### Torus Experience V9: warm brand finish

The V8 design is preserved in `backup/pre-v9-brand-finish-2026-11-18`. V9 warms both themes to the torusmedicine.com palette, restores feathered, slowly turning sacred geometry in header and card corners, places the photo triangles clear of all text, gives cards a subtle liquid surface, strengthens titles and numbers, and redraws the Today torus (living energy flow) and mandala (Torus Bloom). Visual only; no data or workflow changes. See [the V9 release note](docs/EXPERIENCE-V9-BRAND-FINISH.md).
