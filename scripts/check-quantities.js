#!/usr/bin/env node
// Re-derives the per-frame numbers the page relies on, straight from the run CSV.
// Run: node scripts/check-quantities.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__dirname, '..', 'presentation-s2026-a3e31ff2baf9');
const CSV = path.join(DIR, 'physical_quantities.csv');
const SUM = path.join(DIR, 'physics_summary.csv');

const rows = fs.readFileSync(CSV, 'utf8').trim().split(/\r?\n/);
const head = rows[0].split(',');
const data = rows.slice(1).map((l) => {
  const c = l.split(',');
  return Object.fromEntries(head.map((k, i) => [k, Number(c[i])]));
});
const col = (k) => data.map((r) => r[k]);
const last = (k) => data[data.length - 1][k];

let fail = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
};

const velMean = col('vel_mean_mps');
const velMax = col('vel_max_mps');
const pMax = col('p_max_Pa');
const colMax = col('col_max_mps');
const nfs = col('nfs_count');
const peak = data.reduce((a, b) => (b.vel_mean_mps > a.vel_mean_mps ? b : a));

console.log(`rows=${data.length} dt=${data[1].time_sec - data[0].time_sec}s duration=${last('time_sec').toFixed(2)}s`);

// 0.8 m/s is the peak of the *mean* velocity, not the max.
check('peak vel_mean ~= 0.847 m/s', Number(peak.vel_mean_mps.toFixed(4)), 0.8467);
check('peak frame = 92 (t=3.833s)', [peak.frame, Number(peak.time_sec.toFixed(4))], [92, 3.8333]);
check('vel_max median sits on the 3.0 ceiling', Math.abs([...velMax].sort((a, b) => a - b)[60] - 3.0) < 0.01, true);

// Clamp detection: repeated exact ceilings are numerical clips, not measurements.
const near = (arr, v, tol) => arr.filter((x) => Math.abs(x - v) <= tol).length;
check('vel_max clamped in [2.99,3.01]', near(velMax, 3.0, 0.01), 85);
check('vel_max clamped at 4.00', near(velMax, 4.0, 0.01), 3);
check('p_max == 12000 Pa exactly', pMax.filter((x) => x === 12000).length, 106);

// Dead columns: constant values carry no information.
check('density_ratio_max constant 1.0', new Set(col('density_ratio_max')).size, 1);
check('adv_mean_mps2 constant g', new Set(col('adv_mean_mps2')).size, 1);
check('fluid_nodes constant (no mass exchange)', new Set(col('fluid_nodes')).size, 1);

// Collision channel contradicts the velocity ceiling.
check('col_max exceeds vel clamp', Math.max(...colMax) > Math.max(...velMax), true);

// Saturation correlates with the peak: cleanest frame wins.
check('peak frame has near-zero saturation', peak.nfs_count <= 5, true);
console.log(`     saturation: mean ${(nfs.reduce((a, b) => a + b, 0) / nfs.length).toFixed(1)}/${data[0].fluid_nodes} `
  + `(${((nfs.reduce((a, b) => a + b, 0) / nfs.length / data[0].fluid_nodes) * 100).toFixed(1)}%), max ${Math.max(...nfs)}`);

// physics_summary.csv is a byte-identical duplicate.
const h = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const dup = fs.existsSync(SUM) && h(CSV) === h(SUM);
check('physics_summary.csv duplicates physical_quantities.csv', dup, true);

console.log(fail ? `\nQUANTITIES DRIFT: ${fail} claim(s) no longer hold` : '\nQUANTITIES OK');
process.exit(fail ? 1 : 0);