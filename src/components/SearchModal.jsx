import { useMemo, useState } from 'react';
import { TRACKER_DATA, LC_TO_DAYS, LC_TITLES } from '../lib/tracker-data';
import { lcURL } from '../lib/utils';
import { toast } from '../lib/toast';

const DAYS = TRACKER_DATA.days;
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export default function SearchModal({ s, onClose, onOpenDay }) {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState(null); // null | {lc, title, url, targetDay}
  const [targetDay, setTargetDay] = useState('');

  const numeric = /^\d+$/.test(q.trim());
  const qn = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (!qn) return null;
    if (numeric) {
      const id = qn;
      const hits = (LC_TO_DAYS[id] || []).filter(h => !s.excluded[h.day]);
      const inPatterns = LC_TITLES.some(x => String(x.n) === id);
      const extra = s.extras.filter(e => e.lc === id);
      return { kind: 'num', id, hits, inPatterns, extra };
    }
    // title search
    const hits = [];
    for (const d of DAYS) {
      if (s.excluded[d.id]) continue;
      d.items.forEach((it, i) => {
        if (s.removed[d.id] && s.removed[d.id][i]) return;
        if (norm(it.n).includes(norm(qn))) hits.push({ day: d.id, idx: i, title: it.n, url: it.u });
      });
    }
    const extras = s.extras.filter(e => norm(e.title).includes(norm(qn)));
    const inPatterns = LC_TITLES.filter(x => norm(x.t).includes(norm(qn))).slice(0, 12);
    return { kind: 'text', hits: hits.slice(0, 30), extras, inPatterns };
  }, [qn, numeric, s]);

  const startAdd = (lc, title) => {
    setMode({ lc: lc || '', title: title || q, url: lc ? lcURL(lc, title) : '', targetDay: '' });
  };

  const submitAdd = async where => {
    const day = where === 'scheduled' ? (parseInt(targetDay, 10) || null) : null;
    try {
      await s.addExtra({ lc: mode.lc || null, title: mode.title, url: mode.url, targetDay: day });
      toast(day ? `<b>Added to Day ${day}.</b> It's yours to schedule.` : '<b>Saved for later.</b> It sits in your extra-questions queue.');
      onClose();
    } catch (e) { toast('Could not add: ' + (e.message || 'error')); }
  };

  return (
    <div className="modal-bk on" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ position: 'relative' }}>
        <button className="icon-btn modal-close" onClick={onClose}>✕</button>
        <h3>⌕ Search the plan</h3>
        <p style={{ color: 'var(--text-mute)', fontSize: 13 }}>
          Search by question name or <b>LeetCode number</b> — instantly see if it's in your 400 days.
        </p>
        <input className="search-in" style={{ width: '100%', marginBottom: 12 }} autoFocus
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="e.g. 76, 560, or “Minimum Window Substring”…" />

        {results && !mode && (
          <div>
            {results.kind === 'num' && (
              <div>
                {results.hits.length > 0 && (
                  <div className="auth-ok">✅ Found in your plan — {results.hits.length} place{results.hits.length > 1 ? 's' : ''}:</div>
                )}
                {results.hits.length > 0 && results.hits.map((h, i) => (
                  <a key={i} className="lc" style={{ marginBottom: 6 }} onClick={() => { onClose(); onOpenDay(h.day); }}>
                    <span className="lc-id">#{results.id}</span>
                    <span className="lc-t">{h.title}</span>
                    <span className="lc-day">Day {h.day} →</span>
                  </a>
                ))}
                {results.extra.map(e => (
                  <div key={e.id} className="lc" style={{ marginBottom: 6 }}>
                    <span className="lc-id">#{e.lc}</span><span className="lc-t">{e.title}</span>
                    <span className="lc-day">your extra · {e.status === 'done' ? 'done' : e.target_day ? `Day ${e.target_day}` : 'later'}</span>
                  </div>
                ))}
                {results.hits.length === 0 && results.extra.length === 0 && (
                  <div className="auth-err">
                    Not in your 400-day plan{results.inPatterns ? ' (it is covered in Pattern Master)' : ''}.<br />
                    <button className="btn btn-soft btn-sm" style={{ marginTop: 8 }} onClick={() => startAdd(results.id, LC_TITLES.find(x => String(x.n) === results.id)?.t || `LeetCode ${results.id}`)}>
                      + Add this question
                    </button>
                  </div>
                )}
              </div>
            )}
            {results.kind === 'text' && (
              <div>
                {results.hits.length > 0 && <div className="auth-ok">Found {results.hits.length} in your plan:</div>}
                {results.hits.map((h, i) => (
                  <a key={i} className="lc" style={{ marginBottom: 6 }} onClick={() => { onClose(); onOpenDay(h.day); }}>
                    <span className="lc-id">D{h.day}</span>
                    <span className="lc-t">{h.title}</span>
                    <span className="lc-day">open →</span>
                  </a>
                ))}
                {results.extras.map(e => (
                  <div key={e.id} className="lc" style={{ marginBottom: 6 }}>
                    <span className="lc-id">＋</span><span className="lc-t">{e.title}</span>
                    <span className="lc-day">{e.status === 'done' ? 'done' : 'your extra'}</span>
                  </div>
                ))}
                {results.hits.length === 0 && results.extras.length === 0 && (
                  <div className="auth-err">
                    Not found in your plan.
                    {results.inPatterns.length > 0 && (
                      <div style={{ marginTop: 6, fontSize: 12 }}>In Pattern Master: {results.inPatterns.slice(0, 4).map(x => x.t).join(', ')}</div>
                    )}
                    <button className="btn btn-soft btn-sm" style={{ marginTop: 8 }} onClick={() => startAdd('', q)}>+ Add this question</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {mode && (
          <div className="card" style={{ background: 'var(--bg-sunken)' }}>
            <div className="card-t">Add a question</div>
            <div className="field"><label>LeetCode number (optional)</label>
              <input value={mode.lc} onChange={e => setMode({ ...mode, lc: e.target.value })} placeholder="e.g. 76" /></div>
            <div className="field"><label>Title</label>
              <input value={mode.title} onChange={e => setMode({ ...mode, title: e.target.value })} /></div>
            <div className="field"><label>Link (optional)</label>
              <input value={mode.url} onChange={e => setMode({ ...mode, url: e.target.value })} placeholder="https://leetcode.com/problems/…" /></div>
            <div className="field"><label>Schedule on a day (optional) — leave blank to save for later</label>
              <input type="number" min="1" max="400" value={targetDay} onChange={e => setTargetDay(e.target.value)} placeholder="day number" /></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setMode(null)}>‹ Back</button>
              <button className="btn btn-primary btn-sm" onClick={() => submitAdd('later')}>Save for later</button>
              <button className="btn btn-soft btn-sm" disabled={!targetDay} onClick={() => submitAdd('scheduled')}>
                Schedule on Day {targetDay || '…'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
