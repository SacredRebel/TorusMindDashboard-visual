# Torus Experience V4 — focused usability refinements

**Policy:** Incremental only. Preserve the approved V1–V3 visuals, 3D Torus, interactive mandala, navigation, data mappings, API contracts and business workflows. Original V3 snapshot: [backup/pre-layout-refinement-v4-2026-11-17](https://github.com/SacredRebel/TorusMindDashboard-visual/tree/backup/pre-layout-refinement-v4-2026-11-17), commit `09af5ac27330c6521f84eda874237309f549a73b`.

## Corrected issues from annotated screenshots

1. **Today/Calendar duplicate header:** The redundant generic banner is hidden only on those two routes; Today uses the existing Torus hero as its sole page header, and Calendar uses its own month controls header. The night/day switch is placed within the remaining header and retains existing functionality.
2. **Full Calendar click targets:** Clicking the non-link area of any calendar cell selects that date. Existing inner event and follow-up links still open their records. Month, Week, Agenda, filters, keyboard navigation, CRUD actions and CSV export remain.
3. **Today date interactions:** Selecting a mini-calendar date now opens a compact inline day agenda **on Today** instead of navigating to full Calendar. The panel provides event/follow-up details, record edit links and a date-prefilled Add Event action. Its DOM is updated without reinitializing the Torus Canvas; explicit Full calendar remains a separate link.
4. **Pipeline clipping:** Stage groups are paginated responsively (3 desktop, 2 tablet, 1 phone) so no full partner card is cropped off the right edge. Stage tabs show all six counts, and previous/next buttons navigate groups. Original drag-and-drop works among visible stages, and the Move to selector still reaches any stage via the same Supabase upsert.
5. **ROI size mismatch:** The revenue bar chart is no longer stretched to the height of the scorecard. It shows totals for revenue, cash/staff-time cost and return, plus six compact activity rows. The scorecard starts with five relevant milestones and a working disclosure control for the rest; full tables below remain intact.
6. **Settings text wall:** Categorized, keyboard accessible native disclosure controls replace the single mass of comma-separated list values. All original vocabulary and configuration inputs are preserved. Dark settings lists, help text and details have explicit contrast styles.
7. **Daylight surfaces:** Warmly separated green, sage, teal and bronze-cream paper colors replace the broad uniform white/cream treatment, while dark forest/bronze style remains. Motion stays subtle and supports prefers-reduced-motion.
8. **Header image seam and triangles:** A page-specific header art group now uses soft gradients and masking, not a straight-cut image layer. Each header has a **distinct image sourced from the client's public Torus Medicine site** and a triangle orientation that alternates across pages, combined with different sacred geometry motifs.
9. **Mandala:** The existing Canvas2D renderer now generates perspective-projected, depth-ordered sacred geometry loops and tilted orbits (no heavyweight WebGL addition). The original site's `torus22` geometry image is lightly layered beneath. It is an *original, interactive interpretation*; it is **not** presented as an exact reconstruction of the client's original video.

## Original site visual sources

Site: https://torusmedicine.com/. Assets are optimized images derived from its public Webflow library for this client dashboard. Confirm client permission before redistributing beyond the project. Each is deployed locally, without external image requests at runtime:

| Route | Original artwork file | Triangle orientation |
| --- | --- | --- |
| Partners | `dashboard/assets/brand-torus7.webp` | Point down |
| Partner detail | `brand-torus25.webp` | Point up |
| Patients | `brand-torus9.webp` | Point down |
| Pipeline | `brand-torus26.webp` | Point up |
| Events | `brand-torus22.webp` | Point down |
| Event detail | `brand-torus30.webp` | Point up |
| Sources & ROI | `brand-torus23.webp` | Point down |
| Settings | `brand-torus31.webp` | Point up |
| Calendar | `brand-torus8.webp` | Point down |

Today keeps the original visual Torus hero instead of adding another generic header. The full calendar also has one integrated header only.

## Integration honesty and privacy

- The public Vercel preview is still built with **fictional in-browser sample data**, not actual Torus client data.
- The existing live Supabase save helpers and realtime propagation have **not** been replaced. The repository's mock-live test suite verifies auth and partner/event writes without connecting to real customer records.
- Google Sheets synchronization is **not connected**. Calendar CSV exports remain available and can be imported into Sheets, but two-way sync requires authorized Google credentials, a spreadsheet ID, reliable conflict handling and a privacy review. Never expose credentials or patient data in a public browser build.
- Patient details stay in IntakeQ; the BD dashboard is counts-only for patient leads.

## Verification commands

```
node --check dashboard/app.js
node --check dashboard/torus-visuals.js
node --check dashboard/experience-v3.js
python scripts/visual_regression.py
python scripts/experience_regression.py
python scripts/experience_v4_regression.py
python scripts/func.py
python scripts/live_test.py
```

The two legacy CRM scripts may require adapting the executable path to the installed Chromium binary in some environments (no app changes required). V4 regression verifies a single visible header, in-place Today day selection, whole-cell calendar interaction without hijacking event links, six accessible pipeline stages without clipping, compact ROI/Settings, both theme controls, route-specific artworks, and the 3D field. Additional browser sweep covered 10 routes at 320, 360, 375, 430, 768, 1024, 1280 and 1440 pixels, in both themes, with no document-wide horizontal overflow.

## Screenshots

All previews are real browser captures of dashboard code rather than fabricated mockups. `docs/screenshots/v4-*.jpg` includes Today, Calendar, ROI, Settings and Pipeline in selected themes and form factors.

## Frameworks

This remains zero-dependency static HTML/CSS/Canvas2D as established. The refinements apply the usable system rules in [`SacredRebel/dashboard-tools-`](https://github.com/SacredRebel/dashboard-tools-): clear hierarchy and navigation, readable data surfaces, lightweight intentional motion, interactive calendars, responsive controls and reduced-motion support. No unnecessary design framework was added.
