#!/usr/bin/env node
/*
 * Verify every asset referenced by index.html exists on disk, and that the
 * page videos are byte-identical to the presentation run they were copied from.
 *
 * Usage: node scripts/check-assets.js [presentation-run-dir]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const refs = [...new Set(
  // href is included so the <link rel="icon"> favicon and local stylesheet are
  // covered too; external CDN hrefs and in-page #anchors are filtered below.
  [...html.matchAll(/(?:src|poster|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !/^(?:https?:)?\/\//.test(u) && !u.startsWith('#'))
)];

let missing = 0;
for (const ref of refs) {
  const rel = ref.split('?')[0];
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) {
    console.log('OK   ' + ref);
  } else {
    console.log('MISS ' + ref);
    missing += 1;
  }
}
console.log('---');
console.log('refs=' + refs.length + ' missing=' + missing);

// Every <video> must carry a poster icon so the result grid renders a still
// before the clip is decoded (the grid is lazily loaded and muted).
const tagRe = /<video\b[^>]*>/g;
const tags = [...html.matchAll(tagRe)].map((m) => m[0]);
const videos = [];
let missingPoster = 0;
for (const tag of tags) {
  const src = (tag.match(/\ssrc="([^"]+)"/) || [])[1];
  const poster = (tag.match(/\sposter="([^"]+)"/) || [])[1];
  if (src) videos.push(src);
  if (src && !poster) {
    console.log('NOTE no poster for ' + src);
    missingPoster += 1;
  }
}
console.log('---');
console.log('video elements=' + tags.length + ' with src=' + videos.length + ' without poster=' + missingPoster);

const runDir = path.resolve(process.argv[2] || path.join(root, 'presentation-s2026-a3e31ff2baf9'));
if (!fs.existsSync(runDir)) {
  console.log('---');
  console.log('presentation run not found, skipping provenance check: ' + runDir);
  process.exit(missing === 0 ? 0 : 1);
}

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const mapping = [
  ['overlay.mp4', 'assets/media/overlay_rgb.mp4'],
  ['source_rgb.mp4', 'assets/media/source_rgb.mp4'],
  ['overlay_p.mp4', 'assets/media/overlay_pressure.mp4'],
  ['overlay_vel.mp4', 'assets/media/overlay_velocity.mp4'],
  ['overlay_adv.mp4', 'assets/media/overlay_accel.mp4'],
  ['overlay_col.mp4', 'assets/media/overlay_collision.mp4'],
  ['overlay_n.mp4', 'assets/media/overlay_density.mp4'],
];
const stills = [
  ['initial_image.png', 'assets/figures/case_initial_image.png'],
  ['channel_timelines.png', 'assets/figures/case_channel_timelines.png'],
  ['initial_image.png', 'assets/figures/poster_source_rgb.png'],
  ['field_p.png', 'assets/figures/poster_pressure.png'],
  ['field_vel.png', 'assets/figures/poster_velocity.png'],
  ['field_adv.png', 'assets/figures/poster_accel.png'],
  ['field_col.png', 'assets/figures/poster_collision.png'],
  ['field_n.png', 'assets/figures/poster_density.png'],
  ['field_vel.png', 'assets/figures/poster_overlay_rgb.png'],
];

console.log('---');
let drift = 0;
for (const [src, dst] of mapping.concat(stills)) {
  const a = path.join(runDir, src);
  const b = path.join(root, dst);
  if (!fs.existsSync(a) || !fs.existsSync(b)) {
    console.log('MISS ' + src + ' -> ' + dst);
    drift += 1;
    continue;
  }
  const same = sha(a) === sha(b);
  if (!same) drift += 1;
  console.log((same ? 'MATCH ' : 'DRIFT ') + dst + '  <-  ' + src);
}
console.log('---');
console.log('provenance drift=' + drift);

// One run, one render: some page assets are deliberately the same bytes as
// another page asset (README's alias table). Assert exactly those pairs - a new
// match means a silent copy, a missing one means a genuinely distinct render
// the README no longer describes.
const expectedAliases = [
  'assets/figures/case_initial_image.png == assets/figures/poster_source_rgb.png',
  'assets/figures/poster_overlay_rgb.png == assets/figures/poster_velocity.png',
  'assets/media/overlay_pressure.mp4 == assets/media/overlay_rgb.mp4',
].sort();
const byHash = new Map();
for (const ref of refs) {
  if (!/\.(?:mp4|png)$/.test(ref)) continue;
  const h = sha(path.join(root, ref));
  byHash.set(h, [...(byHash.get(h) || []), ref]);
}
const foundAliases = [...byHash.values()]
  .filter((g) => g.length > 1)
  .map((g) => g.sort().join(' == '))
  .sort();
const aliasesOk = foundAliases.length === expectedAliases.length
  && foundAliases.every((a, i) => a === expectedAliases[i]);
console.log((aliasesOk ? 'ALIASES OK' : 'ALIASES DRIFT')
  + ' page-asset aliases=' + foundAliases.length + ' expected=' + expectedAliases.length);
if (!aliasesOk) {
  console.log('  expected: ' + expectedAliases.join(' | '));
  console.log('  found:    ' + foundAliases.join(' | '));
}

console.log('---');
process.exit(missing === 0 && drift === 0 && missingPoster === 0 && aliasesOk ? 0 : 1);
