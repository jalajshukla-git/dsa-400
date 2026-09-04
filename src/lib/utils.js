/* ── date helpers (local time, DST-safe noon normalisation) ── */
export const pad2 = n => String(n).padStart(2, '0');
export const ymd = dt => dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
export const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const todayIso = () => ymd(new Date());
export const dayDiff = (isoA, isoB) => Math.round((parseYmd(isoA) - parseYmd(isoB)) / 864e5);
export const dateForDay = (startDate, n) => { const d = parseYmd(startDate); d.setDate(d.getDate() + n - 1); return d; };
export const ymdForDay = (startDate, n) => ymd(dateForDay(startDate, n));
export const MN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const pretty = iso => { const d = parseYmd(iso); return `${MN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`; };
export const prettyShort = iso => { const d = parseYmd(iso); return `${d.getDate()} ${MN[d.getMonth()].slice(0,3)} ${String(d.getFullYear()).slice(2)}`; };

/* ── SHA-512 (Web Crypto) ── */
export async function sha512(text) {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
export const commitmentHash = async (statement, userId) =>
  sha512(String(statement).trim() + '::' + userId);

/* ── esc ── */
export const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ── misc ── */
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const lcSlug = t => String(t).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, '-');
export const lcURL = (id, title) => 'https://leetcode.com/problems/' + lcSlug(title) + '/';
