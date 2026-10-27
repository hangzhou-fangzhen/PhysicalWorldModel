#!/usr/bin/env node
/*
 * Fetch the page over HTTP from a local preview server and assert the served
 * markup still carries every marker the replacement introduced.
 *
 * Usage: node scripts/serve.js 8321   (in one shell)
 *        node scripts/check-served.js [url]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const url = process.argv[2] || 'http://127.0.0.1:8321/';
const root = path.resolve(__dirname, '..');

http.get(url, (res) => {
  let body = '';
  res.on('data', (d) => (body += d));
  res.on('end', () => {
    const disk = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const n = (re) => (body.match(re) || []).length;
    // 7 result clips + the teaser (overlay_velocity) = 8 occurrences, 7 distinct files.
    const distinctMedia = new Set([...body.matchAll(/assets\/media\/[^"]+/g)].map((m) => m[0]));
    const rows = [
      ['status', res.statusCode, 200],
      ['plain video figures', n(/figure class="image-fig">\s*\n\s*<video/g), 7],
      ['teaser-media wrappers', n(/class="teaser-media"/g), 1],
      ['poster attributes', n(/poster="assets\/figures\//g), 8],
      ['media ref occurrences', n(/assets\/media\/[^"]+/g), 8],
      ['distinct media files', distinctMedia.size, 7],
      ['stale backup refs', n(/backup-orangejuice/g), 0],
      ['play-glyph refs', n(/video-fig|video_icon/g), 0],
      ['bytes match disk', body === disk ? 1 : 0, 1],
    ];
    let fail = 0;
    for (const [label, got, want] of rows) {
      const ok = got === want;
      if (!ok) fail += 1;
      console.log((ok ? 'PASS ' : 'FAIL ') + label + '  got=' + got + ' want=' + want);
    }
    console.log('---');
    console.log('served bytes=' + Buffer.byteLength(body) + ' disk bytes=' + Buffer.byteLength(disk));
    console.log(fail === 0 ? 'SERVED OK' : 'SERVED FAILURES=' + fail);
    process.exit(fail === 0 ? 0 : 1);
  });
}).on('error', (e) => {
  console.log('ERR ' + e.message + ' (is scripts/serve.js running?)');
  process.exit(1);
});
