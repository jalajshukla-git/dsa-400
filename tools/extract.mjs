// One-time extraction: pull the 40 patterns + 400-day data out of the source files
// into ESM modules, and build the LeetCode <-> DSA-400 cross-reference.
import fs from 'node:fs';

const ROOT = process.cwd();
const html = fs.readFileSync(ROOT + '/../uploads/dsa_Patterns_new.html', 'utf8');

/* ── 1. extract P (20 core) + D (20 DP) by evaluating the data region ── */
const start = html.indexOf('const P=[]');
const end = html.indexOf('/* ═══════════════════════════════════════════════════════════════════════\n   ENGINE');
if (start < 0 || end < 0) throw new Error('data region not found');
const region = html.slice(start, end);

let P, D;
try {
  const fn = new Function(region + '\nreturn {P, D};');
  ({ P, D } = fn());
} catch (e) {
  console.error('eval failed:', e.message);
  process.exit(1);
}
if (!Array.isArray(P) || P.length !== 20) throw new Error('P wrong: ' + (P && P.length));
if (!Array.isArray(D) || D.length !== 20) throw new Error('D wrong: ' + (D && D.length));
console.log('patterns extracted:', P.length, 'core +', D.length, 'DP');

/* ── 2. tracker data ── */
const raw = fs.readFileSync(ROOT + '/../dsa400-tracker/data.js', 'utf8');
const j = raw.indexOf('{');
const tracker = JSON.parse(raw.slice(j, raw.lastIndexOf('}') + 1));
if (!Array.isArray(tracker.days) || tracker.days.length !== 400) throw new Error('days wrong');
console.log('tracker days:', tracker.days.length, 'units:', tracker.units.length, 'phases:', tracker.phases.length);

/* ── 3. LeetCode slug helper (mirror of the app's lcSlug + LCX overrides) ── */
const LCX = { 15:'3sum',74:'search-a-2d-matrix',92:'reverse-linked-list-ii',167:'two-sum-ii-input-array-is-sorted',191:'number-of-1-bits',240:'search-a-2d-matrix-ii',518:'coin-change-ii',876:'middle-of-the-linked-list',643:'maximum-average-subarray-i',2266:'count-number-of-texts',130:'surrounded-regions',133:'clone-graph' };
const lcSlug = t => LCX[t] || String(t).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-');
const slugFromUrl = u => {
  if (!u || typeof u !== 'string') return null;
  const m = u.match(/leetcode\.com\/problems\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : null;
};
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/* ── 4. build indexes over the tracker ── */
const slugIndex = new Map();   // slug -> [{day, idx, title}]
const titleIndex = new Map();  // norm(title) -> [{day, idx, title}]
for (const d of tracker.days) {
  d.items.forEach((it, idx) => {
    const slug = slugFromUrl(it.u);
    if (slug) {
      if (!slugIndex.has(slug)) slugIndex.set(slug, []);
      slugIndex.get(slug).push({ day: d.id, idx, title: it.n });
    }
    const t = norm(it.n);
    if (!titleIndex.has(t)) titleIndex.set(t, []);
    titleIndex.get(t).push({ day: d.id, idx, title: it.n });
  });
}

/* ── 5. cross-reference: LC number -> tracker day(s)  ── */
const LC_TO_DAYS = {};   // lcNumber(string) -> [{day, idx, title}]
const LC_TO_PATTERN = {};// lcNumber -> {name, id}
const matchDay = (id, title) => {
  const slug = lcSlug(title);
  if (slugIndex.has(slug)) return slugIndex.get(slug);
  // title aliases
  const ALIAS = {
    'best time to buysell stock': 'best time to buy and sell stock',
    'best time to buysell stock ii': 'best time to buy and sell stock ii',
    'best time to buysell stock iii': 'best time to buy and sell stock iii',
    'powxn': 'powx n',
  };
  const n = norm(title);
  if (titleIndex.has(n)) return titleIndex.get(n);
  if (ALIAS[n] && titleIndex.has(ALIAS[n])) return titleIndex.get(ALIAS[n]);
  return null;
};
for (const p of P) {
  for (const q of (p.practice || [])) {
    const id = String(q[0]), title = q[1];
    const hits = matchDay(id, title);
    if (hits && hits.length) {
      LC_TO_DAYS[id] = hits;
      LC_TO_PATTERN[id] = { name: p.name, id: p.id };
    }
  }
}
let matched = Object.keys(LC_TO_DAYS).length;
let totalLc = P.reduce((a, p) => a + (p.practice || []).length, 0);
console.log('cross-ref: matched', matched, 'of', totalLc, 'pattern practice problems to tracker days');

/* ── 6. write modules ── */
const w = (path, body) => { fs.writeFileSync(path, body); console.log('wrote', path, (body.length / 1024).toFixed(1) + 'KB'); };

w(ROOT + '/src/lib/patterns-data.js',
  '/* AUTO-GENERATED from dsa_Patterns_new.html — do not edit by hand. */\n' +
  'export const P = ' + JSON.stringify(P) + ';\n\n' +
  'export const D = ' + JSON.stringify(D) + ';\n');

w(ROOT + '/src/lib/tracker-data.js',
  '/* AUTO-GENERATED from dsa400-tracker/data.js — do not edit by hand. */\n' +
  'export const TRACKER_DATA = ' + JSON.stringify(tracker) + ';\n' +
  'export const LC_TO_DAYS = ' + JSON.stringify(LC_TO_DAYS) + ';\n' +
  'export const LC_TO_PATTERN = ' + JSON.stringify(LC_TO_PATTERN) + ';\n' +
  'export const LC_TITLES = ' + JSON.stringify(
    P.flatMap(p => (p.practice || []).map(q => ({ n: q[0], t: q[1], pat: p.name, pid: p.id })))
  ) + ';\n');

console.log('DONE');
