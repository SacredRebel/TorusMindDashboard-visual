# TORUS MIND & MEDICINE — VISUAL IDENTITY, NOVEMBER 2026

## Direction
A real dashboard presentation layer based on the visual style of https://torusmedicine.com. This is a **business-development/referral operations interface**, not a patient charting system.

## Authentic client assets
Source: the client website's public Webflow asset library.
- assets/torus-original-wordmark.png — original horizontal brand mark from the site.
- assets/torus-original-emblem.png — original brand square mark.
- assets/torus-watercolor.webp — optimized derivative of the client's watercolor background.
- assets/torus-ocean.webp — optimized derivative of the client's ocean imagery, retained for future brand use.
- The client’s original logo-morph video is no longer streamed or exposed in the Today interface (removed in visual v2).
Confirm the client's permission to reuse these specific assets before any redistribution outside this commissioned dashboard.

## Procedural sacred geometry
The three new SVG motifs (orbits, flower, mandala) are original procedural interpretations, not the client's original art. The route header pattern changes with each business view, while the cards use a quiet background watermark rather than blocking data.

- Today: interactive torus + orbit geometry.
- Partners and partner detail: interconnected circle lattice.
- Patient lead totals: mandala backdrop, without clinical claims or patient-level records.
- Pipeline and Sources/ROI: orbital geometry.
- Events and event detail: mandala.
- Calendar: flower of life circles.
- Settings: rotating orbit-inspired motifs.

## Interaction
- Torus: Canvas2D projected 3D threads; drag to orbit or focus and press arrow keys.
- Mandala: changing rosette geometry.
- Slow/Flow/Fast speed control plus pause, reduced-motion, and visibility-aware animation. The original video option is deliberately absent.
- Zero Three.js dependencies, and no interference with CRM navigation, forms or Supabase.

## Source and QA
- dashboard/index.html loads brand-polish.css and brand-polish.js after existing Torus CSS and JS.
- dashboard/app.js, sample.js, supabase/schema.sql and other CRM code remain untouched.
- Run npm run dev. Main view: /index.html#today.
- Run python scripts/visual_regression.py to verify 10 routes at 1280px and 375px, source logo, page patterns, geometry controls and horizontal overflow. Browser screenshots are stored in docs/screenshots.
- Run python scripts/func.py for partner CRUD, pipeline, events, settings and forms.
- Run python scripts/live_test.py for mock Supabase logins, realtime, and IntakeQ counts-only import.
- The earlier illustrative and self-contained dashboard/visual-preview.html remains a *design study*, not the live CRM. Use index.html to review the real pages.

## Privacy
Never commit patient data. Public demo mode has fictional data; do not imply that this Vercel deployment is suitable for storing PHI. Verify data contracts, security controls and BAAs before live clinical deployment.

## Collaboration
All work occurs in SacredRebel/TorusMindDashboard-visual, forked from kimdudine/TorusMindDashboard. The upstream repository remains unchanged until reviewed with its owner.

## Public preview safeguards (release patch)
The Vercel build now writes only `window.TORUS_CONFIG = null` when Supabase is unconfigured. It does not publish the inherited custom `demo/torus-demo.json` dataset into the public `config.js`. Fictional `sample.js` data is used instead. The custom data file is not part of Vercel's `dashboard` output.

The standalone `/visual-preview.html` is served with a strict Content Security Policy. Its two precisely hashed inline scripts are allowed explicitly in `vercel.json`; inline button event handlers were replaced with event listeners so interactions continue to work without permitting arbitrary inline JavaScript. When editing this standalone preview script, regenerate both SHA-256 hashes in the CSP.


## Visual polish v2 — incremental only
The v1 Torus branding, torus field, mandala, colors, sacred geometry, and navigation are deliberately preserved. The v2 additions are layered through `dashboard/today-polish.css`, while `dashboard/app.js` reorders the Today presentation without touching underlying business calculations.

- Backup of v1: `backup/pre-calendar-liquid-polish-2026-11-17` (SHA `a8855908cecb247285fc793600978a4ed65efe5d`).
- The Today page now pairs **Needs attention** with a compact six-week mini calendar (follow-up and event markers), with month navigation and links to the existing full calendar. The 5 original KPI cards and two deeper analytics cards remain, but are made denser.
- Calendar navigation is directly after Patients, before Pipeline.
- Demo greeting and owner label say **Torus team** rather than referring to the developer. The sample still uses fictional contacts and counts.
- The original video was intentionally removed from the Today controls. Interactive Torus, Mandala, speed, pause, drag/keyboard interactions remain unchanged.
- Traced ocean photography appears as a **subtle triangle-masked accent** in the header and calendar, alongside the original sacred geometry; the body of the data remains opaque and readable.
- The motion/material treatment follows `SacredRebel/dashboard-tools-`: `docs/design/02-rulebook.md`, `docs/design/07-showcase-patterns.md`, `docs/design/08-polish-standard.md`, `docs/design/09-motion-system.md`, `docs/calendars/02-calendar-ui-rules.md`. CSS-only transform/opacity hover, ~180–200ms, no exotic cursor or scroll hijacking, accessible click and reduced motion.
- **Privacy:** the custom demo data files (`demo/torus-demo.json`, `dashboard/sample-upload.csv`) are excluded from this public fork's latest tree. The build emits a minimal demo `config.js`, leaving `sample.js` as the intentional fictional dataset. Historical Git commits may still contain inherited files and should be audited separately before treating the repository as permanently sanitized.


## Experience V3
See [CALENDAR-AND-EXPERIENCE-V3.md](CALENDAR-AND-EXPERIENCE-V3.md) for the new interactive calendar, corrected pipeline, hover-only logo motion, light/dark theme, live Supabase contract, and Google Sheets integration boundaries. Changes are additive, not a rebuild.


## Experience V4 — preserved and corrected
See [the V4 release and verification guide](EXPERIENCE-V4-RELEASE.md) for single-page headers, an in-place Today agenda, whole-cell calendar click behavior, responsive Pipeline stage groups, ROI and Settings organization, distinct client-sourced triangle textures and new depth-projected mandala. The V3 backup remains available.


## Experience V5 — restraint and finish
See [V5 polish and browser verification](EXPERIENCE-V5-POLISH.md). V5 fixes an actual top-of-page text parsing bug, tones down card wallpaper, smooths the Mandala green field, and improves the Add Partner drawer without changing CRM functionality.
