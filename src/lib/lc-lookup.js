import { lcInfo } from './lc-titles';

/* Fallback lookup against the live LeetCode index — used when a number is
   missing from the bundled lc-titles.js (e.g. a brand-new problem).
   The full list is fetched once and cached in memory. */

let _cache = null;   // number → { n, t, slug, url }
let _promise = null;

export async function loadLiveIndex() {
  if (_cache) return _cache;
  if (_promise) return _promise;
  _promise = fetch('https://leetcode.com/api/problems/all/')
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(j => {
      const m = {};
      for (const p of (j.stat_status_pairs || [])) {
        const s = p.stat;
        if (!s || !s.frontend_question_id || !s.question__title_slug) continue;
        m[s.frontend_question_id] = {
          n: s.frontend_question_id,
          t: s.question__title,
          slug: s.question__title_slug,
          url: 'https://leetcode.com/problems/' + s.question__title_slug + '/',
        };
      }
      _cache = m;
      return m;
    })
    .catch(() => { _promise = null; return null; });
  return _promise;
}

/* local index first, then the live API if the number is missing */
export async function lcInfoAny(n) {
  const local = lcInfo(n);
  if (local) return local;
  const live = await loadLiveIndex();
  return live ? live[n] || null : null;
}
