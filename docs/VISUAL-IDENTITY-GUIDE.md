# Torus Mind & Medicine — Visual Identity v1

This changes the **presentation layer** of the existing Torus Mind & Medicine BD CRM. It preserves original CRM logic, hash routes, forms, Supabase settings, schema, partner/event records, and demo/live modes. No patient information or tracking has been added.

## Preview

Open **dashboard/visual-preview.html** directly in a browser. It is a **self-contained visual study**, with all styles and animation inline, to avoid the missing-CSS/missing-JS bug in the original preview. Preview data is illustrative and is NOT CRM data.

## Live UI integration

- `dashboard/torus-visuals.css` extends the existing design tokens with a dark moss sidebar, layered forest-toned welcome band, champagne/gold geometry, card and KPI polish, and responsive sizing.
- `dashboard/torus-visuals.js` adds a dependency-free Canvas2D parametric torus animation (drag to orbit, pause/play; reduced motion and visibility support). It replaces only the `svg.torus` placeholder in the overview welcome band and remounts after SPA rerenders.
- `dashboard/index.html` now loads both files **after** the original CSS/JS. Main application remains unchanged.

## Review before merging upstream

1. Start `npm run dev` and inspect real CRM `#today`, `#partners`, `#patients`, `#pipeline`, `#events`, `#sources`, `#calendar`, `#setup` at 1280 and 375 widths.
2. Run `python3 scripts/shoot.py`, `python3 scripts/func.py`, `python3 scripts/live_test.py` in an environment with browser dependencies.
3. Verify the welcome band's canvas renders and animates, pause works, cards remain legible, sidebar nav routes work, and no horizontal overflow is introduced on phones.
4. Confirm no console errors, and that reduced-motion preferences are honored.
5. Obtain approval and original web-licensed artwork, logo, and a video of the real torus motion before claiming animation fidelity. Do not confuse this original procedural illustration with the client's actual artwork.

## Brand source

Palette comes from the existing `dashboard/torus-theme.css` and `docs/brief.md` brand notes (moss #4a6457, solar resin #a37c3f, golden haze #ffe5bd, moon dust #e9e5de, obsidian #272d32). Figura Sans is a licensed typeface; Jost remains the existing fallback.

## Deployment safety

This is in the separate fork `SacredRebel/TorusMindDashboard-visual`; no changes are applied to the original `kimdudine/TorusMindDashboard` repository. This fork's `main` branch hosts the visual integration, with original backend behavior intact.
