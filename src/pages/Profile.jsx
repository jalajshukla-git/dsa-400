import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTrackerData } from '../hooks/useTrackerData';
import { TRACKER_DATA } from '../lib/tracker-data';
import { LC_TITLES } from '../lib/tracker-data';
import Nav from '../components/Nav';
import CommitmentCard from '../components/CommitmentCard';
import { pretty, todayIso, dayDiff, lcURL } from '../lib/utils';
import { pickQuote } from '../lib/quotes';
import { toast } from '../lib/toast';

const UNITS = TRACKER_DATA.units;
const DAYS = TRACKER_DATA.days;
const N = DAYS.length;

const judgeFromUrl = u => {
  if (/leetcode\.com/i.test(u)) return { j: 'LC', label: 'LeetCode' };
  if (/codeforces\.com/i.test(u)) return { j: 'CF', label: 'Codeforces' };
  if (/geeksforgeeks\.org/i.test(u)) return { j: 'GFG', label: 'GFG' };
  if (/cses\.fi/i.test(u)) return { j: 'CSES', label: 'CSES' };
  if (/spoj\.com/i.test(u)) return { j: 'SPOJ', label: 'SPOJ' };
  if (/atcoder\.jp/i.test(u)) return { j: 'AC', label: 'AtCoder' };
  return { j: 'OTHER', label: 'Link' };
};
const JCLS = { LC: 'j-lc', GFG: 'j-gfg', CSES: 'j-cses', CF: 'j-cf', SPOJ: 'j-spoj', AC: 'j-user', OTHER: 'j-user', USER: 'j-user' };

export default function Profile() {
  const { user, configured } = useAuth();
  const s = useTrackerData();
  const [imp, setImp] = useState('');
  const [impDay, setImpDay] = useState('');
  const [busy, setBusy] = useState(false);
  const [quote] = useState(() => pickQuote());

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'you';
  const email = user?.email || '';

  const stats = useMemo(() => {
    const start = s.commitment?.start_date;
    const activeDays = DAYS.filter(d => !s.excluded[d.id]).length || 1;
    const sealed = DAYS.filter(d => !s.excluded[d.id] && s.sealed[d.id]).length;
    const pct = Math.round(100 * sealed / activeDays);
    const daysElapsed = start ? Math.max(1, Math.min(400, dayDiff(todayIso(), start) + 1)) : 1;
    const expected = Math.round(activeDays * daysElapsed / 400);
    const ahead = sealed - expected;
    const remaining = activeDays - sealed;
    const perDay = sealed / daysElapsed;
    const etaDays = perDay > 0 ? Math.ceil(remaining / perDay) : null;
    return { activeDays, sealed, pct, daysElapsed, ahead, remaining, etaDays };
  }, [s]);

  if (!s.ready) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-mute)' }}>LOADING…</div>;

  const progress = { sealed: stats.sealed, activeDays: stats.activeDays, streak: s.streak, best: s.best, solved: s.solvedCount };
  const later = s.extras.filter(e => e.status === 'later');
  const scheduled = s.extras.filter(e => e.status === 'scheduled');
  const doneExtras = s.extras.filter(e => e.status === 'done');

  const doImport = async () => {
    const tokens = imp.split(/[\n,;]+/).map(t => t.trim()).filter(Boolean);
    if (!tokens.length) return;
    setBusy(true);
    let added = 0;
    for (const tok of tokens) {
      try {
        if (/^\d+$/.test(tok)) {
          const known = LC_TITLES.find(x => String(x.n) === tok);
          await s.addExtra({ lc: tok, title: known ? known.t : `LeetCode ${tok}`, url: known ? lcURL(tok, known.t) : `https://leetcode.com/problems/`, platform: 'LC', targetDay: impDay ? +impDay : null });
        } else if (/^https?:\/\//i.test(tok)) {
          const j = judgeFromUrl(tok);
          await s.addExtra({ lc: null, title: `Imported · ${j.label}`, url: tok, platform: j.j, targetDay: impDay ? +impDay : null });
        } else {
          await s.addExtra({ lc: null, title: tok, url: null, platform: 'OTHER', targetDay: impDay ? +impDay : null });
        }
        added++;
      } catch {}
    }
    setBusy(false);
    setImp('');
    toast(`<b>${added} question${added === 1 ? '' : 's'} added</b>${impDay ? ` to Day ${impDay}` : ' to your queue'} — it's now part of your plan.`);
  };

  const removed = [];
  for (const day of DAYS) {
    if (s.removed[day.id]) day.items.forEach((it, i) => { if (s.removed[day.id][i]) removed.push({ day: day.id, idx: i, title: it.n }); });
  }

  return (
    <>
      <Nav />
      <div id="bg" aria-hidden="true"><div className="orb orb-1" /><div className="orb orb-2" /><div id="bg-grid" /><div id="bg-vig" /></div>

      <div className="wrap sec">
        {/* ── identity hero ── */}
        <div className="card profile-hero">
          <div className="profile-id">
            <div className="avatar">{(username[0] || 'D').toUpperCase()}</div>
            <div>
              <div className="profile-name">{username}</div>
              <div className="profile-sub">{email || '—'}</div>
              <div className="profile-cid">{s.commitment?.commit_id || 'no commitment yet'}</div>
            </div>
          </div>
          <div className="profile-meta">
            <div className="pm-date"><span className="cert-l">Start</span><span className="pm-v">{s.commitment ? pretty(s.commitment.start_date) : '—'}</span></div>
            <div className="pm-date"><span className="cert-l">End</span><span className="pm-v">{s.commitment ? pretty(s.commitment.end_date) : '—'}</span></div>
            <div className="pm-date"><span className="cert-l">Days left</span><span className="pm-v">{stats.remaining}</span></div>
          </div>
        </div>

        {/* ── certificate ── */}
        {s.commitment
          ? <div style={{ marginTop: 16 }}><CommitmentCard commitment={s.commitment} username={username} progress={progress} /></div>
          : <div className="card" style={{ marginTop: 16, textAlign: 'center', padding: 26 }}>
              <p className="card-d">No commitment yet — finish onboarding first.</p>
              <Link className="btn btn-primary" to="/onboarding">Start onboarding →</Link>
            </div>}

        {/* ── stats + analysis ── */}
        <div className="prog-grid" style={{ marginTop: 20 }}>
          <div className="card metric"><div className="ml">Journey</div><div className="mv">{stats.pct}<small>%</small></div></div>
          <div className="card metric"><div className="ml">Days sealed</div><div className="mv">{stats.sealed}<small>/{stats.activeDays}</small></div></div>
          <div className="card metric"><div className="ml">Questions solved</div><div className="mv">{s.solvedCount}</div></div>
          <div className="card metric"><div className="ml">Streak</div><div className="mv">{s.streak}<small> d</small></div></div>
          <div className="card metric"><div className="ml">Best</div><div className="mv">{s.best}<small> d</small></div></div>
        </div>

        <div className="card analysis">
          <div className="card-t">Your trajectory</div>
          <p className="card-d">
            You are <b style={{ color: stats.ahead >= 0 ? 'var(--ok)' : 'var(--warn)' }}>
            {stats.ahead >= 0 ? `${stats.ahead} day${stats.ahead === 1 ? '' : 's'} ahead` : `${-stats.ahead} day${stats.ahead === -1 ? '' : 's'} behind`}</b> of your
            plan. {stats.etaDays != null
              ? <>At your current pace you finish in <b>{stats.etaDays} days</b>.</>
              : <>Seal your first day and I'll project your finish date.</>}
          </p>
          <div className="quote-line">“{quote}”</div>
        </div>

        {/* ── import & schedule ── */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-t">＋ Import questions into your plan</div>
          <p className="card-d" style={{ marginBottom: 10 }}>
            Paste LeetCode numbers (e.g. <code>76</code>, <code>560</code>) or links from any platform — LeetCode, Codeforces, GFG, CSES, SPOJ, AtCoder. They merge into the day you choose (or save for later).
          </p>
          <textarea className="note-ta" style={{ minHeight: 70 }} placeholder={'e.g.\n76\nhttps://codeforces.com/problemset/problem/4/A\nTwo Sum IV (BST)'} value={imp} onChange={e => setImp(e.target.value)} />
          <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="cert-l">Schedule on day (blank = later)</label>
            <input type="number" min="1" max="400" className="jump-in" value={impDay} onChange={e => setImpDay(e.target.value)} placeholder="day" />
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={doImport}>Import &amp; schedule</button>
          </div>
        </div>

        {/* ── extras manager ── */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-t">Your imported questions ({s.extras.length})</div>
          {s.extras.length === 0 && <p className="card-d">None yet — import some above.</p>}
          <div className="tbl-wrap" style={{ border: 'none', marginTop: 8 }}>
            {s.extras.length > 0 && (
              <table>
                <thead><tr><th>Question</th><th>Platform</th><th>Schedule</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {[...scheduled, ...later, ...doneExtras].map(e => (
                    <tr key={e.id}>
                      <td>
                        {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer">{e.title}</a> : e.title}
                        {e.lc ? <span className="lc-id" style={{ marginLeft: 6 }}>#{e.lc}</span> : null}
                      </td>
                      <td><span className={`judge ${JCLS[e.platform] || 'j-user'}`}>{e.platform || 'OTHER'}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <input type="number" min="1" max="400" className="jump-in" style={{ width: 64 }}
                          defaultValue={e.target_day || ''} placeholder="—"
                          onBlur={ev => { const v = ev.target.value; if (v) s.scheduleExtra(e.id, +v); }} />
                      </td>
                      <td>
                        <span className={`chip ${e.status === 'done' ? 'chip-ok' : e.status === 'scheduled' ? '' : 'chip-neutral'}`}>
                          {e.status === 'done' ? 'done' : e.status === 'scheduled' ? `Day ${e.target_day}` : 'later'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button className="btn btn-soft btn-sm" onClick={() => s.setExtraDone(e.id, e.status !== 'done')}>{e.status === 'done' ? 'undo' : 'done'}</button>{' '}
                        <button className="btn btn-ghost btn-sm" onClick={() => { s.scheduleExtra(e.id, null); toast('Moved to “save for later”.'); }}>later</button>{' '}
                        <button className="btn btn-ghost btn-sm" onClick={() => s.removeExtra(e.id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── topics manager ── */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-t">Manage your topics</div>
          <p className="card-d" style={{ marginBottom: 8 }}>Toggle any week on or off — your plan reshapes instantly. Days stay logged either way.</p>
          <div className="topic-list" style={{ maxHeight: 'none' }}>
            {UNITS.map((u, i) => {
              const days = u.days.map(d => DAYS[d - 1]);
              const on = days.some(d => !s.excluded[d.id]);
              const sealed = days.filter(d => s.sealed[d.id]).length;
              return (
                <label key={i} className={`topic-tog ${on ? 'on' : ''}`}>
                  <input type="checkbox" checked={on} onChange={() => s.setUnitIncluded(i, !on)} />
                  <span>{u.title}</span>
                  <span className="t-days">{sealed}/{days.length} · D{u.days[0]}–{u.days[u.days.length - 1]}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* ── removed log ── */}
        <div className="card" style={{ marginTop: 14 }}>
          <div className="card-t">🗑 Removed questions (logged)</div>
          {removed.length === 0 && <p className="card-d">Nothing removed.</p>}
          {removed.length > 0 && (
            <div className="tbl-wrap" style={{ border: 'none', marginTop: 8 }}>
              <table>
                <thead><tr><th>Question</th><th>Day</th><th></th></tr></thead>
                <tbody>
                  {removed.map((r, i) => (
                    <tr key={i}><td>{r.title}</td><td className="cx">Day {r.day}</td>
                      <td style={{ textAlign: 'right' }}><button className="btn btn-soft btn-sm" onClick={() => s.restoreItem(r.day, r.idx)}>＋ restore</button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
