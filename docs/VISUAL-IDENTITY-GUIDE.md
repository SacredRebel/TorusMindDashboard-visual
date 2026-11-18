# TORUS MIND & MEDICINE — VISUAL IDENTITY, NOVEMBER 2026

## Direction
A real dashboard presentation layer based on the visual style of https://torusmedicine.com. This is a **business-development/referral operations interface**, not a patient charting system.

## Authentic client assets
Source: the client website's public Webflow asset library.
- assets/torus-original-wordmark.png — original horizontal brand mark from the site.
- assets/torus-original-emblem.png — original brand square mark.
- assets/torus-watercolor.webp — optimized derivative of the client's watercolor background.
- assets/torus-ocean.webp — optimized derivative of the client's ocean imagery, retained for future brand use.
- Original logo-morph motion is streamed from the public site, but **only after the user presses Original**. It is not automatically fetched or bundled.
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
- Original: real source logo-morph video, requested on click, with browser playback controls.
- Slow/Flow/Fast speed control plus pause, reduced-motion, and visibility-aware animation.
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
