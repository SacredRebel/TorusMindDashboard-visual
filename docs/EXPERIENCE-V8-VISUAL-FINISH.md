# Torus Mind & Medicine — V8 Geometry, Contrast & Pipeline Stage Finish

**Scope:** Incremental, production-safe visual refinement of the existing Torus dashboard. Preserve the V7 routes, user actions, animated 3D Torus/Mandala, original Torus photos, wordmark, Supabase contracts, and fictional public demo data.

**Rollback:** `backup/pre-v8-geometry-stage-polish-2026-11-18`, commit `36b8bc9da2ae41bb4f77f21881443772388a38ba`.

## Root cause: card square artifacts and invisible geometry

V5 applied the two-layer `background-size: 150px 150px, cover!important` rule to cards with a geometry SVG plus an opaque gradient. Later V7 theme rules replaced those `background-image` values with **one** gradient, but retained the old first-layer `background-size`. The gradient therefore rendered as a ~150px **square** patch in Settings, ROI and other cards, exposing the underlying card color. Simultaneously the original SVG paths were extremely fine (`stroke-width=1.25` in 480px art, and internal `stroke-opacity=.35`), making geometry invisible after additional low-opacity CSS effects.

**Actual fix — not just a screenshot mask:**
- `experience-v8.css` forces single-gradient card backgrounds to `background-size:cover`, `background-position:center` and `no-repeat`, superseding the legacy two-layer rule.
- `experience-v8.js` creates one `aria-hidden`, `pointer-events:none` ornament layer per card, idempotently, after each page render. Layout, forms and content stay in their existing DOM and above the ornament. No decoration is applied to the original interactive Today hero or the sign-in card.
- Six transparent SVG variants (`assets/geometry-{flower,orbits,mandala}-v8-{light,dark}.svg`) are derived from the original Torus procedural sacred geometry. Their paths remain unchanged; stroke legibility and warm theme-specific colors are tuned. Original assets and the original Torus artwork remain untouched.
- Small corner emblems are nonrepeating, gently feathered and selectively varied across cards. Hover responds softly; reduced-motion accessibility disables its transition.

## Header artwork

Every secondary route keeps its existing original Torus photo and up/down triangle orientation. V8 raises triangle visibility, contrast and size and anchors it near the title, with the page-specific transparent sacred-geometry emblem in the opposite corner. The Home/Torus/Mandala hero is preserved. The original photo sources and nav/buttons are unchanged.

## Warmer brand modes and readability

Daylight now uses warmer cream/lichen surfaces, deeper text and card borders, and a readable theme switch. Night Grove uses charcoal, warm gray-green and cream-gold rather than overly saturated dark greens. Text in ROI, Settings, CRM tables and all six pipeline stages has targeted contrast refinements. The important theme, density, and geometry motion preferences remain functional.

## Pipeline: six full-stage color systems

The existing Pipeline board already groups relationships into **columns** (Cold, Warm, Sent materials, Meeting scheduled, Referral made, Active referrer). V8 marks each column and its tiles with a grounded `data-stage` attribute and gives **the entire column AND all its cards** a consistent warm, differentiated theme color:

| Stage | Daylight | Night Grove |
| --- | --- | --- |
| Cold | Sage green | Smoky moss |
| Warm | Dusty olive | Deep olive |
| Sent materials | Amber parchment | Warm bronze |
| Meeting scheduled | Golden clay | Clay-brown |
| Referral made | Terracotta blush | Muted rose-brown |
| Active referrer | Botanical green | Deep woodland |

Colors apply through CSS variables to the surface, tile, title, badges, next-step panel, buttons, dropdowns and foreground text. A very fine liquid highlight and geometric watermark adds depth without expensive blur or constant animation. The V7 filters, drag/drop, selection, bulk assignment, stage navigation and CRM persistence remain untouched.

## Browser evidence and tests

- `python scripts/experience_v8_regression.py 1440` and `python scripts/experience_v8_regression.py 390`: eight routes × two themes; verify card-count/ornament-count parity, correct and transparent SVG URL, full gradient sizing, no pointer interception, original photo triangle and header geometry, all six distinguishable stages including the next page of stages, mobile overflow and JavaScript errors.
- `python scripts/experience_v8_contrast.py`: 60 stage/control text contrast comparisons over 12 stage palettes; lowest value **4.88:1** (passes the 4.5:1 normal-text AA target for the tested flat palette pairs).
- `python scripts/experience_v7_regression.py 1440` and `python scripts/experience_v7_regression.py 375`: in-place calendar details, Events accordions, Pipeline filters and bulk saves, Settings, header art, both modes and no browser exceptions.
- `python scripts/experience_v6_regression.py`: now uses the newer V7 calendar accordion instead of obsolete `.cal-entry-link` selectors; existing V6 event saves/notes, date navigation and settings still pass.
- `python scripts/visual_regression.py`: 20 mobile and desktop routes, interactive Torus, zero browser page errors.
- `python scripts/func.py` and `python scripts/live_test.py`: original functional CRM and simulated Supabase/realtime tests pass. These tests do **not** prove the customer's database or Google Sheets synchronization is connected.

The `docs/screenshots/v8-*.jpg` images were captured from the actual local running dashboard with Playwright and fictional demo data; they are not image-generation mockups.

**Production integration boundary:** The public preview is demo-only. Live event scheduling notes/time fields still require the previously prepared V6 migration, applied to the correct Supabase database by an authorized administrator. Google Sheets two-way synchronization remains unconnected. No patient records are used or embedded in these visuals.
