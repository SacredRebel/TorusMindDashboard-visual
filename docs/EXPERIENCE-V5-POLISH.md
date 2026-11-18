> **V6 update:** The Mandala now renders transparently on the original Torus hero, rather than the V5 dedicated background gradient. Calendar, Event and Settings workflows have also been upgraded. See [V6](EXPERIENCE-V6-CALENDAR-OPERATIONS.md).

# Torus Mind & Medicine — Experience V5 polish

## Design contract and rollback

**Incremental visual improvement only.** Keep the Torus brand, original identity, interactive Torus/Mandala, sacred geometry, pages, data model, and business workflows. Do not rebuild from scratch.

The V4 release is preserved at `backup/pre-v5-surgical-polish-2026-11-17` (commit `8281d66a039a0a3109240335cddd9627f8fb1cf8`).

## Fixes made

### Top-left page artifact — root cause corrected

The source file `dashboard/index.html` contained a literal `\\n` between stylesheet links on its head. Chromium parsed that text node into the body, generating ~25px of unexpected space above the whole application. This was corrected in the actual HTML rather than hidden by CSS. Browser test verifies the app's bounding top is exactly 0px, with no non-whitespace text nodes in the body outside the application.

### Sacred geometry reduced

- Card patterns were tiling at their background image's native `repeat` default. V5 explicitly makes patterned backgrounds non-repeating and positions them at edges, with restrained size.
- On Today, the Needs attention and Calendar cards use calm green gradients, retaining only faint corner geometry accents and the original animated Torus hero.
- KPI and secondary cards keep a very light single emblem; no repeating wallpapers.
- Needs attention no longer stretches to match the taller Calendar card. A selected-day panel remains in the Today card and never navigates to the full Calendar unless explicitly requested.
- The upcoming-events teaser collapses when an in-place selected-day agenda is displayed, reducing unnecessary vertical space.

### Cleaner Mandala

- Retains the existing interactive canvas, mode switch, drag/orbit, motion speed and pause controls.
- Uses a more balanced three-dimensional projected flower-of-life arrangement, with depth-sorted loops and softer luminous outer rings; fewer tangles and smoother orbiting.
- The former busy, blurry photographic background is **removed** from the mandala field. It now has a clean, atmospheric green gradient in separate Daylight and Night Grove treatments, using muted gold and moss highlights.
- Hides redundant visual captions **only in Mandala mode** to keep text from intersecting fine geometry; accessible mode controls and canvas labels remain.
- The sculpture is a *brand-inspired procedural interpretation*, not an exact copy of the official motion video.

### Add Partner UI

The original 12 partner form controls, form names, required-field validation, submit handlers and underlying save logic are unchanged. The UI now groups them into semantic **Relationship details** and **Follow-up & ownership** fieldsets, with a short editorial header, coherent glass-paper surfaces, field focus states, readable spacing, and a persistent action footer. Both themes have individually tuned contrast. The drawer adapts to one column on narrow screens.

### Responsive shell

The app correctly fills the top edge on desktop, while the mobile navigation remains fixed to the bottom and does not cover the page. V5 explicitly restricts desktop `top:0` sticky positioning to desktop widths. The mobile navigation and geometry controls also respect scroll safe areas.

## Code surface

- `dashboard/index.html`: correct literal escape and load V5 stylesheet.
- `dashboard/app.js`: identify the current drawer form and organize Add Partner's markup; no changed data contracts.
- `dashboard/torus-visuals.js`: more coherent 3D mandala geometry; no new runtime dependencies.
- `dashboard/experience-v5.css`: additive presentation overrides.
- `scripts/experience_v5_regression.py`: browser smoke test and actual visual screenshots.

## Testing and integration boundaries

All are fictional demo fixtures—no real patient or business records loaded.

- `python scripts/experience_v5_regression.py` — 5 widths × 2 themes; no stray text or top margin, no card wallpaper, no horizontal overflow, interactive mandala, selected-day calendar, complete 12-field partner form, required validation and successful save.
- `python scripts/visual_regression.py` — 10 routes at desktop/mobile, geometry controls, logos, responsive width, no page errors.
- `python scripts/experience_regression.py` — calendar Month/Week/Agenda, edits, CSV export, stage navigation, theme persistence, Today date interactions.
- `python scripts/experience_v4_regression.py` — single header, Calendar full-cell clicks, responsive Pipeline, compact ROI, Settings, artwork and both themes.
- `python scripts/func.py`, `python scripts/live_test.py` — original CRM functional and simulated Supabase/data-refresh checks. These scripts may need an installed Chromium path on some machines.

**No real Supabase credentials, Google Sheets sync, or patient-data exports were introduced.** Google Sheets still supports CSV export only; two-way sync requires a customer-authorized connection and privacy review.

## Screenshots

Actual browser renderings (not AI mockups):
- `docs/screenshots/v5-today-daylight.jpg`
- `docs/screenshots/v5-today-night-grove.jpg`
- `docs/screenshots/v5-mandala-daylight.jpg`
- `docs/screenshots/v5-mandala-night-grove.jpg`
- `docs/screenshots/v5-partner-drawer-night.jpg`
- `docs/screenshots/v5-partner-drawer-mobile.jpg`
