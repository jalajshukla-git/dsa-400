import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TRACKER_DATA } from '../lib/tracker-data';

const UNITS = TRACKER_DATA.units;
const DAYS = TRACKER_DATA.days;
const byDay = id => DAYS[id - 1];
const JCLS = { LC: 'j-lc', GFG: 'j-gfg', CSES: 'j-cses', CF: 'j-cf', SPOJ: 'j-spoj' };

export default function Questions() {
  const [f, setF] = useState({ q: '', judge: 'all' });

  const total = useMemo(() => DAYS.reduce((a, d) => a + d.items.length, 0), []);

  const matchDay = d => {
    if (f.judge !== 'all' && !d.items.some(i => i.j === f.judge)) return false;
    if (f.q) {
      const hay = (d.concept + ' ' + d.unit + ' day ' + d.id + ' ' + d.items.map(i => i.n).join(' ')).toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    return true;
  };

  return (
    <>
      <div id="bg" aria-hidden="true"><div className="orb orb-1" /><div className="orb orb-2" /><div id="bg-grid" /><div id="bg-vig" /></div>
      <header id="nav">
        <div className="nav-in">
          <div className="brand" onClick={() => { window.location.href = '/'; }}><span className="brand-mark">◈</span><span className="brand-name">DSA·400</span></div>
          <div className="nav-links" style={{ display: 'flex' }}>
            <button className="nav-link" onClick={() => { window.location.href = '/'; }}>Tracker</button>
            <button className="nav-link" onClick={() => { window.location.href = '/patterns'; }}>Pattern Master</button>
          </div>
          <div className="nav-right">
            <Link className="btn btn-ghost btn-sm" to="/login">Sign in</Link>
            <Link className="btn btn-primary btn-sm" to="/register">Get started</Link>
          </div>
        </div>
      </header>

      <div className="wrap sec">
        <div className="sec-head">
          <span className="sec-num">The 400-day plan</span>
          <h2>Every question, all {total} of them</h2>
          <p className="sub">
            Browse the full plan — all 55 weeks and every question with its judge link — before you choose your path.
            Pick the weeks you want during onboarding, and customise the rest anytime from your profile.
          </p>
        </div>

        <div className="card plan-tools">
          <input className="search-in" placeholder="Search 400 days — topic or question name…" value={f.q}
            onChange={e => setF({ ...f, q: e.target.value.trim().toLowerCase() })} />
          <div className="row" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[['all', 'All'], ['LC', 'LeetCode'], ['GFG', 'GFG'], ['CSES', 'CSES'], ['CF', 'Codeforces'], ['SPOJ', 'SPOJ']].map(([k, label]) => (
              <button key={k} className={`chip ${f.judge === k ? 'on' : ''}`} onClick={() => setF({ ...f, judge: k })}>{label}</button>
            ))}
          </div>
        </div>

        {UNITS.map((u, ui) => {
          const days = u.days.map(byDay);
          const shown = days.filter(matchDay);
          if (!shown.length) return null;
          return (
            <details className="unit" key={ui} open={ui === 0}>
              <summary className="unit-sum">
                <span className="u-caret">▶</span>
                <span><span className="u-title">{u.title}</span><br />
                  <span className="u-range">Days {u.days[0]}–{u.days[u.days.length - 1]}</span></span>
                <span className="u-meta"><span className="u-count">{days.reduce((a, d) => a + d.items.length, 0)} questions</span></span>
              </summary>
              <div className="u-days">
                {shown.map(d => (
                  <article key={d.id} className={`day ${d.sun ? 'sun' : ''}`}>
                    <div className="day-top"><span className="day-no">Day {d.id}</span>{d.sun && <span className="chip chip-warn">Sun</span>}</div>
                    <div className="day-concept">{d.concept}</div>
                    {d.items.length ? (
                      <ul className="day-items">
                        {d.items.map((it, i) => (
                          <li key={i} className="pi">
                            <span className="pi-name">{it.u ? <a href={it.u} target="_blank" rel="noopener noreferrer">{it.n}</a> : it.n}</span>
                            {it.p && <span className="prem" title="Premium">★</span>}
                            <span className={`judge ${JCLS[it.j] || 'j-drill'}`}>{it.j || 'drill'}</span>
                          </li>
                        ))}
                      </ul>
                    ) : <div className="card-d" style={{ fontSize: 11.8 }}>Consolidation / review day.</div>}
                  </article>
                ))}
              </div>
            </details>
          );
        })}

        <div className="card" style={{ marginTop: 20, textAlign: 'center', padding: 26 }}>
          <div className="card-t">Ready to make this plan yours?</div>
          <p className="card-d" style={{ marginBottom: 14 }}>Register, pick your start date, write your commitment, and choose exactly which weeks you'll conquer.</p>
          <div className="cta-row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary btn-lg" to="/register">Start your 400 days →</Link>
          </div>
        </div>
      </div>
    </>
  );
}
