# Torus Experience V9: warm brand finish

**Rollback:** branch `backup/pre-v9-brand-finish-2026-11-18` (commit `c94c4c1`).

V9 is a visual pass only. Routes, CRM actions, Supabase contracts and the fictional demo data are unchanged.

## What changed

| Area | Before (V8) | V9 |
|---|---|---|
| Palette | Daylight read cool mint; Night grove was forest green with bright green table rows | Brand-warm: moon-dust cream and bronze-soil headings by day; umber charcoal with golden-haze accents by night. Moss stays for actions and the sidebar |
| Header geometry | Hard gold rings clipped at the edge; photo triangle sat on top of the subtitle | Feathered flower of life / Metatron star / torus orbits in the top-right corner, a quieter counter-turning figure in the bottom-left, turning very slowly and breathing. The photo triangle is placed by script in the free band between title and buttons and never covers text; a thin gold outline triangle sways against it. On phones it becomes a small corner emblem |
| Card geometry | 134px figures behind numbers and table cells | A feathered quarter-figure peeking in at the top-right corner of each card; none on table cards |
| Cards | Flat gradients | Liquid surface: golden light pooling top-left, sage pool bottom-right, a light rim along the top edge, soft warm shadow |
| Type | Small titles and numbers | Card titles in Jost, KPI numbers in the display face at 30–38px with a gold bead under each; 12.5px labels; quiet, readable table headers |
| Today hero | Torus clipped at the top, caption and Pause button over the art | Living torus: cleaner lines, a slow breath, golden energy flowing up through the centre and back around the outside. Torus Bloom mandala: seed of life, twelve petals that open and close, two counter-turning triangles, a twinkling bead ring. Controls sit clear of the art |

## Files

- `dashboard/torus-finish.css`: palettes, liquid cards, header and card geometry, role remap for panels, fields, quiet buttons and chips. Loaded last.
- `dashboard/torus-finish.js`: places the header triangle, adds card corner figures, gentle pointer parallax. Replaces `experience-v8.js` (deleted).
- `dashboard/assets/geo-flower.svg`, `geo-metatron.svg`, `geo-orbits.svg`: line figures used as masks so each theme tints them.
- `dashboard/torus-visuals.js`: new torus and mandala drawing; same API, pause, drag, keyboard and reduced-motion behaviour.
- `dashboard/experience-v8.css`: trimmed to the pipeline stage colors; its palette, ornament and header rules were replaced.

## Motion and performance

Only transform and opacity animate. Everything stops under the Settings "Reduced" motion option and under the system reduced-motion setting. Today runs at about 46 fps under 4× CPU throttle (V8: 28); other pages hold 60.

## Checks

- `python3 scripts/torus_finish_regression.py` (replaces the V8 regression): corner figures on every non-table card, decoration never takes clicks, header triangle never over text, no green surfaces in Night grove, pipeline stages distinct, no overflow, no errors, at 1440 and 390 in both themes.
- `python3 scripts/experience_v7_regression.py 1440|375`: selected calendar day now checks the gold ring instead of the old green fill.
- `scripts/func.py`, `scripts/live_test.py`, `scripts/visual_regression.py`, `scripts/experience_v6_regression.py`, `scripts/experience_v8_contrast.py`, `scripts/shoot.py`: pass.
- `scripts/experience_regression.py` already failed on V8 (a stale `.cal-entry-edit` selector from V3) and is unchanged.

Screenshots: `docs/screenshots/v9-*.jpg`.

## V9.1: emblems, pop-ups and generic contacts

- **Header triangles:** each photo triangle now carries a sacred emblem: a gold rim that traces it exactly, an inverted twin turning slowly into a six-point star, a dashed circle turning the other way, a glowing seed at the centre and gold points at the corners. A soft light sheen crosses the photo every few seconds. When a long title pushes the triangle into the corner, the corner figure steps back.
- **Pop-ups:** every drawer (add/edit partner, log a touch, plan/edit an event, add/edit counts, IntakeQ import) uses the same warm surface as the pages: feathered corner figure, small gold triangle mark, warm section panels, gold focus rings and a sticky footer with the buttons side by side. The scrim is a light warm veil instead of a green blur.
- **Palette:** daylight is a touch cleaner (less yellow haze); night surfaces are lifted slightly.
- **Contacts are generic:** every partner in the demo (`sample.js`), the optional database seed (`supabase/seed_playbook_partners.sql`), the tracker generator (`tracker/build_tracker.py` and the spreadsheet it builds) and the test fixture now use placeholder names ("Dr. Jane Doe", "Sample Wellness Clinic"), "City A–H" and (555) 123-45xx numbers. No real person, practice, address, email or phone number remains in the current files. Numbers, stages and dates are unchanged.
- **Check:** the V9 regression also opens the partner, event and counts drawers in both themes and fails on a green panel or stacked footer buttons.
