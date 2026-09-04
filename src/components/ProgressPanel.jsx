import { Link } from 'react-router-dom';
import { TRACKER_DATA } from '../lib/tracker-data';
import { prettyShort } from '../lib/utils';

const UNITS = TRACKER_DATA.units;
const DAYS = TRACKER_DATA.days;

export default function ProgressPanel({ s }) {
  const total = DAYS.filter(d => !s.excluded[d.id]).length || 1;
  const sealedN = DAYS.filter(d => !s.excluded[d.id] && s.sealed[d.id]).length;
  const pct = Math.round(100 * sealedN / total);

  const openUnit = ui => {
    const el = document.getElementById(`unit-${ui}`);
    if (el) { el.open = true; try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {} }
  };

  const later = s.extras.filter(e => e.status === 'later');
  const scheduled = s.extras.filter(e => e.status !== 'later');

  // removed items log (flat, for restore)
  const removed = [];
  for (const day of DAYS) {
    if (s.removed[day.id]) {
      day.items.forEach((it, i) => {
        if (s.removed[day.id][i]) removed.push({ day: day.id, idx: i, title: it.n });
      });
    }
  }

  return (
    <div>
      <div className="prog-grid">
        <div className="card metric"><div className="ml">Journey</div><div className="mv">{pct}<small>%</small></div></div>
        <div className="card metric"><div className="ml">Days sealed</div><div className="mv">{sealedN}<small>/{total}</small></div></div>
        <div className="card metric"><div className="ml">Questions solved</div><div className="mv">{s.solvedCount}</div></div>
        <div className="card metric"><div className="ml">Current streak</div><div className="mv">{s.streak}<small> d</small></div></div>
        <div className="card metric"><div className="ml">Best streak</div><div className="mv">{s.best}<small> d</small></div></div>
      </div>

      <div className="card">
        <div className="card-t">Weeks / topics — your plan</div>
        <p className="card-d" style={{ marginBottom: 8 }}>Only what you chose to learn. Click a week to open it in the plan.</p>
        <div className="unit-map">
          {UNITS.map((u, ui) => {
            const days = u.days.map(d => DAYS[d - 1]).filter(d => !s.excluded[d.id]);
            const n = days.filter(d => s.sealed[d.id]).length;
            const p = days.length ? Math.round(100 * n / days.length) : 0;
            return (
              <button key={ui} className="ub" onClick={() => openUnit(ui)} title={u.title}>
                <span className="ub-n">{n}/{days.length}</span>
                <div className="ub-t">{u.title}</div>
                <div className="ub-b"><i style={{ width: p + '%' }} /></div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-t">＋ Your extra questions</div>
        <p className="card-d" style={{ marginBottom: 8 }}>
          Questions you added yourself — saved for later or scheduled onto a day. Tagged separately from the original plan.
        </p>
        {s.extras.length === 0 && <div className="card-d">None yet — use ⌕ search to add any LeetCode number.</div>}
        {later.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div className="side-lbl">Saved for later</div>
            <ul className="item-list">
              {later.map(e => (
                <li key={e.id} className="pi">
                  <button className="pi-ck" onClick={() => s.setExtraDone(e.id, true)} title="Mark done">✓</button>
                  <span className="pi-name">{e.lc ? `#${e.lc} · ` : ''}{e.title}</span>
                  <span className="judge j-user">later</span>
                  <button className="rm" style={{ position: 'static', opacity: 1 }} onClick={() => s.removeExtra(e.id)}>✕</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {scheduled.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div className="side-lbl">Scheduled</div>
            <ul className="item-list">
              {scheduled.map(e => (
                <li key={e.id} className={`pi ${e.status === 'done' ? 'done' : ''}`}>
                  <button className="pi-ck" onClick={() => s.setExtraDone(e.id, e.status !== 'done')}>✓</button>
                  <span className="pi-name">{e.lc ? `#${e.lc} · ` : ''}{e.title}</span>
                  <span className="judge j-user">{e.target_day ? `Day ${e.target_day}` : '—'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-t">🗑 Removed questions (logged)</div>
        <p className="card-d" style={{ marginBottom: 8 }}>Everything you removed stays here, so you can add it back later.</p>
        {removed.length === 0 && <div className="card-d">Nothing removed.</div>}
        <div className="tbl-wrap" style={{ border: 'none' }}>
          {removed.length > 0 && (
            <table>
              <thead><tr><th>Question</th><th>Day</th><th></th></tr></thead>
              <tbody>
                {removed.map((r, i) => (
                  <tr key={i}>
                    <td>{r.title}</td>
                    <td className="cx">Day {r.day}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-soft btn-sm" onClick={() => s.restoreItem(r.day, r.idx)}>＋ restore</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-t">⚙ Data &amp; ledger</div>
        <div className="card-d" style={{ marginBottom: 10 }}>
          Every tick, seal, note and edit is appended to your personal, append-only ledger in Supabase — you cannot rewrite history.
          <Link to="/file" style={{ marginLeft: 6 }}>Open raw ledger /file →</Link>
        </div>
      </div>
    </div>
  );
}
