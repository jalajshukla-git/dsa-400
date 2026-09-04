import { useEffect, useMemo, useState } from 'react';
import { TRACKER_DATA } from '../lib/tracker-data';
import { effectiveItems } from '../hooks/useTrackerData';
import { ymdForDay, pretty, todayIso, dayDiff } from '../lib/utils';
import { toast } from '../lib/toast';

const PHASES = TRACKER_DATA.phases;
const N = TRACKER_DATA.days.length;

export default function TodayPanel({ s, day, setDay }) {
  const d = day;
  const locked = s.isLocked(d.id);
  const ph = PHASES.find(p => p.id === d.phase) || { id: '—', title: '' };
  const extrasForDay = s.extras.filter(e => e.target_day === d.id);
  const items = useMemo(() => effectiveItems(d, s, extrasForDay), [d, s, extrasForDay]);
  const doneN = items.filter(i => i.done).length;
  const allDone = items.length > 0 && doneN === items.length;
  const sealed = !!s.sealed[d.id];
  const note = s.notes[d.id] || '';
  const [noteText, setNoteText] = useState(note);
  const [showHist, setShowHist] = useState(false);
  const hist = s.noteHist[d.id] || [];

  useEffect(() => { setNoteText(s.notes[d.id] || ''); }, [d.id]); // eslint-disable-line

  const date = s.commitment ? ymdForDay(s.commitment.start_date, d.id) : null;
  const daysAway = date ? dayDiff(date, todayIso()) : 0;

  const flip = async (it, on) => {
    if (it.kind === 'extra') await s.setExtraDone(it.extraId, on);
    else await s.toggleProb(d.id, it.idx, on, { title: it.n });
    if (on) toast(`✓ <b>${it.n}</b> marked done.`);
  };

  const seal = async () => {
    try {
      await s.sealDay(d.id, !sealed);
      if (!sealed && items.length > 0 && !allDone) toast('Sealed with open questions — untick any question to un-seal.');
    } catch (e) { toast('⚠ ' + (e.message || 'cannot seal')); }
  };

  const saveNote = () => { if (noteText !== (s.notes[d.id] || '')) s.setNote(d.id, noteText); };

  return (
    <div className={`card spot today-main ${sealed ? 'is-sealed' : ''}`}>
      <div className="today-top">
        <span className="today-dayno">Day {d.id}</span>
        {d.sun ? <span className="chip chip-warn">Sunday · review</span> : <span className="chip">Practice day</span>}
        <span className="chip chip-neutral">Phase {ph.id}</span>
        <span className="today-unit">{d.unit} · {date ? pretty(date) : 'no anchor yet'}</span>
      </div>
      <div className="today-concept">{d.concept}</div>

      {locked && (
        <div className="locked-banner">
          🔒 This day unlocks on <b>{pretty(date)}</b> — {daysAway} day{daysAway === 1 ? '' : 's'} from now. The plan follows your permanent start date.
        </div>
      )}

      {items.length > 0 ? (
        <>
          <ul className="item-list">
            {items.map(it => (
              <li key={it.kind === 'extra' ? `x${it.extraId}` : it.idx} className={`pi ${it.done ? 'done' : ''} ${it.u ? 'link' : ''}`}>
                <button className="pi-ck" role="checkbox" aria-checked={it.done}
                  onClick={() => flip(it, !it.done)} title="Mark solved">✓</button>
                {it.u
                  ? <a className="pi-name" href={it.u} target="_blank" rel="noopener noreferrer">{it.n}</a>
                  : <span className="pi-name">{it.n}</span>}
                {it.pattern && (
                  <a className="chip pat-chip" title={`See “${it.pattern.name}” in Pattern Master`}
                    href={`/patterns#${it.pattern.id}`}>✦ {it.pattern.name}</a>
                )}
                {it.kind === 'extra'
                  ? <span className="judge j-user">＋ added</span>
                  : <span className={`judge ${JCLS[it.j] || 'j-drill'}`}>{it.j || 'drill'}</span>}
                {it.p && <span className="prem" title="Premium question">★</span>}
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--text-mute)' }}>
            {doneN}/{items.length} solved today
          </div>
        </>
      ) : (
        <p className="card-d" style={{ marginTop: 12 }}>
          No question set — {d.sun ? 'review, re-solve the week’s hardest, run a timed set.' : 'consolidation day: redo your hardest problems unaided.'} Seal it once done.
        </p>
      )}

      <div className="today-actions">
        <button className={`btn ${sealed ? 'btn-soft' : 'btn-primary'}`} disabled={locked} onClick={seal}>
          {sealed ? '✓ Day sealed' : 'Seal Day ' + d.id}
        </button>
        {sealed && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: '#34d399' }}>sealed — the chain grows</span>}
      </div>

      <textarea className="note-ta" value={noteText} onChange={e => setNoteText(e.target.value)} onBlur={saveNote}
        placeholder={`Pattern notes for Day ${d.id} — the one insight you want to keep…`} aria-label={`Pattern notes for day ${d.id}`} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => { setShowHist(!showHist); if (!showHist) s.loadNoteHistory(d.id); }}>
          {showHist ? 'Hide' : 'Show'} note timeline
        </button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-mute)' }}>auto-saves · edits are logged</span>
      </div>
      {showHist && (
        <div className="tl-list" style={{ marginTop: 10 }}>
          {hist.length === 0 && <div className="card-d" style={{ fontSize: 12 }}>No earlier versions yet.</div>}
          {hist.map((h, i) => (
            <div key={i} className="tl-item">
              <div className="tl-meta">{new Date(h.saved_at).toLocaleString()}</div>
              <div className="tl-body">{h.text || '(empty)'}</div>
            </div>
          ))}
        </div>
      )}

      <div className="day-nav">
        <button className="btn btn-ghost btn-sm" disabled={d.id === 1} onClick={() => setDay(d.id - 1)}>‹ Prev</button>
        <input className="jump-in" type="number" min="1" max={N} value={d.id} onChange={e => { const n = +e.target.value; if (n >= 1 && n <= N) setDay(n); }} aria-label="Go to day" />
        <button className="btn btn-ghost btn-sm" disabled={d.id === N} onClick={() => setDay(d.id + 1)}>Next ›</button>
        <span className="spacer" />
        <button className="btn btn-soft btn-sm" onClick={() => setDay(s.pointer)}>↺ Back to current day</button>
      </div>
    </div>
  );
}

const JCLS = { LC: 'j-lc', GFG: 'j-gfg', CSES: 'j-cses', CF: 'j-cf', SPOJ: 'j-spoj' };
