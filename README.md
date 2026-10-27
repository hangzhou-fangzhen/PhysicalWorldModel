# Physical World Model — fluid branch

Academic-style project page for the **Physical World Model**: a model that learns
how physical state evolves in a scene, rather than only how it looks.

This release is the **fluid branch**. Given a scene, the model infers the
physical initial condition and rolls the fluid's physical state forward — pressure,
velocity, acceleration, collision response and density ratio — and those fields
are drawn back onto the video so the behaviour is visible, not just the
appearance.

- Live page: https://hangzhou-fangzhen.github.io/WorldPhysicalModel/
- This repository contains **only the static project page** (HTML/CSS + figures
  + result media). No source code, notebooks, or model weights are published here.
- The page is deliberately **English-only** and **approach-level** — it introduces
  the model at a high level. The pipeline is intentionally not exposed.
- Scope of this release: **fluid scenes only** (single-phase, incompressible,
  free-surface). Other branches are not shown here.

## Structure

```
index.html                  single-page site (English)
LICENSE.md                  MIT notice for the page template + what it does not cover
assets/css/style.css        template-style overrides (Bulma + Font Awesome via CDN)
assets/logo.png             brand logo shown at the top of the page (raster, 554x84)
assets/figures/logo.svg     vector trace of logo.png, same 554x84 canvas; the tab icon
                            is its leading character (not referenced by the page)
assets/figures/             architecture diagram + wordmark + result figures + stills
                            + poster icons + favicon
assets/media/               example videos (visual seed + 5 physics overlays + combined overlay)
presentation-s2026-a3e31ff2baf9/  curated run output the page media is derived from
scripts/serve.js            zero-dependency local preview server
scripts/check-assets.js     link + provenance check for every referenced asset
scripts/check-page.js       structural check + runs check-assets.js
scripts/check-served.js     asserts the page served over HTTP keeps every marker
scripts/check-quantities.js sanity checks on the run's physical_quantities.csv
```

## Figures

| File | Description |
| --- | --- |
| `architecture.svg` | Inputs (image, text) → model → outputs (image, video, physical fields) |
| `case_initial_image.png` | Generated initial frame of the fluid scene |
| `case_channel_timelines.png` | Per-frame physical channels over the rollout |
| `poster_*.png` | Still icons used as the `poster` of each `<video>` |
| `logo.svg` | Vector trace of `assets/logo.png` on the same 554x84 canvas (source for the favicon) |
| `favicon.svg` | Tab icon: the leading character of `logo.svg`, black on a white rounded tile |

## Sample output assets

The media in the "Sample outputs" section is illustrative output of the fluid
branch. Every clip is served from `assets/media/` and carries a matching
`assets/figures/poster_*.png` icon so the grid shows a still before playback:

| Video | Poster icon | Description |
| --- | --- | --- |
| `source_rgb.mp4` | `poster_source_rgb.png` | Video of the scene (appearance) |
| `overlay_pressure.mp4` | `poster_pressure.png` | Pressure field |
| `overlay_velocity.mp4` | `poster_velocity.png` | Velocity field (also the page teaser) |
| `overlay_accel.mp4` | `poster_accel.png` | Acceleration field |
| `overlay_collision.mp4` | `poster_collision.png` | Collision response |
| `overlay_density.mp4` | `poster_density.png` | Density ratio |
| `overlay_rgb.mp4` | `poster_overlay_rgb.png` | Combined overlay |

### Where the media comes from

All result media on this page is curated from one documented pipeline run,
kept next to the page as `presentation-s2026-a3e31ff2baf9/` (the run directory
ships `physical_quantities.csv` / `physics_summary.csv`, the overlay clips and
the `field_*.png` grids that are rasterised into the `poster_*.png` stills
rather than shipped as `fields/*.npz`). The run's raw `frames/` (121 PNGs, ~45 MB)
is **not** published: the `frames/` rule in `.gitignore` keeps it in the local
working copy only. The whole directory is reachable on the live site, so it also
carries pipeline internals (`*_jupyter.mp4`, `overlay_progress.json`,
`overlay_status.json`) that no page asset is derived from.
The run's filenames are mapped onto the page's names:

| Run file | Page asset |
| --- | --- |
| `overlay.mp4` | `assets/media/overlay_rgb.mp4` |
| `source_rgb.mp4` / `video.mp4` | `assets/media/source_rgb.mp4` |
| `overlay_p.mp4` | `assets/media/overlay_pressure.mp4` |
| `overlay_vel.mp4` | `assets/media/overlay_velocity.mp4` |
| `overlay_adv.mp4` | `assets/media/overlay_accel.mp4` |
| `overlay_col.mp4` | `assets/media/overlay_collision.mp4` |
| `overlay_n.mp4` | `assets/media/overlay_density.mp4` |
| `initial_image.png` | `assets/figures/case_initial_image.png`, `poster_source_rgb.png` |
| `channel_timelines.png` | `assets/figures/case_channel_timelines.png` |
| `field_p.png` / `field_vel.png` / `field_adv.png` / `field_col.png` / `field_n.png` | `assets/figures/poster_*.png` |

The run's `field_*` names use abbreviations that no other artefact spells out:

| Run abbreviation | Channel | Page asset |
| --- | --- | --- |
| `p` | pressure | `poster_pressure.png` |
| `vel` | velocity | `poster_velocity.png` |
| `adv` | acceleration (advection) | `poster_accel.png` |
| `col` | collision response | `poster_collision.png` |
| `n` | density ratio | `poster_density.png` |

`physical_quantities.csv` and `physics_summary.csv` in the run directory are the
same bytes (identical hash), not two different products; the page treats them as
one per-frame statistics table.

Three pairs of **page** assets are the same case: one run, one render, so they
are byte-identical rather than two separate results. The page still shows both
members of each pair, and the labels say which channel the still came from:

| Page assets | Why they match |
| --- | --- |
| `overlay_pressure.mp4` / `overlay_rgb.mp4` | the run's `overlay_p.mp4` is byte-identical to `overlay.mp4`, so the "Pressure field" clip is the combined overlay; the pressure channel's own render survives as `poster_pressure.png` (from `field_p.png`) |
| `poster_velocity.png` / `poster_overlay_rgb.png` | both are rasterised from `field_vel.png`, so the combined overlay's poster is the velocity still |
| `case_initial_image.png` / `poster_source_rgb.png` | both are `initial_image.png`: the initial-frame figure and the appearance clip's poster |

`node scripts/check-assets.js` asserts exactly these three aliases and no
others, so a genuinely distinct render (or a silent copy) shows up as drift.

Run `node scripts/check-assets.js` to assert that every `src`/`poster` in
`index.html` resolves, that each `<video>` has a poster, and that each page
asset is still byte-identical to its source file in the run directory.

Run `node scripts/check-page.js` for the same checks plus structural
assertions (tag balance, every clip figure carrying the `.image-fig` class and
no play-glyph class, every `<video>` carrying a poster). It exits non-zero on
any failure.

Run `node scripts/check-served.js` with `scripts/serve.js` already listening to
assert the markup actually served over HTTP still carries every marker, and is
byte-identical to `index.html` on disk.

Run `node scripts/check-quantities.js` to re-derive the per-frame numbers the page
relies on (frame count, peak mean velocity, clamp saturation) straight from
`physical_quantities.csv`.

Superseded media is available from git history (commit `702609d` and earlier);
it is not referenced by the page.

### Playback

Each clip is wrapped in an `.image-fig` figure (the teaser in `.teaser-media`).
No overlay glyph is drawn over the video — playback uses the native
`<video controls>` UI, and the `poster` attribute paints the matching
`poster_*.png` still before the clip is decoded.

## Local preview

```powershell
node scripts/serve.js 8321
# open http://127.0.0.1:8321/
```

## Deployment

GitHub Pages, branch `main`, root folder.

## Attribution & license

This page is a derivative of the **Academic Project Page Template**
([eliahuhorwitz/Academic-project-page-template](https://github.com/eliahuhorwitz/Academic-project-page-template)),
which is MIT licensed. MIT requires the copyright and permission notice to travel
with every copy, so both are kept in [`LICENSE.md`](LICENSE.md) and the visible credit
sits in the page `<footer>`.

- `LICENSE.md` — MIT notice for the template (markup structure, layout, stylesheet
  conventions), scoped so it does **not** cover the page text, figures, videos or
  the run output.
- Page content (text, `assets/`, `presentation-s2026-a3e31ff2baf9/`) is
  &copy; 2026 Hangzhou Suochen Simulation Technology Co., Ltd.
- CDN dependencies keep their own licenses: Bulma (MIT), Font Awesome Free
  (icons **CC BY 4.0** — hence the footer credit, fonts SIL OFL 1.1, code MIT),
  Academicons (SIL OFL 1.1 / MIT), Google Fonts (Apache-2.0 or OFL per family).

`node scripts/check-page.js` asserts that the footer still credits the template
and Font Awesome and still links `LICENSE.md`, so a copy edit cannot silently drop
the attribution.

The `.md` extension is deliberate: GitHub Pages serves extensionless `LICENSE` as
`application/octet-stream` (a download) and `LICENSE.md` as plain text, and GitHub
still detects `LICENSE.md` as the repository licence.
