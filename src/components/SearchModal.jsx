import { useEffect, useMemo, useState } from 'react';
import { TRACKER_DATA, LC_TITLES } from '../lib/tracker-data';
import { LC_TO_DAYS } from '../lib/lc-plan';
import { lcInfo } from '../lib/lc-titles';
import { lcInfoAny } from '../lib/lc-lookup';
import { extraLabel } from '../lib/utils';
import { toast } from '../lib/toast';

const DAYS = TRACKER_DATA.days;
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export default function SearchModal({ s, onClose, onOpenDay }) {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState(null); // null | {lc, title, url, targetDay}
  const [targetDay, setTargetDay] = useState('');
  const [liveInfo, setLiveInfo] = useState(null);

  const numeric = /^\d+$/.test(q.trim());
  const qn = q.trim().toLowerCase();

  // live fallback: if the number isn't in the bundled index, hit the API once
  useEffect(() => {
    if (!numeric) { setLiveInfo(null); return; }
    const local = lcInfo(qn);
    if (local) { setLiveInfo(local); return; }
    let alive = true;
    lcInfoAny(qn).then(info => { if (alive && info) setLiveInfo(info); });
    return () => { alive = false; };
  }, [numeric, qn]);

  const results = useMemo(() => {
    if (!qn) return null;
    if (numeric) {
      const id = qn;
      const info = lcInfo(id) || liveInfo;          // bundled index → live fallback
      const hits = (LC_TO_DAYS[id] || []).filter(h => !s.excluded[h.day]);
      const inPatterns = LC_TITLES.some(x => String(x.n) === id);
      const extra = s.extras.filter(e => e.lc === id);
      return { kind: 'num', id, info, hits, inPatterns, extra };
    }
    // title / text search
    const hits = [];
    for (const d of DAYS) {
      if (s.excluded[d.id]) continue;
      d.items.forEach((it, i) => {
        if (s.removed[d.id] && s.removed[d.id][i]) return;
        if (norm(it.n).includes(norm(qn))) hits.push({ day: d.id, idx: i, title: it.n, url: it.u });
      });
    }
    const extras = s.extras.filter(e => norm(e.title).includes(norm(qn)));
    // matches in the full LeetCode index (Pattern Master + beyond)
    const lcMatches = [];
    for (const x of LC_TITLES) {
      if (norm(x.t).includes(norm(qn))) lcMatches.push(x);
    }
    return { kind: 'text', hits: hits.slice(0, 30), extras, lcMatches: lcMatches.slice(0, 10) };
  }, [qn, numeric, s, liveInfo]);

  const startAdd = (lc, title, url) => {
    setMode({ lc: lc || '', title: title || q, url: url || '', targetDay: '' });
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
          Search by question name or <b>LeetCode number</b> — the whole LeetCode index is linked, so <b>56</b> finds <b>56 · Merge Intervals</b> anywhere in your 400 days.
        </p>
        <input className="search-in" style={{ width: '100%', marginBottom: 12 }} autoFocus
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="e.g. 56, 460, 560, or “Merge Intervals”…" />

        {results && !mode && (
          <div>
            {results.kind === 'num' && (
              <div>
                <div className="auth-ok" style={{ marginBottom: 8 }}>
                  {results.info ? <>#{results.info.n} · <a href={results.info.url} target="_blank" rel="noopener noreferrer">{results.info.t}</a></> : <>#{results.id} · LeetCode problem</>}
                  {results.inPatterns ? <span className="chip chip-neutral" style={{ marginLeft: 8 }}>✦ in Pattern Master</span> : null}
                </div>
                {results.hits.length > 0 && <div className="auth-ok">✅ In your plan — {results.hits.length} place{results.hits.length > 1 ? 's' : ''}:</div>}
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
                    <button className="btn btn-soft btn-sm" style={{ marginTop: 8 }}
                      onClick={() => startAdd(results.id, results.info ? results.info.t : `LeetCode ${results.id}`, results.info ? results.info.url : 'https://leetcode.com/problems/')}>
                      ＋ Add #{results.id}{results.info ? ` · ${results.info.t}` : ''} to my plan
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
                    <span className="lc-id">＋</span><span className="lc-t">{extraLabel(e)}</span>
                    <span className="lc-day">{e.status === 'done' ? 'done' : 'your extra'}</span>
                  </div>
                ))}
                {results.lcMatches.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div className="auth-ok">Matching LeetCode problems:</div>
                    {results.lcMatches.map(x => (
                      <a key={x.n} className="lc" style={{ marginBottom: 6 }}
                        onClick={() => startAdd(String(x.n), x.t, lcInfo(x.n) ? lcInfo(x.n).url : 'https://leetcode.com/problems/')}>
                        <span className="lc-id">#{x.n}</span><span className="lc-t">{x.t}</span>
                        <span className="lc-day">＋ add</span>
                      </a>
                    ))}
                  </div>
                )}
                {results.hits.length === 0 && results.extras.length === 0 && results.lcMatches.length === 0 && (
                  <div className="auth-err">
                    Not found in your plan.
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
              <input value={mode.lc} onChange={e => setMode({ ...mode, lc: e.target.value })} placeholder="e.g. 460" /></div>
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
