#!/usr/bin/env node
/*
 * Structural sanity check for index.html plus the asset/provenance check.
 * Verifies: every referenced asset exists, every <video> has src + poster,
 * every video figure is a plain .image-fig (no overlay icon), tag balance.
 *
 * Usage: node scripts/check-page.js
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let fail = 0;

const check = (ok, label) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + label);
  if (!ok) fail += 1;
};

// 0. no mojibake: no U+FFFD and valid UTF-8 in the served text files
//    ponytail: only the files we hand-edit; extend the list if more get localized.
const textFiles = ['index.html', ...fs.readdirSync(path.join(root, 'assets/css'))
  .filter((f) => f.endsWith('.css')).map((f) => 'assets/css/' + f)];
const garbled = textFiles.filter((f) => {
  const buf = fs.readFileSync(path.join(root, f));
  return buf.includes(Buffer.from([0xef, 0xbf, 0xbd]))
    || !Buffer.from(buf.toString('utf8'), 'utf8').equals(buf);
});
check(garbled.length === 0, `no U+FFFD / invalid UTF-8 in ${textFiles.length} text files`
  + (garbled.length ? ' -> ' + garbled.join(', ') : ''));

// 1. asset references resolve
const refs = [...new Set(
  [...html.matchAll(/(?:src|poster)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => !/^(?:https?:)?\/\//.test(u) && !u.startsWith('#'))
)];
const missing = refs.filter((r) => !fs.existsSync(path.join(root, r.split('?')[0])));
check(missing.length === 0, `all ${refs.length} asset refs resolve` + (missing.length ? ' -> ' + missing.join(', ') : ''));

// 2. every <video> has src and poster
const tags = [...html.matchAll(/<video\b[^>]*>/g)].map((m) => m[0]);
const noPoster = tags.filter((t) => !/\sposter="/.test(t));
check(tags.length >= 8, `<video> count = ${tags.length}`);
check(noPoster.length === 0, 'every <video> has a poster');

// 3. every figure that wraps a video is a plain image-fig with no overlay icon
const media = [...html.matchAll(/<figure class="([^"]*)">([\s\S]*?)<\/figure>/g)];
const videoFigs = media.filter((m) => /<video/.test(m[2]));
const badFigs = videoFigs.filter((m) => /video-fig/.test(m[1]));
check(videoFigs.length === 7, `video figures = ${videoFigs.length}`);
check(badFigs.length === 0, 'no video figure carries a play-glyph class');

// 4. no play-glyph asset is still referenced anywhere
check(!/video_icon/.test(html), 'no video_icon reference in markup');

// 5. no leftover "assets/media/" ref pointing at a missing file
const mediaRefs = [...new Set([...html.matchAll(/assets\/media\/[^"]+/g)].map((m) => m[0]))];
check(mediaRefs.length === 7, `distinct media refs = ${mediaRefs.length}`);

// 6. basic tag balance for the containers we touched
const open = (html.match(/<div\b/g) || []).length;
const close = (html.match(/<\/div>/g) || []).length;
check(open === close, `<div> balance ${open}/${close}`);
const fopen = (html.match(/<figure\b/g) || []).length;
const fclose = (html.match(/<\/figure>/g) || []).length;
check(fopen === fclose, `<figure> balance ${fopen}/${fclose}`);
const sopen = (html.match(/<section\b/g) || []).length;
const sclose = (html.match(/<\/section>/g) || []).length;
check(sopen === sclose, `<section> balance ${sopen}/${sclose}`);

// 7. licence attribution: the page is a derivative of an MIT template, so the
//    notice must ship with it. Guard the footer credit (not just the head
//    comment) plus the Font Awesome CC BY 4.0 icon credit.
//    ponytail: .md extension so GitHub Pages serves text/plain instead of an
//    application/octet-stream download; GitHub still detects it as the licence.
check(fs.existsSync(path.join(root, 'LICENSE.md')), 'LICENSE.md present');
const footer = (html.match(/<footer[\s\S]*?<\/footer>/) || [''])[0];
check(/eliahuhorwitz\/Academic-project-page-template/.test(footer),
  'footer credits the MIT page template');
check(/\bMIT\b/.test(footer), 'footer states the template licence');
check(/fontawesome\.com/.test(footer), 'footer keeps the Font Awesome CC BY 4.0 credit');
check(/href="LICENSE\.md"/.test(footer), 'footer links the licence file');

console.log('---');
try {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'check-assets.js')], { cwd: root });
  process.stdout.write(out.toString());
} catch (err) {
  fail += 1;
  console.log('FAIL check-assets.js');
  process.stdout.write((err.stdout || '').toString());
  process.stderr.write((err.stderr || '').toString());
}

console.log('---');
console.log(fail === 0 ? 'PAGE OK' : 'PAGE FAILURES=' + fail);
process.exit(fail === 0 ? 0 : 1);
