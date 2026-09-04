import { lcInfo } from './lc-titles';

/* detect the platform of a link */
export const judgeFromUrl = u => {
  const s = String(u || '');
  if (/leetcode\.com/i.test(s)) return { j: 'LC', label: 'LeetCode' };
  if (/codeforces\.com/i.test(s)) return { j: 'CF', label: 'Codeforces' };
  if (/geeksforgeeks\.org/i.test(s)) return { j: 'GFG', label: 'GFG' };
  if (/cses\.fi/i.test(s)) return { j: 'CSES', label: 'CSES' };
  if (/spoj\.com/i.test(s)) return { j: 'SPOJ', label: 'SPOJ' };
  if (/atcoder\.jp/i.test(s)) return { j: 'AC', label: 'AtCoder' };
  return { j: 'OTHER', label: 'Link' };
};

export const JCLS = { LC: 'j-lc', GFG: 'j-gfg', CSES: 'j-cses', CF: 'j-cf', SPOJ: 'j-spoj', AC: 'j-user', OTHER: 'j-user', USER: 'j-user' };

/* Resolve one import line into { lc, title, url, platform }.
   Accepted forms:
     "460"                          → LeetCode 460 · LFU Cache
     "https://…/problems/…"         → linked question (platform detected)
     "{https://…:LFU Cache:460}"    → explicit link : name : number
     "LFU Cache : 460"              → name : number (LeetCode link resolved)  */
export function resolveImportToken(raw) {
  const tok = String(raw || '').trim();
  if (!tok) return null;

  // plain number → LeetCode
  if (/^\d+$/.test(tok)) {
    const info = lcInfo(tok);
    return { lc: tok, title: info ? info.t : `LeetCode ${tok}`, url: info ? info.url : 'https://leetcode.com/problems/', platform: 'LC' };
  }

  // link only
  if (/^https?:\/\//i.test(tok)) {
    const j = judgeFromUrl(tok);
    return { lc: null, title: `Imported · ${j.label}`, url: tok, platform: j.j };
  }

  // {link:Name:Question-no}
  const brace = tok.match(/^\{(https?:\/\/[^:{}]+):([^{}:]+)(?::([^{}]*))?\}$/i);
  if (brace) {
    const link = brace[1].trim();
    const name = brace[2].trim();
    const no = (brace[3] || '').trim();
    const lc = /^\d+$/.test(no) ? no : null;
    const j = judgeFromUrl(link);
    return { lc, title: name, url: link, platform: lc ? 'LC' : j.j };
  }

  // "Name : Number"
  const named = tok.match(/^(.+?)\s*:\s*(\d+)\s*$/);
  if (named) {
    const title = named[1].trim();
    const info = lcInfo(named[2]);
    return { lc: named[2], title, url: info ? info.url : 'https://leetcode.com/problems/', platform: 'LC' };
  }

  // plain title
  return { lc: null, title: tok, url: null, platform: 'OTHER' };
}
